import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
    try {
        const apiKey = request.headers.get('x-api-key');

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
        }

        // 1. Validate API Key
        const { data: keyData, error: keyError } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('key', apiKey)
            .eq('is_active', true)
            .single();

        if (keyError || !keyData) {
            return NextResponse.json({ error: 'Invalid or Inactive API Key' }, { status: 403 });
        }

        // 2. Fetch Games based on Scope
        let query = supabaseAdmin
            .from('games')
            .select(`
                id,
                title,
                description,
                thumbnail_url,
                game_url,
                slug,
                version,
                created_at
            `)
            .eq('status', 'published') // Only published games
            .order('created_at', { ascending: false });

        // Apply Game Scope if exists
        if (keyData.game_id) {
            query = query.eq('id', keyData.game_id);
        }

        const { data: games, error: gamesError } = await query;

        if (gamesError) {
            console.error('API Games Fetch Error:', gamesError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const response = NextResponse.json({
            owner: keyData.owner_name,
            games: games
        });

        // Add CORS Headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

        return response;

    } catch (error: any) {
        console.error('API Uncaught Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function OPTIONS(request: Request) {
    const response = new NextResponse(null, {
        status: 204,
    });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    return response;
}
