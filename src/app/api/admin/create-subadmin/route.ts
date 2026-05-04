import { createClient } from '@/lib/supabase/server'; // Use server client to get session
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('[CreateAdmin] Starting request...');

    // Check Env Var
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[CreateAdmin] Missing SUPABASE_SERVICE_ROLE_KEY');
        return NextResponse.json({ error: 'Server misconfiguration: Missing Service Key' }, { status: 500 });
    }

    try {
        // 1. Verify Authentication & Authorization
        console.log('[CreateAdmin] Verifying session...');
        const supabase = await createClient(); // Await usage fixed

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[CreateAdmin] Auth Error:', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[CreateAdmin] User Authenticated:', user.email);

        // Optional: Check if the current user is an admin
        const { data: profile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileCheckError) {
            console.error('[CreateAdmin] Profile Check Error:', profileCheckError);
        }

        if (!profile || profile.role !== 'admin') {
            console.error('[CreateAdmin] Forbidden. Role:', profile?.role);
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
        }

        console.log('[CreateAdmin] User is Admin.');

        // 2. Parse body
        const body = await request.json();
        const { email, password, fullName } = body;

        console.log('[CreateAdmin] Creating account for:', email);

        if (!email || !password || !fullName) {
            console.error('[CreateAdmin] Missing fields:', { email: !!email, password: !!password, fullName: !!fullName });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Create user in Auth (using service role key)
        let userId;

        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (createError) {
            // Check if user already exists
            if (createError.message.includes('already been registered') || createError.code === 'email_exists') {
                console.log('[CreateAdmin] User already exists. Fetching user ID to promote...');

                const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

                if (listError) {
                    console.error('[CreateAdmin] Failed to list users for promotion:', listError);
                    return NextResponse.json({ error: 'User exists but failed to retrieve details for promotion' }, { status: 500 });
                }

                const existingUser = listData.users.find(u => u.email === email);
                if (!existingUser) {
                    return NextResponse.json({ error: 'User reported as existing but could not be found.' }, { status: 500 });
                }

                userId = existingUser.id;
                console.log('[CreateAdmin] Existing User Found. ID:', userId);

            } else {
                console.error('[CreateAdmin] Create User Error:', createError);
                return NextResponse.json({ error: createError.message }, { status: 400 });
            }
        } else {
            if (!userData.user) {
                console.error('[CreateAdmin] No user data returned');
                return NextResponse.json({ error: 'User creation failed unexpectedly' }, { status: 500 });
            }
            userId = userData.user.id;
            console.log('[CreateAdmin] User created in Auth. ID:', userId);
        }

        // 4. Update Profile with Role
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                role: 'admin',
                full_name: fullName,
                email: email
            });

        if (profileError) {
            console.error('[CreateAdmin] Profile Upsert Error:', profileError);
            return NextResponse.json({ error: `User created but profile update failed: ${profileError.message}` }, { status: 500 });
        }

        console.log('[CreateAdmin] Profile updated successfully.');

        return NextResponse.json({ success: true, user: userData.user });

    } catch (error: any) {
        console.error('[CreateAdmin] Uncaught API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
