import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
    try {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!key) {
            return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
        }

        // Test Service Role Key
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

        if (error) {
            return NextResponse.json({ status: 'Error', message: error.message, details: error }, { status: 500 });
        }

        return NextResponse.json({ status: 'OK', userCount: data.users.length, firstUser: data.users[0]?.email });
    } catch (e: any) {
        return NextResponse.json({ status: 'Exception', message: e.message, stack: e.stack }, { status: 500 });
    }
}
