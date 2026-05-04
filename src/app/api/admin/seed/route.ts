import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email, password, fullName } = await request.json();

        // Validate input
        if (!email || !password || !fullName) {
            return NextResponse.json(
                { error: 'Email, password, and full name are required' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json(
                { error: 'Supabase configuration is missing' },
                { status: 500 }
            );
        }

        if (!supabaseServiceRoleKey) {
            return NextResponse.json(
                { error: 'Service role key is required for admin seeding. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' },
                { status: 500 }
            );
        }

        // Create two clients: one for auth (anon), one for admin operations (service role)
        const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Sign Up using anon client
        const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
            email,
            password,
        });

        if (authError) {
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'No user returned from signup' },
                { status: 500 }
            );
        }

        // 2. Create Profile with Admin Role using service role client (bypasses RLS)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email,
                username: email.split('@')[0],
                full_name: fullName,
                role: 'admin', // This will work because service role bypasses RLS
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            });

        if (profileError) {
            return NextResponse.json(
                {
                    error: `Auth created, but profile setup failed: ${profileError.message}`
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Admin user created successfully! You can now login.' },
            { status: 200 }
        );

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
