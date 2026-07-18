import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

async function processInit(sessionId: string | null) {
  let gameId: string | null = null;
  let responseData: any = null;
  let statusCode = 200;
  let errorMessage: string | null = null;

  try {
    if (!sessionId) {
      statusCode = 400;
      responseData = { error: 'Session ID is required' };
      errorMessage = 'Session ID is required';
      return NextResponse.json(responseData, { status: statusCode });
    }

    // 1. Fetch Game Session Data (include game_id)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id, game_id, mode, status,
        game:games(title, slug),
        user:profiles(id, full_name, username, avatar_url)
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      statusCode = 500;
      responseData = { error: 'Database error fetching session', details: sessionError.message };
      errorMessage = sessionError.message;
      return NextResponse.json(responseData, { status: statusCode });
    }

    if (!session) {
      statusCode = 404;
      responseData = { error: 'Session not found' };
      errorMessage = 'Session not found';
      return NextResponse.json(responseData, { status: statusCode });
    }

    gameId = session.game_id;
    const user = Array.isArray(session.user) ? session.user[0] : session.user;
    const game = Array.isArray(session.game) ? session.game[0] : session.game;

    responseData = {
      success: true,
      session: {
        id: session.id,
        mode: session.mode,
        status: session.status,
        game_title: (game as any)?.title || 'Unknown Game',
        game_slug: (game as any)?.slug
      },
      player: {
        id: (user as any)?.id,
        name: (user as any)?.full_name || 'Anonymous User',
        username: (user as any)?.username,
        avatar: (user as any)?.avatar_url
      }
    };

    // Update last_event_received_at on success
    if (gameId) {
      await updateLastEventReceived(gameId);
    }

    return NextResponse.json(responseData, {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (err: any) {
    statusCode = 500;
    responseData = { error: 'Internal server error', message: err.message };
    errorMessage = err.message;
    return NextResponse.json(responseData, { status: statusCode });
  } finally {
    // Log call to integration_logs (success or failure)
    const logPayload = { sessionId };
    await logIntegrationEvent(gameId, 'init', statusCode, logPayload, errorMessage);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    return await processInit(sessionId);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let sessionId: string | null = null;
    try {
      const body = await req.json();
      sessionId = body?.sessionId || null;
    } catch {
      // Fallback to query params if JSON parsing fails
      const { searchParams } = new URL(req.url);
      sessionId = searchParams.get('sessionId');
    }
    return await processInit(sessionId);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
