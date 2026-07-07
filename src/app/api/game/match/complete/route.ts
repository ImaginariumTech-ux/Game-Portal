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

/**
 * API Endpoint: POST /api/game/match/complete
 * Description: Called by game servers to finalize a single-player match session.
 * Body: { sessionId: string, score: number }
 * Headers: X-Portal-Signature (HMAC-SHA256 of raw request body signed with game's webhook_secret)
 */
export async function POST(req: Request) {
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
    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { sessionId, score } = body;

    if (!sessionId || score === undefined) {
      return NextResponse.json({ error: 'Missing sessionId or score' }, { status: 400 });
    }

    // 2. Fetch Session and Game Webhook Secret
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id, status, score, is_personal_best, best_score,
        game:games(webhook_secret)
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 3. Idempotency Guard: if already completed, return existing results
    if (session.status === 'completed') {
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

    const game = Array.isArray(session.game) ? session.game[0] : session.game;
    const webhookSecret = (game as any)?.webhook_secret;

    if (!webhookSecret) {
      return NextResponse.json({ error: 'Game webhook secret is not configured' }, { status: 500 });
    }

    // 4. Verify Signature (HMAC-SHA256)
    const signature = req.headers.get('x-portal-signature') || req.headers.get('X-Portal-Signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing X-Portal-Signature header' }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 5. Invoke Database RPC to update score and leaderboard
    const { data: scoreData, error: rpcErr } = await supabaseAdmin.rpc('upsert_tournament_score', {
      p_session_id: sessionId,
      p_score: Number(score)
    });

    if (rpcErr) {
      console.error('Error invoking upsert_tournament_score:', rpcErr);
      return NextResponse.json({ error: 'Failed to update score', details: rpcErr.message }, { status: 500 });
    }

    const resultRecord = (scoreData && scoreData.length > 0) ? scoreData[0] : null;
    const isPersonalBest = resultRecord ? resultRecord.is_personal_best : false;
    const bestScore = resultRecord ? resultRecord.best_score : Number(score);

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
    console.error('Fatal error in match/complete:', err);
    return NextResponse.json({
      error: 'Internal server error',
      message: err.message
    }, { status: 500 });
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
