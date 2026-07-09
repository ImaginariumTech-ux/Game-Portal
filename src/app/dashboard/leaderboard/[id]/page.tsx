"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    Trophy,
    Gamepad2,
    Calendar,
    Loader2,
    Play,
    ArrowLeft,
    Award,
    Activity,
    Timer,
    Crown,
    Medal,
    Star,
    Menu,
    Clock,
    Target,
    TrendingUp,
    Hash
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

interface Game {
    id: string;
    title: string;
    thumbnail_url: string | null;
    game_url: string | null;
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
        id: string;
        full_name: string;
        username: string;
        avatar_url: string | null;
    };
}

function getTimeRemaining(dateStr: string): string {
    const now = new Date().getTime();
    const target = new Date(dateStr).getTime();
    const diff = target - now;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
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

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    const datePart = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart} at ${timePart}`;
}

function getTournamentActualStatus(startAt: string, endAt: string): "upcoming" | "active" | "ended" {
    const now = new Date().getTime();
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    
    if (now < start) return "upcoming";
    if (now >= start && now < end) return "active";
    return "ended";
}

export default function TournamentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.id as string;

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);
            await fetchTournament(currentUser.id);
            setLoading(false);
        };
        init();
    }, [router, tournamentId]);

    const fetchTournament = async (userId: string) => {
        const { data, error } = await supabase
            .from("tournaments")
            .select(`
                *,
                game:games(id, title, thumbnail_url, game_url, game_image_url)
            `)
            .eq("id", tournamentId)
            .maybeSingle();

        if (error || !data) {
            console.error("Error fetching tournament:", error);
            return;
        }

        setTournament(data);
        await fetchLeaderboard(data.id, userId);
    };

    const fetchLeaderboard = async (tId: string, userId: string) => {
        setLoadingLeaderboard(true);
        try {
            const { data, error } = await supabase
                .from("tournament_leaderboard")
                .select(`
                    user_id, high_score, updated_at,
                    profile:profiles(id, full_name, username, avatar_url)
                `)
                .eq("tournament_id", tId)
                .order("high_score", { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((entry: any) => ({
                ...entry,
                profile: Array.isArray(entry.profile) ? entry.profile[0] : entry.profile
            }));

            setLeaderboard(formatted);
            const mine = formatted.find((entry) => entry.user_id === userId);
            setUserEntry(mine || null);
        } catch (err) {
            console.error("Error fetching tournament leaderboard:", err);
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const handlePlayTournament = async () => {
        if (!tournament || !tournament.game || !tournament.game.game_url || !user) return;
        const actualStatus = getTournamentActualStatus(tournament.start_at, tournament.end_at);
        if (actualStatus !== "active") {
            toast.error("This tournament is not currently active.");
            return;
        }
        const game = tournament.game;

        try {
            const response = await fetch("/api/game/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gameId: game.id,
                    mode: "tournament",
                    tournamentId: tournament.id
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || "Failed to start tournament session");
            }

            router.push(`/dashboard/play/${resData.sessionId}`);
        } catch (err: any) {
            console.error("Error launching tournament session:", err);
            toast.error(err.message || "Failed to start tournament session");
        }
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (!tournament) {
        return (
            <div className="flex h-screen bg-slate-50 items-center justify-center text-slate-500 flex-col gap-4">
                <Trophy className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-medium">Tournament not found</p>
                <button onClick={() => router.push("/dashboard/leaderboard")} className="text-xs text-purple-600 hover:text-purple-700 cursor-pointer">
                    ← Back to tournaments
                </button>
            </div>
        );
    }

    const bannerUrl = tournament.game?.game_image_url || tournament.game?.thumbnail_url;
    const userRank = userEntry ? leaderboard.findIndex((e) => e.user_id === user?.id) + 1 : null;

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <Toaster />
            <Sidebar
                currentActiveId="leaderboard"
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />

                {/* Top Bar */}
                <header className="h-12 flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center px-5 gap-3 z-20">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => router.push("/dashboard/leaderboard")}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Back to Tournaments</span>
                    </button>

                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {/* Hero Banner */}
                    {(() => {
                        const actualStatus = getTournamentActualStatus(tournament.start_at, tournament.end_at);
                        return (
                            <div className="relative w-full h-56 md:h-72 overflow-hidden">
                                {bannerUrl ? (
                                    <img
                                        src={bannerUrl}
                                        alt={tournament.game?.title || "Tournament"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-200 to-indigo-200" />
                                )}
                                {/* Gradient overlays */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

                                {/* Banner content */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
                                        <div>
                                            {/* Status badge */}
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border mb-3 ${
                                                actualStatus === "active"
                                                    ? "bg-emerald-500/90 text-white border-emerald-400/50"
                                                    : actualStatus === "upcoming"
                                                        ? "bg-blue-500/90 text-white border-blue-400/50"
                                                        : "bg-slate-600/80 text-white border-slate-500/50"
                                            }`}>
                                                {actualStatus === "active" && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                {actualStatus === "active" ? "Live Now" : actualStatus === "upcoming" ? "Upcoming" : "Ended"}
                                            </span>

                                            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight mb-1.5 drop-shadow-lg">
                                                {tournament.title}
                                            </h1>
                                            <div className="flex items-center gap-3 text-white/70 text-xs font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Gamepad2 className="w-3.5 h-3.5" />
                                                    {tournament.game?.title || "Unknown Game"}
                                                </span>
                                                {actualStatus === "active" && tournament.end_at && (
                                                    <span className="flex items-center gap-1 text-amber-200">
                                                        <Timer className="w-3.5 h-3.5" />
                                                        {getTimeRemaining(tournament.end_at)}
                                                    </span>
                                                )}
                                                {actualStatus === "upcoming" && tournament.start_at && (
                                                    <span className="flex items-center gap-1 text-sky-200">
                                                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                                                        {getCountdown(tournament.start_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Play button */}
                                        {actualStatus === "active" && tournament.game?.game_url && (
                                            <button
                                                onClick={handlePlayTournament}
                                                className="px-7 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/25 hover:shadow-purple-500/35 flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer group"
                                            >
                                                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                                                Play Tournament
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Content area */}
                    <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
                        {/* Info + Stats Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                            {/* Tournament info card */}
                            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">About This Tournament</span>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed mb-5">
                                    {tournament.description || "No description provided for this tournament."}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                                            <Calendar className="w-3 h-3" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Start</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">
                                            {tournament.start_at ? formatDateTime(tournament.start_at) : "TBD"}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                                            <Calendar className="w-3 h-3" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">End</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">
                                            {tournament.end_at ? formatDateTime(tournament.end_at) : "Manual"}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                                            <TrendingUp className="w-3 h-3" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Players</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">
                                            {leaderboard.length}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                                            <Target className="w-3 h-3" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Top Score</span>
                                        </div>
                                        <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                                            {leaderboard.length > 0 ? leaderboard[0].high_score.toLocaleString() : "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Your stats card */}
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/50 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Award className="w-4 h-4 text-purple-600" />
                                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Your Stats</span>
                                </div>

                                {userEntry ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">High Score</p>
                                            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 leading-tight">
                                                {userEntry.high_score.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Rank</p>
                                                <p className="text-xl font-black text-slate-800 flex items-center gap-1">
                                                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                                                    {userRank}
                                                    {userRank === 1 && <Crown className="w-4 h-4 text-yellow-500 ml-1" />}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Last Play</p>
                                                <p className="text-xs font-bold text-slate-600">
                                                    {new Date(userEntry.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <Activity className="w-8 h-8 text-purple-300 mb-3" />
                                        <p className="text-xs text-slate-400 font-medium">
                                            {getTournamentActualStatus(tournament.start_at, tournament.end_at) === "active"
                                                ? "Play to get on the board!"
                                                : "You didn't participate"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Leaderboard Table */}
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        Leaderboard Standings
                                    </h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {leaderboard.length} player{leaderboard.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {loadingLeaderboard ? (
                                    <div className="flex justify-center py-16">
                                        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                                    </div>
                                ) : leaderboard.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <Activity className="w-8 h-8 text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400 font-medium">No submissions yet</p>
                                        <p className="text-xs text-slate-300 mt-1">Be the first to compete!</p>
                                    </div>
                                ) : (
                                    leaderboard.map((entry, index) => {
                                        const name = entry.profile?.full_name || entry.profile?.username || "Gamer";
                                        const username = entry.profile?.username ? `@${entry.profile.username}` : "";
                                        const isMe = entry.user_id === user?.id;

                                        const rankBg = index === 0
                                            ? "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/20"
                                            : index === 1
                                                ? "bg-gradient-to-br from-slate-300 to-slate-400 shadow-lg shadow-slate-400/20"
                                                : index === 2
                                                    ? "bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20"
                                                    : "bg-slate-100 border border-slate-200";

                                        return (
                                            <div
                                                key={entry.user_id}
                                                className={`flex items-center justify-between px-6 py-4 transition-colors ${
                                                    isMe
                                                        ? "bg-purple-50 hover:bg-purple-100/60"
                                                        : "hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Rank */}
                                                    <div className="w-8 flex-shrink-0">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${rankBg}`}>
                                                            <span className={`text-xs font-black ${index < 3 ? "text-white" : "text-slate-500"}`}>{index + 1}</span>
                                                        </div>
                                                    </div>

                                                    {/* Avatar */}
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0">
                                                        {entry.profile?.avatar_url ? (
                                                            <img src={entry.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            name[0]?.toUpperCase()
                                                        )}
                                                    </div>

                                                    {/* Name */}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-slate-800 truncate">{name}</h4>
                                                            {isMe && (
                                                                <span className="text-[9px] font-bold text-purple-600 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                    YOU
                                                                </span>
                                                            )}
                                                            {index === 0 && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                                                        </div>
                                                        {username && (
                                                            <p className="text-[10px] text-slate-400">{username}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Score */}
                                                <div className="text-right flex-shrink-0">
                                                    <p className={`text-base font-black leading-tight ${
                                                        index < 3
                                                            ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600"
                                                            : "text-slate-600"
                                                    }`}>
                                                        {entry.high_score.toLocaleString()}
                                                    </p>
                                                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Points</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
