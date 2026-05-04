import { createBrowserClient } from '@supabase/ssr'

// For client-side usage with proper cookie handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey
    });
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
