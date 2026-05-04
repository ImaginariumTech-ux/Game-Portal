"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users2, Trophy, Shield, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const MODES = [
    { 
        id: 'friend_room', 
        label: 'Friend Room', 
        description: 'Private, flexible stakes, no leaderboard impact. Perfect for playing with friends.',
        icon: Users2,
        color: 'purple'
    },
    { 
        id: 'practice', 
        label: 'Practice', 
        description: 'Solo/bot opponents, no coins, no rankings. Sharpen your skills.',
        icon: Shield,
        color: 'blue'
    }
];

export default function ModeSelectionPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [selectedMode, setSelectedMode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }
            setUser(user);
        };
        checkUser();
    }, [router]);

    const generateJoinCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleNext = async () => {
        if (!selectedMode || !user || loading) return;
        setLoading(true);
        setError(null);

        try {
            // Check if user already has an active room
            const { data: existing } = await supabase
                .from("game_rooms")
                .select("id")
                .eq("host_id", user.id)
                .neq("status", "dissolved")
                .limit(1)
                .maybeSingle();

            if (existing) {
                setError("You already have an active room. Dissolve it first.");
                setLoading(false);
                return;
            }

            // Create room in 'forming' status
            const joinCode = generateJoinCode();
            const { data: room, error: insertError } = await supabase
                .from("game_rooms")
                .insert({
                    host_id: user.id,
                    name: `${user.user_metadata?.full_name || 'My'} Room`,
                    mode: selectedMode,
                    status: 'forming',
                    join_code: joinCode,
                    stake_amount: 0, // Default to 0, updated in Step 3
                    max_players: 4   // Default, can be updated per game
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Add host to room_players
            await supabase.from("room_players").insert({
                room_id: room.id,
                user_id: user.id,
                is_ready: true // Host is always ready
            });

            // Navigate to Step 2 with roomId
            router.push(`/dashboard/gameroom/create/game?roomId=${room.id}`);
        } catch (err: any) {
            console.error("Error creating room:", err);
            setError(err.message || "Failed to initialize room.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-3">Choose Room Mode</h2>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Select the type of match experience you want to host</p>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-12">
                {MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = selectedMode === mode.id;
                    
                    return (
                        <button
                            key={mode.id}
                            onClick={() => setSelectedMode(mode.id)}
                            className={`p-6 rounded-[32px] border-2 transition-all flex items-center gap-6 text-left group hover:scale-[1.02] active:scale-[0.98] ${
                                isSelected 
                                ? `bg-${mode.color}-500/10 border-${mode.color}-500 shadow-[0_20px_40px_rgba(0,0,0,0.3)]` 
                                : "bg-white/[0.02] border-white/5 hover:border-white/10"
                            }`}
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                                isSelected ? `bg-${mode.color}-500 text-white` : "bg-white/5 text-gray-500 group-hover:text-gray-300"
                            }`}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-xl font-black uppercase italic tracking-tight mb-1 ${
                                    isSelected ? `text-${mode.color}-400` : "text-white"
                                }`}>
                                    {mode.label}
                                </h3>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                    {mode.description}
                                </p>
                            </div>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? `border-${mode.color}-500 bg-${mode.color}-500` : "border-white/10"
                            }`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                onClick={handleNext}
                disabled={!selectedMode || loading}
                className="w-full py-5 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-purple-100 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                    <>
                        Continue to Game Selection
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
        </div>
    );
}
