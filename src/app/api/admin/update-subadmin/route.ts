import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    try {
        // 1. Verify Admin
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Parse Body
        const body = await request.json();
        const { userId, email, fullName } = body;

        if (!userId || !email || !fullName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Update Auth User (Email)
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email: email, user_metadata: { full_name: fullName } }
        );

        if (updateAuthError) {
            console.error('Update Auth Error:', updateAuthError);
            return NextResponse.json({ error: updateAuthError.message }, { status: 500 });
        }

        // 4. Update Profile
        const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name: fullName, email: email })
            .eq('id', userId);

        if (updateProfileError) {
            console.error('Update Profile Error:', updateProfileError);
            return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
