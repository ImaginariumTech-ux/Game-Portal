"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Gamepad2, ArrowRight, ArrowLeft, RefreshCw, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function GameSelectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get("roomId");

    const [games, setGames] = useState<any[]>([]);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId) {
            router.push("/dashboard/gameroom/create/mode");
            return;
        }

        const fetchGames = async () => {
            const { data, error } = await supabase
                .from("games")
                .select("*")
                .eq("status", "published")
                .order("title", { ascending: true });
            
            if (error) {
                console.error("Error fetching games:", error);
                setError("Failed to load games list.");
            } else {
                setGames(data || []);
            }
            setLoading(false);
        };

        fetchGames();
    }, [roomId, router]);

    const handleNext = async () => {
        if (!selectedGameId || !roomId || updating) return;
        setUpdating(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("game_rooms")
                .update({ game_id: selectedGameId })
                .eq("id", roomId);

            if (updateError) throw updateError;

            // Check if we should skip stakes (practice mode)
            const { data: room } = await supabase
                .from("game_rooms")
                .select("mode")
                .eq("id", roomId)
                .single();

            if (room?.mode === 'practice') {
                router.push(`/dashboard/gameroom/create/invite?roomId=${roomId}`);
            } else {
                router.push(`/dashboard/gameroom/create/stakes?roomId=${roomId}`);
            }
        } catch (err: any) {
            console.error("Error updating game selection:", err);
            setError("Failed to save game selection.");
        } finally {
            setUpdating(false);
        }
    };

    const filteredGames = games.filter(g => 
        g.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Loading games library...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-3">Select Game</h2>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Choose the game your team will play in this room</p>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="mb-8 relative max-w-md mx-auto">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input 
                    type="text" 
                    placeholder="Search games or categories..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white font-bold text-xs uppercase tracking-widest outline-none focus:border-purple-500 transition-all placeholder:text-gray-700"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                {filteredGames.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <Gamepad2 className="w-16 h-16 mx-auto mb-4" />
                        <p className="font-black text-xs uppercase tracking-widest">No games found matching your search</p>
                    </div>
                ) : (
                    filteredGames.map((game) => (
                        <button
                            key={game.id}
                            onClick={() => setSelectedGameId(game.id)}
                            className={`p-4 rounded-[32px] border-2 transition-all flex flex-col gap-4 text-left group hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden ${
                                selectedGameId === game.id 
                                ? "bg-purple-600/10 border-purple-500 shadow-[0_20px_40px_rgba(0,0,0,0.3)]" 
                                : "bg-white/[0.02] border-white/5 hover:border-white/10"
                            }`}
                        >
                            <div className="aspect-[4/3] w-full rounded-2xl bg-white/5 relative overflow-hidden shadow-inner border border-white/5">
                                {game.thumbnail_url ? (
                                    <Image src={game.thumbnail_url} alt={game.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Gamepad2 className="w-10 h-10 text-gray-800" />
                                    </div>
                                )}
                                {game.category && (
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
                                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">{game.category}</span>
                                    </div>
                                )}
                            </div>
                            <div className="px-1">
                                <h3 className={`font-black uppercase italic tracking-tight mb-0.5 truncate ${
                                    selectedGameId === game.id ? "text-purple-400" : "text-white"
                                }`}>
                                    {game.title}
                                </h3>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                                    Up to {game.max_players || 4} Players
                                </p>
                            </div>

                            {selectedGameId === game.id && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => router.back()}
                    className="flex-[0.3] py-5 bg-white/5 text-gray-500 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={handleNext}
                    disabled={!selectedGameId || updating}
                    className="flex-1 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-purple-100 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {updating ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                        <>
                            Continue to Stakes
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function GameSelectionPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 text-purple-500 animate-spin" /></div>}>
            <GameSelectionContent />
        </Suspense>
    );
}
