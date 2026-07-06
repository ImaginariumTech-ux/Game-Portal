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
    Activity,
    Play,
    Users2,
    Search,
    ChevronRight,
    Star,
    Award
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

interface Game {
    id: string;
    title: string;
    thumbnail_url: string | null;
    game_url: string | null;
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
        id: string;
        full_name: string;
        username: string;
        avatar_url: string | null;
    };
}

export default function UserLeaderboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
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
            await fetchTournaments(currentUser.id);
            setLoading(false);
        };
        init();
    }, [router]);

    const fetchTournaments = async (userId: string) => {
        const { data, error } = await supabase
            .from("tournaments")
            .select(`
                *,
                game:games(id, title, thumbnail_url, game_url)
            `)
            .eq("is_active", true)
            .order("end_date", { ascending: true });

        if (error) {
            console.error("Error fetching tournaments:", error);
            return;
        }

        setTournaments(data || []);

        // Default select first active tournament
        if (data && data.length > 0) {
            setSelectedTournament(data[0]);
            fetchLeaderboard(data[0].id, userId);
        }
    };

    const fetchLeaderboard = async (tournamentId: string, userId: string) => {
        setLoadingLeaderboard(true);
        try {
            const { data, error } = await supabase
                .from("tournament_leaderboard")
                .select(`
                    id, user_id, score, updated_at,
                    profile:profiles(id, full_name, username, avatar_url)
                `)
                .eq("tournament_id", tournamentId)
                .order("score", { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((entry: any) => ({
                ...entry,
                profile: Array.isArray(entry.profile) ? entry.profile[0] : entry.profile
            }));

            setLeaderboard(formatted);

            // Find current user's entry
            const mine = formatted.find((entry) => entry.user_id === userId);
            setUserEntry(mine || null);
        } catch (err) {
            console.error("Error fetching tournament leaderboard:", err);
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const handleSelectTournament = (t: Tournament) => {
        if (!user) return;
        setSelectedTournament(t);
        fetchLeaderboard(t.id, user.id);
    };

    const handlePlayTournament = async () => {
        if (!selectedTournament || !selectedTournament.game || !selectedTournament.game.game_url || !user) return;
        const game = selectedTournament.game;
        
        try {
            // Create a game room linking to this tournament
            const roomId = crypto.randomUUID();
            const joinCode = `TOUR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            // Increment plays count in DB
            await supabase.rpc('increment_game_plays', { p_game_id: game.id });

            // Insert game_room record
            const { error: roomErr } = await supabase.from('game_rooms').insert({
                id: roomId,
                name: `Tournament: ${selectedTournament.title}`,
                host_id: user.id,
                game_id: game.id,
                mode: 'practice', // use practice mode since it's a single player run
                status: 'live',
                stake_amount: 0,
                join_code: joinCode,
                max_players: 1,
                tournament_id: selectedTournament.id // Link to tournament!
            });

            if (roomErr) throw roomErr;

            // Insert room_player record
            const { error: playerErr } = await supabase.from('room_players').insert({
                room_id: roomId,
                user_id: user.id,
                status: 'joined',
                is_ready: true
            });

            if (playerErr) throw playerErr;

            // Route to play page
            router.push(`/dashboard/play/${roomId}`);
        } catch (err) {
            console.error("Error launching tournament session:", err);
            alert("Failed to start tournament session");
        }
    };

    const isUpcoming = (t: Tournament) => {
        return new Date() < new Date(t.start_date);
    };

    const isEnded = (t: Tournament) => {
        return new Date() > new Date(t.end_date);
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

            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

                {/* Main page content area */}
                <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                    {/* Header */}
                    <header className="pt-16 pb-8 px-8 md:px-12 border-b border-slate-200 shrink-0">
                        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-2 uppercase italic">
                                    Tournaments
                                </h1>
                                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                                    Play games against the computer and fight for the top rank on the leaderboard
                                </p>
                            </div>
                        </div>
                    </header>

                    {tournaments.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-24 h-24 rounded-[32px] bg-purple-50 flex items-center justify-center border border-purple-200/50 mb-6 shadow-sm">
                                <Trophy className="w-10 h-10 text-purple-500/40" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight italic">No Active Tournaments</h3>
                            <p className="text-slate-400 font-bold text-xs max-w-xs uppercase tracking-widest leading-relaxed">
                                Check back later! Administrators will schedule new tournaments soon.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex overflow-hidden max-w-6xl w-full mx-auto px-4 md:px-8 pb-10 gap-6 mt-6">
                            {/* Tournaments List (Left Panel) */}
                            <div className="w-1/2 flex flex-col overflow-hidden bg-white border border-slate-200 shadow-sm rounded-[32px] p-6">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                                    Active Tournaments ({tournaments.length})
                                </h3>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
                                    {tournaments.map((t) => {
                                        const isSelected = selectedTournament?.id === t.id;
                                        const upcoming = isUpcoming(t);
                                        const ended = isEnded(t);
                                        
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => handleSelectTournament(t)}
                                                className={`group p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                                                    isSelected
                                                        ? "bg-purple-50 border-purple-300 shadow-sm"
                                                        : "bg-slate-50/50 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                                                }`}
                                            >
                                                {/* Game Thumbnail */}
                                                <div className="w-16 h-16 rounded-xl relative overflow-hidden bg-purple-50 flex-shrink-0 border border-slate-200">
                                                    {t.game?.thumbnail_url ? (
                                                        <Image src={t.game.thumbnail_url} alt="Game Thumbnail" fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Gamepad2 className="w-6 h-6 text-purple-600/40" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className="font-black text-base text-slate-900 truncate leading-tight uppercase italic group-hover:text-purple-600 transition-colors">
                                                            {t.title}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                                                            Game: {t.game?.title || "Unknown"}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span>Ends {new Date(t.end_date).toLocaleDateString()}</span>
                                                        </div>
                                                        {upcoming && (
                                                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Upcoming</span>
                                                        )}
                                                        {ended && (
                                                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Ended</span>
                                                        )}
                                                        {!upcoming && !ended && (
                                                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">Active</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Leaderboard Details (Right Panel) */}
                            <div className="w-1/2 flex flex-col overflow-hidden bg-white border border-slate-200 shadow-sm rounded-[32px]">
                                {selectedTournament ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        {/* Tournament Details Banner */}
                                        <div className="p-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2 text-yellow-600">
                                                    <Trophy className="w-4 h-4 fill-current" />
                                                    <span className="text-xs font-black uppercase tracking-wider">Tournament Standing</span>
                                                </div>
                                                
                                                {/* Play Button */}
                                                {!isUpcoming(selectedTournament) && !isEnded(selectedTournament) && selectedTournament.game?.game_url && (
                                                    <button
                                                        onClick={handlePlayTournament}
                                                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-current" /> Play Tournament
                                                    </button>
                                                )}
                                            </div>

                                            <h2 className="text-xl font-black text-slate-900 uppercase italic leading-none mb-1.5">{selectedTournament.title}</h2>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{selectedTournament.description || "No rules or description provided."}</p>
                                        
                                            {/* User's own score card */}
                                            {userEntry ? (
                                                <div className="mt-4 p-3.5 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Award className="w-5 h-5 text-purple-600" />
                                                        <div>
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Your High Score</p>
                                                            <p className="text-base font-black text-purple-700 leading-tight">{userEntry.score.toLocaleString()} points</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Leaderboard Rank</p>
                                                        <p className="text-base font-black text-slate-800 leading-tight">
                                                            #{leaderboard.findIndex((e) => e.user_id === user?.id) + 1}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                        You haven't played in this tournament yet!
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Leaderboard Rankings List */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 no-scrollbar">
                                            {loadingLeaderboard ? (
                                                <div className="flex justify-center py-20">
                                                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                                                </div>
                                            ) : leaderboard.length === 0 ? (
                                                <div className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                                    No submissions yet. Be the first to enter!
                                                </div>
                                            ) : (
                                                leaderboard.map((entry, index) => {
                                                    const name = entry.profile?.full_name || entry.profile?.username || "Gamer";
                                                    const username = entry.profile?.username ? `@${entry.profile.username}` : "Gamer";
                                                    const isMe = entry.user_id === user?.id;

                                                    // Medal colors
                                                    const medalBg = index === 0 
                                                        ? "bg-yellow-50 border border-yellow-200 text-yellow-600 shadow-sm" 
                                                        : index === 1 
                                                            ? "bg-slate-50 border border-slate-200 text-slate-600 shadow-sm"
                                                            : index === 2 
                                                                ? "bg-amber-50 border border-amber-200 text-amber-700 shadow-sm" 
                                                                : "bg-slate-50 border border-slate-200 text-slate-600 shadow-sm";

                                                    return (
                                                        <div
                                                            key={entry.id}
                                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                                isMe 
                                                                    ? "bg-purple-50 border-purple-200" 
                                                                    : "bg-white border-b border-slate-100 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                {/* Rank Badge */}
                                                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm ${medalBg}`}>
                                                                    {index + 1}
                                                                </div>

                                                                {/* User Profile */}
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-black text-white overflow-hidden relative border border-slate-200 shadow-sm">
                                                                        {entry.profile?.avatar_url ? (
                                                                            <img src={entry.profile.avatar_url} alt={name} className="object-cover w-full h-full" />
                                                                        ) : (
                                                                            name[0]?.toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-sm text-slate-800">
                                                                            {name} {isMe && <span className="text-[10px] text-purple-600 font-bold bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-full ml-1">YOU</span>}
                                                                        </h4>
                                                                        <p className="text-[10px] text-slate-500">{username}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                                                                    {entry.score.toLocaleString()}
                                                                </div>
                                                                <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Points</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        <Trophy className="w-10 h-10 text-slate-300 mb-4" />
                                        Select a tournament to inspect leaderboard rankings.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
