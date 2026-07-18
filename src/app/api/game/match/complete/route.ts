import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function logIntegrationEvent(
  gameId: string | null,
  endpoint: 'init' | 'match_complete',
  statusCode: number,
  payload: any,
  errorMessage: string | null = null,
  signatureValid: boolean | null = null
) {
  try {
    await supabaseAdmin
      .from('integration_logs')
      .insert({
        game_id: gameId,
        endpoint,
        status_code: statusCode,
        payload,
        error_message: errorMessage,
        signature_valid: signatureValid
      });
  } catch (err) {
    console.error('Failed to write integration log:', err);
  }
}

async function updateLastEventReceived(gameId: string) {
  try {
    await supabaseAdmin
      .from('games')
      .update({ last_event_received_at: new Date().toISOString() })
      .eq('id', gameId);
  } catch (err) {
    console.error('Failed to update last_event_received_at:', err);
  }
}

async function incrementCompletedSessions(gameId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('total_sessions_completed')
      .eq('id', gameId)
      .single();
    if (data) {
      const newCount = (data.total_sessions_completed || 0) + 1;
      await supabaseAdmin
        .from('games')
        .update({ total_sessions_completed: newCount })
        .eq('id', gameId);
    }
  } catch (err) {
    console.error('Error incrementing sessions count:', err);
  }
}

async function checkAndPromoteGameStatus(gameId: string, currentStatus: string) {
  if (currentStatus === 'testing') {
    try {
      await supabaseAdmin
        .from('games')
        .update({ integration_status: 'live' })
        .eq('id', gameId);
      console.log(`Game ${gameId} successfully promoted from testing to live!`);
    } catch (err) {
      console.error('Failed to auto-promote game status to live:', err);
    }
  }
}

/**
 * API Endpoint: POST /api/game/match/complete
 * Description: Called by game servers to finalize a single-player match session.
 * Body: { sessionId: string, score: number }
 * Headers: X-Portal-Signature (HMAC-SHA256 of raw request body signed with game's webhook_secret)
 */
export async function POST(req: Request) {
  let gameId: string | null = null;
  let statusCode = 200;
  let errorMessage: string | null = null;
  let signatureValid: boolean | null = null;
  let logPayload: any = null;

  try {
    // 1. OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Portal-Signature',
        },
      });
    }

    const bodyText = await req.text();
    logPayload = bodyText; // Fallback to raw text if JSON parse fails
    let body: any;
    try {
      body = JSON.parse(bodyText);
      logPayload = body;
    } catch {
      statusCode = 400;
      errorMessage = 'Invalid JSON body';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const { sessionId, score } = body;

    if (!sessionId || score === undefined) {
      statusCode = 400;
      errorMessage = 'Missing sessionId or score';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    // 2. Fetch Session and Game Webhook Secret
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id, status, score, is_personal_best, best_score, game_id,
        game:games(id, webhook_secret, integration_status)
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr) {
      statusCode = 500;
      errorMessage = sessionErr.message;
      return NextResponse.json({ error: 'Database error', details: errorMessage }, { status: statusCode });
    }

    if (!session) {
      statusCode = 404;
      errorMessage = 'Session not found';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    gameId = session.game_id;
    const game = Array.isArray(session.game) ? session.game[0] : session.game;
    const webhookSecret = (game as any)?.webhook_secret;
    const currentStatus = (game as any)?.integration_status || 'pending';

    if (!webhookSecret) {
      statusCode = 500;
      errorMessage = 'Game webhook secret is not configured';
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    // 3. Verify Signature (HMAC-SHA256)
    const signature = req.headers.get('x-portal-signature') || req.headers.get('X-Portal-Signature');
    if (!signature) {
      statusCode = 401;
      errorMessage = 'Missing X-Portal-Signature header';
      signatureValid = false;
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('hex');

    if (signature !== expectedSignature) {
      statusCode = 401;
      errorMessage = 'Invalid signature';
      signatureValid = false;
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    signatureValid = true;

    // 4. Idempotency Guard: if already completed, return existing results
    if (session.status === 'completed') {
      // Still update activity time and promote if testing
      if (gameId) {
        await updateLastEventReceived(gameId);
        await checkAndPromoteGameStatus(gameId, currentStatus);
      }
      return NextResponse.json({
        success: true,
        message: 'Session already completed (idempotent)',
        score: session.score,
        is_personal_best: session.is_personal_best ?? false,
        best_score: session.best_score ?? session.score
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 5. Invoke Database RPC to update score and leaderboard
    const { data: scoreData, error: rpcErr } = await supabaseAdmin.rpc('upsert_tournament_score', {
      p_session_id: sessionId,
      p_score: Number(score)
    });

    if (rpcErr) {
      statusCode = 500;
      errorMessage = rpcErr.message;
      console.error('Error invoking upsert_tournament_score:', rpcErr);
      return NextResponse.json({ error: 'Failed to update score', details: rpcErr.message }, { status: statusCode });
    }

    const resultRecord = (scoreData && scoreData.length > 0) ? scoreData[0] : null;
    const isPersonalBest = resultRecord ? resultRecord.is_personal_best : false;
    const bestScore = resultRecord ? resultRecord.best_score : Number(score);

    // Update active game counts on first success
    if (gameId) {
      await incrementCompletedSessions(gameId);
      await updateLastEventReceived(gameId);
      await checkAndPromoteGameStatus(gameId, currentStatus);
    }

    return NextResponse.json({
      success: true,
      message: 'Score submitted successfully',
      is_personal_best: isPersonalBest,
      best_score: bestScore
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err: any) {
    statusCode = 500;
    errorMessage = err.message;
    console.error('Fatal error in match/complete:', err);
    return NextResponse.json({
      error: 'Internal server error',
      message: errorMessage
    }, { status: statusCode });
  } finally {
    if (req.method !== 'OPTIONS') {
      await logIntegrationEvent(gameId, 'match_complete', statusCode, logPayload, errorMessage, signatureValid);
    }
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Portal-Signature',
    },
  });
}
