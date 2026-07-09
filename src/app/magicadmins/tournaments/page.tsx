"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
    Search,
    Users2,
    Clock,
    Timer
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Game {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    game_image_url?: string | null;
}

interface Tournament {
    id: string;
    title: string;
    description: string | null;
    game_id: string;
    start_at: string;
    end_at: string;
    status: string;
    created_at: string;
    game?: Game;
}

interface LeaderboardEntry {
    user_id: string;
    high_score: number;
    updated_at: string;
    profile?: {
        full_name: string;
        username: string;
        avatar_url: string | null;
    };
}

function getCountdown(startAt: string): string {
    const now = new Date().getTime();
    const target = new Date(startAt).getTime();
    const diff = target - now;
    if (diff <= 0) return "Starting soon";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `Starts in ${days}d ${hours}h`;
    if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
    return `Starts in ${minutes}m`;
}

function getTimeRemaining(dateStr: string): string {
    const now = new Date().getTime();
    const target = new Date(dateStr).getTime();
    const diff = target - now;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
}

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    const datePart = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart} at ${timePart}`;
}

export default function AdminTournamentsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    const [adminTab, setAdminTab] = useState<"leaderboard">("leaderboard");

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // Fetch all tournaments
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
                game:games(id, title, thumbnail_url, game_image_url)
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
                    user_id, high_score, updated_at,
                    profile:profiles(full_name, username, avatar_url)
                `)
                .eq("tournament_id", tournamentId)
                .order("high_score", { ascending: false });

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

    const handleStartTournament = async () => {
        if (!selectedTournament) return;
        try {
            const { data, error } = await supabase
                .from("tournaments")
                .update({ 
                    status: 'active',
                    start_at: new Date().toISOString() 
                })
                .eq("id", selectedTournament.id)
                .select()
                .single();

            if (error) throw error;
            toast.success("Tournament started successfully!");
            await fetchTournaments();
            if (data) {
                setSelectedTournament(data as Tournament);
            }
        } catch (err: any) {
            console.error("Error starting tournament:", err);
            toast.error(err.message || "Failed to start tournament");
        }
    };

    const handleEndTournament = async () => {
        if (!selectedTournament) return;
        try {
            const { data, error } = await supabase
                .from("tournaments")
                .update({ 
                    status: 'ended',
                    end_at: new Date().toISOString() 
                })
                .eq("id", selectedTournament.id)
                .select()
                .single();

            if (error) throw error;
            toast.success("Tournament ended successfully!");
            await fetchTournaments();
            if (data) {
                setSelectedTournament(data as Tournament);
            }
        } catch (err: any) {
            console.error("Error ending tournament:", err);
            toast.error(err.message || "Failed to end tournament");
        }
    };

    // Creation logic removed (handled by separate creation page)

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

    const getTournamentActualStatus = (t: Tournament): "upcoming" | "active" | "ended" => {
        const now = new Date().getTime();
        const start = new Date(t.start_at).getTime();
        const end = new Date(t.end_at).getTime();
        
        if (now < start) return "upcoming";
        if (now >= start && now < end) return "active";
        return "ended";
    };

    const getTournamentStatus = (t: Tournament) => {
        const actualStatus = getTournamentActualStatus(t);
        if (actualStatus === 'active') {
            return { label: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30" };
        } else if (actualStatus === 'ended') {
            return { label: "Ended", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
        } else {
            return { label: "Upcoming", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
        }
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
                        onClick={() => router.push("/magicadmins/tournaments/create")}
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
                                            onClick={() => router.push("/magicadmins/tournaments/create")}
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
                                                            {formatDateTime(t.start_at)} - {formatDateTime(t.end_at)}
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
                                    {/* Cover Art Banner */}
                                    {(selectedTournament.game?.game_image_url || selectedTournament.game?.thumbnail_url) && (
                                        <div className="w-full h-44 relative shrink-0 overflow-hidden border-b border-white/10 group">
                                            <img
                                                src={selectedTournament.game.game_image_url || selectedTournament.game.thumbnail_url!}
                                                alt={selectedTournament.game.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            {/* Sleek Gradient & Glow overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#150725] via-[#150725]/50 to-transparent" />
                                            {/* Game Title Badge on Cover Art */}
                                            <div className="absolute bottom-4 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                                                <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                                                <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wider">
                                                    {selectedTournament.game.title}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Selected Title */}
                                    <div className="p-6 border-b border-white/5 bg-white/[0.01] shrink-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Trophy className="w-5 h-5 text-yellow-400" />
                                            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Tournament Management</span>
                                        </div>
                                        <h2 className="text-xl font-bold text-white mb-1">{selectedTournament.title}</h2>
                                        <p className="text-xs text-gray-400 mb-3">{selectedTournament.description || "No description provided."}</p>
                                        
                                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getTournamentStatus(selectedTournament).color}`}>
                                                {getTournamentStatus(selectedTournament).label}
                                            </span>

                                            {(() => {
                                                const actualStatus = getTournamentActualStatus(selectedTournament);
                                                if (actualStatus === 'upcoming') {
                                                    return (
                                                        <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                                            <Clock className="w-3 h-3 animate-pulse" />
                                                            {getCountdown(selectedTournament.start_at)}
                                                        </span>
                                                    );
                                                }
                                                if (actualStatus === 'active') {
                                                    return (
                                                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                            <Timer className="w-3 h-3 animate-pulse" />
                                                            {getTimeRemaining(selectedTournament.end_at)}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {(() => {
                                                const actualStatus = getTournamentActualStatus(selectedTournament);
                                                if (actualStatus === 'upcoming') {
                                                    return (
                                                        <button
                                                            onClick={handleStartTournament}
                                                            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            Start Tournament
                                                        </button>
                                                    );
                                                }
                                                if (actualStatus === 'active') {
                                                    return (
                                                        <button
                                                            onClick={handleEndTournament}
                                                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            End Tournament
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        
                                        {/* Tab Headers */}
                                        <div className="flex border-b border-white/5">
                                            <button
                                                className="pb-3 text-xs font-bold uppercase tracking-wider border-b-2 border-purple-500 text-purple-400 mr-6"
                                            >
                                                Leaderboard standings
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tab Content */}
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
                                                    
                                                    const rankBg = index === 0 
                                                        ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400" 
                                                        : index === 1 
                                                            ? "bg-slate-300/15 border-slate-300/30 text-slate-300"
                                                            : index === 2 
                                                                ? "bg-amber-700/15 border-amber-700/30 text-amber-500" 
                                                                : "bg-white/5 border-white/5 text-gray-400";

                                                    return (
                                                        <div
                                                            key={entry.user_id}
                                                            className={`flex items-center justify-between p-4 rounded-xl border ${
                                                                index === 0 ? "bg-white/5 border-white/10" : "bg-white/[0.02] border-white/5"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm ${rankBg}`}>
                                                                    {index + 1}
                                                                </div>

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
                                                                    {entry.high_score.toLocaleString()} pts
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


        </div>
    );
}
