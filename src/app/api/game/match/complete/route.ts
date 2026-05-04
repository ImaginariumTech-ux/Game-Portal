import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with Service Role Key for internal administrative tasks
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
 * Description: Finalizes a match, updates rankings, and processes coin payouts.
 * Body: { roomId: string, results: Array<{ userId: string, rank: number, score: number }> }
 */
export async function POST(req: Request) {
  try {
    // Handle OPTIONS for CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const body = await req.json();
    const { roomId, results } = body;

    // 1. Basic Validation
    if (!roomId || !results || !Array.isArray(results)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // TODO: Add Signature/Secret Verification here to ensure the request comes from a trusted game server
    // const authHeader = req.headers.get('Authorization');
    // if (authHeader !== `Bearer ${process.env.GAME_API_SECRET}`) { ... }

    console.log(`Processing match completion for room ${roomId}...`);

    // 2. Call the Atomic Payout RPC function
    const { data, error } = await supabaseAdmin.rpc('process_game_payout', {
      p_room_id: roomId,
      p_results: results
    });

    if (error) {
      console.error('RPC Error processing payout:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error.details 
      }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({ 
        success: false, 
        error: data.error 
      }, { status: 400 });
    }

    // 3. Log success and return data
    console.log(`Match ${roomId} completed successfully:`, data);

    return NextResponse.json({
      success: true,
      message: 'Match results processed and payouts distributed',
      data
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
