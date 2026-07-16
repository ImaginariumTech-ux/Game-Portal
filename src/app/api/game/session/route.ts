import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { signSessionToken, verifySessionToken } from '@/lib/session';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * API Endpoint: POST /api/game/session
 * Description: Creates a new single-player game session and returns the signed JWT session token.
 * Auth: Required
 */
export async function POST(req: Request) {
  try {
    let userId: string | null = null;

    // 1. Try standard Supabase Cookie/Session Authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    }

    // 2. Fallback to JWT Token Authentication (from query params or Authorization header)
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      let token = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        try {
          // Parse JSON body to get token if present
          const cloneReq = req.clone();
          const bodyJson = await cloneReq.json();
          token = bodyJson.sessionToken || '';
        } catch {
          // Ignore parse errors
        }
      }

      if (token) {
        const decoded = verifySessionToken(token);
        if (decoded) {
          userId = decoded.user_id;
        }
      }
    }

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const { gameId, mode, tournamentId } = body;

    if (!gameId || !mode) {
      return jsonResponse({ error: 'Missing gameId or mode' }, 400);
    }

    if (mode === 'tournament' && !tournamentId) {
      return jsonResponse({ error: 'Missing tournamentId for tournament mode' }, 400);
    }

    // If tournament mode, verify tournament is active
    if (mode === 'tournament') {
      const { data: tournament, error: tourError } = await supabaseAdmin
        .from('tournaments')
        .select('status, start_at, end_at')
        .eq('id', tournamentId)
        .single();

      if (tourError || !tournament) {
        return jsonResponse({ error: 'Tournament not found' }, 404);
      }

      // Check current time against tournament schedule dynamically
      const now = new Date();
      const start = new Date(tournament.start_at);
      const end = new Date(tournament.end_at);

      if (now < start) {
        return jsonResponse({ error: 'This tournament has not started yet.' }, 400);
      }
      if (now >= end) {
        return jsonResponse({ error: 'This tournament has already ended.' }, 400);
      }
    }

    // Generate a temporary UUID for the session
    const sessionId = crypto.randomUUID();

    // Sign the token using JWT utility
    const sessionToken = signSessionToken({
      user_id: userId,
      game_id: gameId,
      session_id: sessionId
    });

    // Create session record in game_sessions using admin client to bypass RLS
    const { data: session, error: insertError } = await supabaseAdmin
      .from('game_sessions')
      .insert({
        id: sessionId,
        game_id: gameId,
        user_id: userId,
        mode,
        tournament_id: mode === 'tournament' ? tournamentId : null,
        session_token: sessionToken,
        status: 'in_progress'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting game session:', insertError);
      return jsonResponse({ error: 'Failed to create game session' }, 500);
    }

    // Try incrementing game plays count if the RPC exists
    try {
      await supabaseAdmin.rpc('increment_game_plays', { p_game_id: gameId });
    } catch (rpcErr) {
      console.warn('RPC increment_game_plays might not exist, skipping:', rpcErr);
    }

    return jsonResponse({
      success: true,
      sessionId: session.id,
      sessionToken: session.session_token
    });

  } catch (err: any) {
    console.error('Error in session creation API:', err);
    return jsonResponse({ error: 'Internal server error', message: err.message }, 500);
  }
}

/**
 * API Endpoint: GET /api/game/session
 * Description: Creates a new single-player game session via GET query params.
 * Auth: Required
 */
export async function GET(req: Request) {
  try {
    let userId: string | null = null;

    // 1. Try standard Supabase Cookie/Session Authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    }

    // 2. Fallback to JWT Token Authentication (from query params or Authorization header)
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      let token = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        const { searchParams } = new URL(req.url);
        token = searchParams.get('sessionToken') || '';
      }

      if (token) {
        const decoded = verifySessionToken(token);
        if (decoded) {
          userId = decoded.user_id;
        }
      }
    }

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    const mode = searchParams.get('mode');
    const tournamentId = searchParams.get('tournamentId');

    if (!gameId || !mode) {
      return jsonResponse({ error: 'Missing gameId or mode' }, 400);
    }

    if (mode === 'tournament' && !tournamentId) {
      return jsonResponse({ error: 'Missing tournamentId for tournament mode' }, 400);
    }

    // If tournament mode, verify tournament is active
    if (mode === 'tournament') {
      const { data: tournament, error: tourError } = await supabaseAdmin
        .from('tournaments')
        .select('status, start_at, end_at')
        .eq('id', tournamentId)
        .single();

      if (tourError || !tournament) {
        return jsonResponse({ error: 'Tournament not found' }, 404);
      }

      // Check current time against tournament schedule dynamically
      const now = new Date();
      const start = new Date(tournament.start_at);
      const end = new Date(tournament.end_at);

      if (now < start) {
        return jsonResponse({ error: 'This tournament has not started yet.' }, 400);
      }
      if (now >= end) {
        return jsonResponse({ error: 'This tournament has already ended.' }, 400);
      }
    }

    // Generate a temporary UUID for the session
    const sessionId = crypto.randomUUID();

    // Sign the token using JWT utility
    const sessionToken = signSessionToken({
      user_id: userId,
      game_id: gameId,
      session_id: sessionId
    });

    // Create session record in game_sessions using admin client to bypass RLS
    const { data: session, error: insertError } = await supabaseAdmin
      .from('game_sessions')
      .insert({
        id: sessionId,
        game_id: gameId,
        user_id: userId,
        mode,
        tournament_id: mode === 'tournament' ? tournamentId : null,
        session_token: sessionToken,
        status: 'in_progress'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting game session:', insertError);
      return jsonResponse({ error: 'Failed to create game session' }, 500);
    }

    // Try incrementing game plays count if the RPC exists
    try {
      await supabaseAdmin.rpc('increment_game_plays', { p_game_id: gameId });
    } catch (rpcErr) {
      console.warn('RPC increment_game_plays might not exist, skipping:', rpcErr);
    }

    return jsonResponse({
      success: true,
      sessionId: session.id,
      sessionToken: session.session_token
    });

  } catch (err: any) {
    console.error('Error in GET session creation API:', err);
    return jsonResponse({ error: 'Internal server error', message: err.message }, 500);
  }
}
