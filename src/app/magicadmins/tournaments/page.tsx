"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
    Plus,
    Trash2,
    Trophy,
    Calendar,
    Gamepad2,
    Loader2,
    Activity,
    CheckCircle2,
    AlertCircle,
    X,
    ChevronRight,
    Search
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Game {
    id: string;
    title: string;
}

interface Tournament {
    id: string;
    title: string;
    description: string | null;
    game_id: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    game?: Game;
}

interface LeaderboardEntry {
    id: string;
    user_id: string;
    score: number;
    updated_at: string;
    profile?: {
        full_name: string;
        username: string;
        avatar_url: string | null;
    };
}

export default function AdminTournamentsPage() {
    const [loading, setLoading] = useState(true);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    // Form state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [gameId, setGameId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // 1. Fetch published games for the dropdown
            const { data: gamesData } = await supabase
                .from("games")
                .select("id, title")
                .eq("status", "published")
                .order("title");
            setGames(gamesData || []);

            // 2. Fetch all tournaments
            await fetchTournaments();
        } catch (err) {
            console.error("Error fetching initial admin data:", err);
            toast.error("Failed to load initial data");
        } finally {
            setLoading(false);
        }
    };

    const fetchTournaments = async () => {
        const { data, error } = await supabase
            .from("tournaments")
            .select(`
                *,
                game:games(id, title)
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching tournaments:", error);
            toast.error("Failed to fetch tournaments");
            return;
        }

        setTournaments(data || []);
        
        // Auto-select first tournament if none selected
        if (data && data.length > 0 && !selectedTournament) {
            setSelectedTournament(data[0]);
            fetchLeaderboard(data[0].id);
        } else if (selectedTournament) {
            // Refresh currently selected
            const updated = data.find(t => t.id === selectedTournament.id);
            if (updated) {
                setSelectedTournament(updated);
                fetchLeaderboard(updated.id);
            }
        }
    };

    const fetchLeaderboard = async (tournamentId: string) => {
        setLoadingLeaderboard(true);
        try {
            const { data, error } = await supabase
                .from("tournament_leaderboard")
                .select(`
                    id, user_id, score, updated_at,
                    profile:profiles(full_name, username, avatar_url)
                `)
                .eq("tournament_id", tournamentId)
                .order("score", { ascending: false });

            if (error) throw error;
            
            const formatted = (data || []).map((entry: any) => ({
                ...entry,
                profile: Array.isArray(entry.profile) ? entry.profile[0] : entry.profile
            }));
            setLeaderboard(formatted);
        } catch (err) {
            console.error("Error fetching leaderboard:", err);
            toast.error("Failed to load leaderboard standings");
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const handleSelectTournament = (t: Tournament) => {
        setSelectedTournament(t);
        fetchLeaderboard(t.id);
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !gameId || !startDate || !endDate) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const { data, error } = await supabase
                .from("tournaments")
                .insert({
                    title,
                    description: description || null,
                    game_id: gameId,
                    start_date: new Date(startDate).toISOString(),
                    end_date: new Date(endDate).toISOString(),
                    is_active: isActive
                })
                .select()
                .single();

            if (error) throw error;

            toast.success("Tournament created successfully!");
            setShowCreateModal(false);
            
            // Reset form
            setTitle("");
            setDescription("");
            setGameId("");
            setStartDate("");
            setEndDate("");
            setIsActive(true);

            // Refresh list and select the new tournament
            await fetchTournaments();
            if (data) {
                setSelectedTournament(data);
                fetchLeaderboard(data.id);
            }
        } catch (err: any) {
            console.error("Error creating tournament:", err);
            toast.error(err.message || "Failed to create tournament");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTournament = async (id: string) => {
        if (!confirm("Are you sure you want to delete this tournament? This will permanently erase the tournament and all of its leaderboard entry scores.")) {
            return;
        }

        try {
            const { error } = await supabase
                .from("tournaments")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Tournament deleted successfully");
            setSelectedTournament(null);
            setLeaderboard([]);
            await fetchTournaments();
        } catch (err: any) {
            console.error("Error deleting tournament:", err);
            toast.error(err.message || "Failed to delete tournament");
        }
    };

    const getTournamentStatus = (t: Tournament) => {
        const now = new Date();
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);

        if (!t.is_active) return { label: "Disabled", color: "bg-red-500/20 text-red-400 border-red-500/30" };
        if (now < start) return { label: "Upcoming", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
        if (now > end) return { label: "Ended", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
        return { label: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    };

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <Toaster />
            <AdminSidebar activeItem="tournaments" />

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                            Tournaments Setup
                        </h1>
                        <p className="text-xs text-gray-400">Configure single-player tournaments and watch live scoreboard leaderboards</p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus className="w-4 h-4" /> Create Tournament
                    </button>
                </header>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center bg-[#150725]">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden bg-[#150725]">
                        {/* Tournaments List Panel */}
                        <div className="w-1/2 border-r border-white/5 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-black/10">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Tournaments ({tournaments.length})
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {tournaments.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500 text-sm">
                                        <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        No tournaments created yet.
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="block mx-auto mt-2 text-purple-400 hover:text-purple-300"
                                        >
                                            Click here to create one.
                                        </button>
                                    </div>
                                ) : (
                                    tournaments.map((t) => {
                                        const status = getTournamentStatus(t);
                                        const isSelected = selectedTournament?.id === t.id;
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => handleSelectTournament(t)}
                                                className={`group p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${
                                                    isSelected
                                                        ? "bg-white/10 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
                                                        <Gamepad2 className="w-3.5 h-3.5" />
                                                        {t.game?.title || "Unknown Game"}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <div>
                                                    <h3 className="font-bold text-base text-gray-100 group-hover:text-white transition-colors">
                                                        {t.title}
                                                    </h3>
                                                    {t.description && (
                                                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                                            {t.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-white/5 pt-2.5 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>
                                                            {new Date(t.start_date).toLocaleDateString()} - {new Date(t.end_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTournament(t.id);
                                                        }}
                                                        className="text-red-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Leaderboard Detail Panel */}
                        <div className="w-1/2 flex flex-col overflow-hidden bg-black/10">
                            {selectedTournament ? (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {/* Selected Title */}
                                    <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Trophy className="w-5 h-5 text-yellow-400" />
                                            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Tournament Leaderboard</span>
                                        </div>
                                        <h2 className="text-xl font-bold text-white mb-1">{selectedTournament.title}</h2>
                                        <p className="text-xs text-gray-400">{selectedTournament.description || "No description provided."}</p>
                                    </div>

                                    {/* Standing table */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {loadingLeaderboard ? (
                                            <div className="flex justify-center py-20">
                                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                            </div>
                                        ) : leaderboard.length === 0 ? (
                                            <div className="text-center py-20 text-gray-500 text-sm">
                                                <Activity className="w-10 h-10 text-gray-700 mx-auto mb-3 animate-pulse" />
                                                No submissions yet. Players scores will display here as they play!
                                            </div>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {leaderboard.map((entry, index) => {
                                                    const name = entry.profile?.full_name || entry.profile?.username || "Gamer";
                                                    const username = entry.profile?.username ? `@${entry.profile.username}` : "Gamer";
                                                    
                                                    // Medal colors
                                                    const isTop3 = index < 3;
                                                    const rankBg = index === 0 
                                                        ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400" 
                                                        : index === 1 
                                                            ? "bg-slate-300/15 border-slate-300/30 text-slate-300"
                                                            : index === 2 
                                                                ? "bg-amber-700/15 border-amber-700/30 text-amber-500" 
                                                                : "bg-white/5 border-white/5 text-gray-400";

                                                    return (
                                                        <div
                                                            key={entry.id}
                                                            className={`flex items-center justify-between p-4 rounded-xl border ${
                                                                index === 0 ? "bg-white/5 border-white/10" : "bg-white/[0.02] border-white/5"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                {/* Rank badge */}
                                                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm ${rankBg}`}>
                                                                    {index + 1}
                                                                </div>

                                                                {/* Gamer avatar and info */}
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-black overflow-hidden relative border border-white/10">
                                                                        {entry.profile?.avatar_url ? (
                                                                            <img src={entry.profile.avatar_url} alt={name} className="object-cover w-full h-full" />
                                                                        ) : (
                                                                            name[0]?.toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-sm text-gray-200">{name}</h4>
                                                                        <p className="text-[10px] text-gray-500">{username}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                                                                    {entry.score.toLocaleString()} pts
                                                                </div>
                                                                <div className="text-[9px] text-gray-500">
                                                                    {new Date(entry.updated_at).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm">
                                    <Trophy className="w-12 h-12 text-gray-700 mb-4 animate-bounce" />
                                    Select a tournament on the left to inspect scoreboard standings.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Tournament Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#0d0f14]/80 backdrop-blur-md"
                        onClick={() => setShowCreateModal(false)}
                    />
                    
                    <div className="relative w-full max-w-lg bg-[#1a0b2e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold">New Tournament</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTournament} className="p-6 space-y-4">
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
                                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500 h-20 resize-none"
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

                            <div className="grid grid-cols-2 gap-4">
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

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="is-active"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-5 h-5 rounded border-white/10 bg-black/20 text-purple-600 focus:ring-purple-500/50 focus:ring-offset-0 focus:outline-none"
                                />
                                <label htmlFor="is-active" className="text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer select-none">
                                    Tournament Active / Enabled (Visible to users)
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </div>
    );
}
