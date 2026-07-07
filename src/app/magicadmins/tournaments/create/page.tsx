"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    Trophy,
    Calendar,
    Gamepad2,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    X
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Game {
    id: string;
    title: string;
}

export default function CreateTournamentPage() {
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [gameId, setGameId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            setLoading(true);
            const { data } = await supabase
                .from("games")
                .select("id, title")
                .eq("status", "published")
                .order("title");
            setGames(data || []);
        } catch (err) {
            console.error("Error fetching games:", err);
            toast.error("Failed to load games list");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !gameId || !startDate || !endDate) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const sDate = new Date(startDate);
            const eDate = new Date(endDate);
            const now = new Date();

            let initialStatus = "upcoming";
            if (now >= sDate && now < eDate) {
                initialStatus = "active";
            } else if (now >= eDate) {
                initialStatus = "ended";
            }

            const { error } = await supabase
                .from("tournaments")
                .insert({
                    title,
                    description: description || null,
                    game_id: gameId,
                    start_at: sDate.toISOString(),
                    end_at: eDate.toISOString(),
                    status: initialStatus
                });

            if (error) throw error;

            toast.success("Tournament created successfully!");
            setTimeout(() => {
                router.push("/magicadmins/tournaments");
            }, 1000);
        } catch (err: any) {
            console.error("Error creating tournament:", err);
            toast.error(err.message || "Failed to create tournament");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <Toaster />
            <AdminSidebar activeItem="tournaments" />

            <main className="flex-1 flex flex-col overflow-hidden bg-[#150725]">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/magicadmins/tournaments")}
                            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                                Create Tournament
                            </h1>
                            <p className="text-xs text-gray-400">Setup a new manual or automatic tournament</p>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start no-scrollbar">
                        <div className="w-full max-w-2xl bg-[#1a0b2e] border border-white/10 rounded-3xl p-8 shadow-2xl relative">
                            <form onSubmit={handleCreateTournament} className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                        Tournament Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500"
                                        placeholder="e.g. Summer Smash Arena"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500 h-28 resize-none"
                                        placeholder="Explain rules, prizes, or dates details..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                        Select Game Target *
                                    </label>
                                    <select
                                        value={gameId}
                                        onChange={(e) => setGameId(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        required
                                    >
                                        <option value="" disabled className="bg-[#1a0b2e]">Select game...</option>
                                        {games.map((g) => (
                                            <option key={g.id} value={g.id} className="bg-[#1a0b2e]">
                                                {g.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                            Start Date/Time *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                            End Date/Time *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => router.push("/magicadmins/tournaments")}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            "Create Now"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
