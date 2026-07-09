import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { signSessionToken } from '@/lib/session';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API Endpoint: POST /api/game/session
 * Description: Creates a new single-player game session and returns the signed JWT session token.
 * Auth: Required
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, mode, tournamentId } = body;

    if (!gameId || !mode) {
      return NextResponse.json({ error: 'Missing gameId or mode' }, { status: 400 });
    }

    if (mode === 'tournament' && !tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId for tournament mode' }, { status: 400 });
    }

    // If tournament mode, verify tournament is active
    if (mode === 'tournament') {
      const { data: tournament, error: tourError } = await supabaseAdmin
        .from('tournaments')
        .select('status, start_at, end_at')
        .eq('id', tournamentId)
        .single();

      if (tourError || !tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
      }

      // Check current time against tournament schedule dynamically
      const now = new Date();
      const start = new Date(tournament.start_at);
      const end = new Date(tournament.end_at);

      if (now < start) {
        return NextResponse.json({ error: 'This tournament has not started yet.' }, { status: 400 });
      }
      if (now >= end) {
        return NextResponse.json({ error: 'This tournament has already ended.' }, { status: 400 });
      }
    }

    // Generate a temporary UUID for the session
    const sessionId = crypto.randomUUID();

    // Sign the token using JWT utility
    const sessionToken = signSessionToken({
      user_id: user.id,
      game_id: gameId,
      session_id: sessionId
    });

    // Create session record in game_sessions using admin client to bypass RLS
    const { data: session, error: insertError } = await supabaseAdmin
      .from('game_sessions')
      .insert({
        id: sessionId,
        game_id: gameId,
        user_id: user.id,
        mode,
        tournament_id: mode === 'tournament' ? tournamentId : null,
        session_token: sessionToken,
        status: 'in_progress'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting game session:', insertError);
      return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
    }

    // Try incrementing game plays count if the RPC exists
    try {
      await supabaseAdmin.rpc('increment_game_plays', { p_game_id: gameId });
    } catch (rpcErr) {
      console.warn('RPC increment_game_plays might not exist, skipping:', rpcErr);
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionToken: session.session_token
    });

  } catch (err: any) {
    console.error('Error in session creation API:', err);
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}
