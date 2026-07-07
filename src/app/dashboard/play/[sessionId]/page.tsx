"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
    ArrowLeft,
    Trophy,
    RotateCcw,
    Loader2,
    Sparkles,
    Smile,
    Gamepad2
} from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

interface Game {
    id: string;
    title: string;
    game_url: string;
}

interface GameSession {
    id: string;
    game_id: string;
    user_id: string;
    mode: string;
    tournament_id: string | null;
    session_token: string;
    status: string;
    score: number | null;
    game?: Game;
}

interface Tournament {
    id: string;
    title: string;
}

export default function GamePlayPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [session, setSession] = useState<GameSession | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Results state
    const [isGameOver, setIsGameOver] = useState(false);
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const [isHighScore, setIsHighScore] = useState(false);
    const [bestScore, setBestScore] = useState<number | null>(null);
    const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
    const [fetchingResults, setFetchingResults] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                // Get auth user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/");
                    return;
                }
                setUserId(user.id);

                // Fetch session details
                const { data: sessionData, error: sessionErr } = await supabase
                    .from("game_sessions")
                    .select(`
                        *,
                        game:games(id, title, game_url)
                    `)
                    .eq("id", sessionId)
                    .maybeSingle();

                if (sessionErr) throw sessionErr;
                if (!sessionData) {
                    setError("Session not found or has expired.");
                    setLoading(false);
                    return;
                }

                setSession(sessionData);

                // If session is linked to tournament, fetch tournament details
                if (sessionData.tournament_id) {
                    const { data: tourData } = await supabase
                        .from("tournaments")
                        .select("id, title")
                        .eq("id", sessionData.tournament_id)
                        .maybeSingle();
                    if (tourData) setTournament(tourData);
                }

                setLoading(false);

                // Setup realtime listener for session updates on game_sessions
                setupRealtimeListener(user.id, sessionData.tournament_id);

            } catch (err: any) {
                console.error("Error loading play session:", err);
                setError(err.message || "Failed to load play session.");
                setLoading(false);
            }
        };

        init();
    }, [sessionId, router]);

    const setupRealtimeListener = (currentUserId: string, tournamentId: string | null) => {
        const channel = supabase
            .channel(`play-session-${sessionId}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "game_sessions",
                filter: `id=eq.${sessionId}`
            }, async (payload) => {
                const updatedSession = payload.new;
                
                if (updatedSession.status === 'completed' && 
                    updatedSession.score !== null && 
                    updatedSession.score !== undefined) {
                    
                    console.log("Match completion detected! Score:", updatedSession.score);
                    await handleMatchFinished(Number(updatedSession.score), currentUserId, tournamentId);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleMatchFinished = async (score: number, currentUserId: string, tournamentId: string | null) => {
        setFinalScore(score);
        setIsGameOver(true);
        setFetchingResults(true);

        if (tournamentId) {
            try {
                // Fetch the tournament leaderboard entries to see where we rank and what our best score is
                const { data: lbEntries, error: lbErr } = await supabase
                    .from("tournament_leaderboard")
                    .select("user_id, high_score")
                    .eq("tournament_id", tournamentId)
                    .order("high_score", { ascending: false });

                if (lbErr) throw lbErr;

                if (lbEntries) {
                    // Find user's best score
                    const userBestEntry = lbEntries.find(e => e.user_id === currentUserId);
                    const best = userBestEntry ? Number(userBestEntry.high_score) : score;
                    setBestScore(best);

                    // Check if the current run score was high enough to be the high score (or matches it)
                    if (score >= best) {
                        setIsHighScore(true);
                    }

                    // Find rank
                    const rank = lbEntries.findIndex(e => e.user_id === currentUserId) + 1;
                    setLeaderboardRank(rank > 0 ? rank : null);
                }
            } catch (err) {
                console.error("Error fetching end match stats:", err);
            }
        }
        setFetchingResults(false);
    };

    const handlePlayAgain = async () => {
        if (!session || !session.game || !userId) return;
        
        try {
            setLoading(true);
            setIsGameOver(false);
            setFinalScore(null);
            setIsHighScore(false);
            setBestScore(null);
            setLeaderboardRank(null);

            // Call session generation API
            const response = await fetch("/api/game/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    gameId: session.game.id,
                    mode: session.mode,
                    tournamentId: session.tournament_id
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || "Failed to start new session");
            }

            // Navigate to new play page
            router.replace(`/dashboard/play/${resData.sessionId}`);
        } catch (err: any) {
            console.error("Error restarting match:", err);
            toast.error(err.message || "Failed to start new match");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 text-slate-900">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                <p className="text-sm text-slate-500">Preparing game session...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen bg-slate-50 flex-col items-center justify-center p-8 text-center text-slate-900">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <Link href="/dashboard" className="text-purple-600 hover:underline text-sm flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>
        );
    }

    if (!session || !session.game) return null;

    const gameUrl = session.game.game_url;
    const separator = gameUrl.includes("?") ? "&" : "?";
    // We send sessionId=sessionId and sessionToken=JWT to ensure compliance
    const finalUrl = `${gameUrl}${separator}sessionId=${sessionId}&sessionToken=${session.session_token}`;

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black text-white font-sans">
            <Toaster />

            {/* Subtle top back-bar */}
            {!isGameOver && (
                <div className="absolute top-4 left-4 z-50 group flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-lg select-none">
                        Playing {session.game.title} {tournament && `(Tournament: ${tournament.title})`}
                    </span>
                </div>
            )}

            {/* Game Iframe */}
            <iframe
                ref={iframeRef}
                src={finalUrl}
                className="w-full h-full border-none"
                allow="autoplay; fullscreen"
            />

            {/* Game Over Results Overlay */}
            {isGameOver && (
                <div className="absolute inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-[40px] shadow-2xl shadow-slate-400/50 p-8 text-center flex flex-col items-center overflow-hidden">
                        {/* Decorative Gradient Glow */}
                        <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />

                        {fetchingResults ? (
                            <div className="py-20 flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Saving results...</p>
                            </div>
                        ) : (
                            <>
                                {/* Icon Header */}
                                {tournament ? (
                                    isHighScore ? (
                                        <div className="w-20 h-20 rounded-[30px] bg-yellow-50 flex items-center justify-center border border-yellow-200/60 mb-6 animate-bounce">
                                            <Sparkles className="w-10 h-10 text-yellow-500 fill-current" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-[30px] bg-purple-50 flex items-center justify-center border border-purple-200/60 mb-6">
                                            <Trophy className="w-10 h-10 text-purple-500" />
                                        </div>
                                    )
                                ) : (
                                    <div className="w-20 h-20 rounded-[30px] bg-blue-50 flex items-center justify-center border border-blue-200/60 mb-6">
                                        <Smile className="w-10 h-10 text-blue-500" />
                                    </div>
                                )}

                                {/* Heading */}
                                <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 mb-2">
                                    {tournament ? (isHighScore ? "New Record!" : "Match Finished!") : "Practice Complete!"}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-6">
                                    {tournament ? `Tournament: ${tournament.title}` : `Training run on ${session.game.title}`}
                                </p>

                                {/* Score Showcase */}
                                <div className="w-full bg-slate-50 border border-slate-200/80 rounded-3xl p-5 mb-8">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Your Score</p>
                                    <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 leading-tight">
                                        {finalScore?.toLocaleString()} pts
                                    </h3>
                                    
                                    {tournament && (
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 mt-4 pt-4">
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Leaderboard Rank</p>
                                                <p className="text-lg font-black text-slate-900 leading-none">
                                                    {leaderboardRank ? `#${leaderboardRank}` : "Unranked"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Personal Best</p>
                                                <p className="text-lg font-black text-slate-900 leading-none">
                                                    {bestScore ? `${bestScore.toLocaleString()} pts` : "-"}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Encouragement text */}
                                {tournament && !isHighScore && (
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 px-4">
                                        You didn't beat your personal best of {bestScore?.toLocaleString()} pts, but keep training!
                                    </p>
                                )}

                                {/* Buttons */}
                                <div className="w-full space-y-3">
                                    <button
                                        onClick={handlePlayAgain}
                                        className="w-full py-4 bg-purple-600 text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-purple-200"
                                    >
                                        <RotateCcw className="w-4 h-4" /> Play Again
                                    </button>

                                    {tournament ? (
                                        <button
                                            onClick={() => router.push("/dashboard/leaderboard")}
                                            className="w-full py-4 bg-purple-50 text-purple-750 border border-purple-200/80 font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-purple-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                        >
                                            <Trophy className="w-4 h-4" /> View Leaderboard
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => router.push(`/dashboard/games/${session.game_id}`)}
                                            className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                        >
                                            <Gamepad2 className="w-4 h-4" /> Game Details
                                        </button>
                                    )}

                                    <button
                                        onClick={() => router.push("/dashboard")}
                                        className="w-full py-3 text-xs text-slate-500 hover:text-slate-800 font-bold uppercase tracking-widest transition-all"
                                    >
                                        Back to Dashboard
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
