import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, first_name, last_name, email, phone, location, status, created_at, role")
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Show all non-admin profiles (role = 'gamer', null, or anything else)
        const gamers = (data || []).filter(u => u.role !== "admin");

        return NextResponse.json({ gamers });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

