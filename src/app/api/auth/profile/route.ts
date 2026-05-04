import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, email, full_name, username, phone, location } = body;

        if (!id || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from("profiles").upsert({
            id,
            email,
            full_name,
            username,
            phone: phone || null,
            location: location || null,
            role: "gamer",
            status: "active",
        });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
