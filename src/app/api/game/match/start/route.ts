import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API Endpoint: POST /api/game/match/start
 * Description: Validates balances, deducts stakes, and moves room to 'live' status.
 */
export async function POST(req: Request) {
  try {
    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    console.log(`Starting match for room ${roomId}...`);

    // Call the Start Match RPC
    const { data, error } = await supabaseAdmin.rpc('start_game_match', {
      p_room_id: roomId
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({ 
        success: false, 
        error: data.error,
        players: data.players // List of players with insufficient funds
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Match started, stakes deducted',
      data
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}
