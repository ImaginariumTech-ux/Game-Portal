"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    Trophy,
    Gamepad2,
    Calendar,
    Loader2,
    Clock,
    Users2,
    Menu,
    Flame,
    Timer,
    ChevronRight,
    Sparkles
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

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

function getTimeRemaining(dateStr: string): string {
    const now = new Date().getTime();
    const target = new Date(dateStr).getTime();
    const diff = target - now;

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function getCountdown(start: string): string {
    const now = new Date().getTime();
    const target = new Date(start).getTime();
    const diff = target - now;

    if (diff <= 0) return "Starting soon";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `Starts in ${days}d ${hours}h`;
    if (hours > 0) return `Starts in ${hours}h`;
    return `Starting soon`;
}

export default function TournamentsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filterTab, setFilterTab] = useState<"active" | "upcoming" | "completed">("active");

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/");
                return;
            }
            await fetchTournaments();
            setLoading(false);
        };
        init();
    }, [router]);

    const fetchTournaments = async () => {
        const { data, error } = await supabase
            .from("tournaments")
            .select(`
                *,
                game:games(id, title, thumbnail_url, game_url, game_image_url)
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching tournaments:", error);
            return;
        }

        setTournaments(data || []);
    };

    const filtered = tournaments.filter((t) => {
        if (filterTab === "upcoming") return t.status === "upcoming";
        if (filterTab === "completed") return t.status === "ended";
        return t.status === "active";
    });

    const tabCounts = {
        active: tournaments.filter((t) => t.status === "active").length,
        upcoming: tournaments.filter((t) => t.status === "upcoming").length,
        completed: tournaments.filter((t) => t.status === "ended").length,
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-slate-50 items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <Sidebar
                currentActiveId="leaderboard"
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-indigo-600/4 blur-[120px] rounded-full pointer-events-none" />

                {/* Top Bar */}
                <header className="h-12 flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center px-5 gap-3 z-20">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tournaments</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                    {/* Hero Header */}
                    <div className="pt-8 pb-6 px-6 md:px-10 shrink-0">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-[0.2em]">
                                            Compete & Win
                                        </span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">
                                        Tournaments
                                    </h1>
                                    <p className="text-slate-500 text-sm font-medium max-w-md">
                                        Play your favourite games and climb the leaderboard. Only your highest score counts.
                                    </p>
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center gap-3">
                                    <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active</p>
                                        <p className="text-lg font-black text-emerald-600 leading-tight">{tabCounts.active}</p>
                                    </div>
                                    <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Upcoming</p>
                                        <p className="text-lg font-black text-blue-600 leading-tight">{tabCounts.upcoming}</p>
                                    </div>
                                    <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ended</p>
                                        <p className="text-lg font-black text-slate-400 leading-tight">{tabCounts.completed}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex gap-1 mt-6 bg-slate-100 rounded-2xl p-1 border border-slate-200 w-fit">
                                {(["active", "upcoming", "completed"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setFilterTab(tab)}
                                        className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                            filterTab === tab
                                                ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                                                : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        {tab === "completed" ? "Ended" : tab}
                                        <span className={`ml-1.5 text-[10px] ${
                                            filterTab === tab ? "text-purple-400" : "text-slate-300"
                                        }`}>
                                            {tabCounts[tab]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tournament Cards Grid */}
                    <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-8 no-scrollbar">
                        <div className="max-w-6xl mx-auto">
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-24">
                                    <div className="w-20 h-20 rounded-3xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-5">
                                        <Trophy className="w-8 h-8 text-purple-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-600 mb-2">
                                        No {filterTab} tournaments
                                    </h3>
                                    <p className="text-slate-400 text-sm max-w-xs">
                                        {filterTab === "active"
                                            ? "No tournaments are live right now. Check upcoming for scheduled ones."
                                            : filterTab === "upcoming"
                                                ? "No tournaments scheduled yet. Check back later!"
                                                : "No completed tournaments to show."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filtered.map((t) => {
                                        const bannerUrl = t.game?.game_image_url || t.game?.thumbnail_url;
                                        const isActive = t.status === "active";
                                        const isUpcoming = t.status === "upcoming";

                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => router.push(`/dashboard/leaderboard/${t.id}`)}
                                                className="group bg-white border border-slate-200 hover:border-purple-300 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-600/5 hover:-translate-y-0.5"
                                            >
                                                {/* Card Banner */}
                                                <div className="relative h-40 overflow-hidden">
                                                    {bannerUrl ? (
                                                        <img
                                                            src={bannerUrl}
                                                            alt={t.game?.title || "Tournament"}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                                            <Gamepad2 className="w-10 h-10 text-purple-300" />
                                                        </div>
                                                    )}
                                                    {/* Gradient overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                                                    {/* Status badge */}
                                                    <div className="absolute top-3 left-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                                                            isActive
                                                                ? "bg-emerald-500/90 text-white border-emerald-400/50"
                                                                : isUpcoming
                                                                    ? "bg-blue-500/90 text-white border-blue-400/50"
                                                                    : "bg-slate-600/80 text-white border-slate-500/50"
                                                        }`}>
                                                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                            {isActive ? "Live" : isUpcoming ? "Upcoming" : "Ended"}
                                                        </span>
                                                    </div>

                                                    {/* Game tag */}
                                                    <div className="absolute bottom-3 left-3">
                                                        <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-lg">
                                                            {t.game?.title || "Unknown Game"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-5">
                                                    <h3 className="text-base font-bold text-slate-800 group-hover:text-purple-700 transition-colors leading-snug mb-2 line-clamp-1">
                                                        {t.title}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                                                        {t.description || "No description provided."}
                                                    </p>

                                                    {/* Footer meta */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                            {isActive ? (
                                                                <>
                                                                    <Timer className="w-3 h-3 text-amber-500" />
                                                                    <span className="text-amber-600">
                                                                        {t.end_at ? getTimeRemaining(t.end_at) + " left" : "Open-ended"}
                                                                    </span>
                                                                </>
                                                            ) : isUpcoming ? (
                                                                <>
                                                                    <Clock className="w-3 h-3 text-blue-500" />
                                                                    <span className="text-blue-600">{getCountdown(t.start_at)}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Calendar className="w-3 h-3" />
                                                                    <span>Ended {t.end_at ? new Date(t.end_at).toLocaleDateString() : ""}</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1 text-slate-300 group-hover:text-purple-500 transition-colors">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">View</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
