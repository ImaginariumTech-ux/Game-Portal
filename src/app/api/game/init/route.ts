import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API Endpoint: GET /api/game/init
 * Description: Called by the game engine to retrieve room and player data.
 * Query Params: roomId
 */
export async function GET(req: Request) {
  try {
    // Handle OPTIONS for CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // 1. Fetch Room Data
    const { data: room, error: roomError } = await supabaseAdmin
      .from('game_rooms')
      .select(`
        id, name, stake_amount, payout_type, payout_config, status,
        game:games(title, slug, config_schema)
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 2. Fetch Joined Players
    const { data: players, error: playersError } = await supabaseAdmin
      .from('room_players')
      .select(`
        user_id,
        profile:profiles(id, full_name, username, avatar_url)
      `)
      .eq('room_id', roomId)
      .eq('status', 'joined');

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    // 3. Format Response
    const formattedPlayers = (players || []).map(p => {
      const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;
      return {
        id: p.user_id,
        name: (profile as any)?.full_name || 'Anonymous',
        username: (profile as any)?.username,
        avatar: (profile as any)?.avatar_url
      };
    });

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        game_title: Array.isArray(room.game) ? room.game[0]?.title : (room.game as any)?.title,
        stake_amount: room.stake_amount,
        payout_type: room.payout_type,
        payout_config: room.payout_config,
        status: room.status
      },
      players: formattedPlayers
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}
