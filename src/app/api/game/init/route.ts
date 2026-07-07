import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API Endpoint: GET /api/game/init
 * Description: Called by the game engine to retrieve single-player session and player data.
 * Query Params: sessionId (maps to game_sessions.id)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 1. Fetch Game Session Data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('game_sessions')
      .select(`
        id, mode, status,
        game:games(title, slug),
        user:profiles(id, full_name, username, avatar_url)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2. Format Response
    const user = Array.isArray(session.user) ? session.user[0] : session.user;
    const game = Array.isArray(session.game) ? session.game[0] : session.game;

    return NextResponse.json({
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
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
