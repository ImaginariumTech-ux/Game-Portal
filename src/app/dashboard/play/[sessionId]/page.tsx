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
    const isGameOverRef = useRef(false);
    const restartAckReceivedRef = useRef(false);
    const hasTriggeredHighScoreAlertRef = useRef(false);

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
    const [showMidGameAlert, setShowMidGameAlert] = useState(false);
    const [restarting, setRestarting] = useState(false);

    // Listen for direct HTML5 window postMessage notifications from the game iframe
    useEffect(() => {
        if (!userId) return;

        const handleMessage = async (event: MessageEvent) => {
            let data = event.data;
            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch {
                    // Ignore non-JSON strings
                }
            }

            if (data) {
                if (data.type) {
                    console.log("Portal message received from iframe. Event type:", data.type, "payload:", data);
                }
                if (data.type === "MATCH_COMPLETE") {
                    const score = Number(data.score);
                    if (!isGameOverRef.current) {
                        await handleMatchFinished(score, userId, session?.tournament_id || null);
                    }
                } else if (data.type === "REQUEST_RESTART") {
                    console.log("Portal received REQUEST_RESTART message from game iframe.");
                    await handlePlayAgain();
                } else if (data.type === "SESSION_UPDATED") {
                    const newSessionId = data.sessionId;
                    if (newSessionId) {
                        console.log("Portal received SESSION_UPDATED message from game iframe. New sessionId:", newSessionId);
                        const newPath = `/dashboard/play/${newSessionId}`;
                        setSession(prev => prev ? { ...prev, id: newSessionId, status: 'in_progress', score: null } : null);
                        window.history.replaceState(null, '', newPath);
                        isGameOverRef.current = false;
                        setIsGameOver(false);
                        setFinalScore(null);
                        setIsHighScore(false);
                        setBestScore(null);
                        setLeaderboardRank(null);
                        hasTriggeredHighScoreAlertRef.current = false;
                    }
                } else if (data.type === "RESTART_ACK") {
                    restartAckReceivedRef.current = true;
                } else if (data.type === "SCORE_UPDATE") {
                    const currentScore = Number(data.score);
                    if (!isNaN(currentScore) && bestScore !== null && bestScore > 0 && currentScore > bestScore) {
                        if (!hasTriggeredHighScoreAlertRef.current) {
                            hasTriggeredHighScoreAlertRef.current = true;
                            setShowMidGameAlert(true);
                            setTimeout(() => {
                                setShowMidGameAlert(false);
                            }, 3000);
                        }
                        setBestScore(currentScore);
                    }
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [userId, session, bestScore]);

    useEffect(() => {
        let cleanupRealtime: (() => void) | null = null;
        let pollInterval: NodeJS.Timeout | null = null;

        const init = async () => {
            try {
                hasTriggeredHighScoreAlertRef.current = false;
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

                // If the session is already completed in the database, show results directly
                if (sessionData.status === 'completed' && sessionData.score !== null) {
                    setLoading(false);
                    await handleMatchFinished(Number(sessionData.score), user.id, sessionData.tournament_id);
                    return;
                }

                setLoading(false);

                // 1. Setup realtime listener for session updates on game_sessions
                cleanupRealtime = setupRealtimeListener(user.id, sessionData.tournament_id);

                // 2. Setup polling fallback (runs every 2.5s) to guarantee updates if Realtime is not active on DB
                pollInterval = setInterval(async () => {
                    if (isGameOverRef.current) {
                        if (pollInterval) clearInterval(pollInterval);
                        return;
                    }

                    const { data: currentSession } = await supabase
                        .from("game_sessions")
                        .select("status, score")
                        .eq("id", sessionId)
                        .maybeSingle();

                    if (currentSession && currentSession.status === 'completed' && currentSession.score !== null) {
                        if (pollInterval) clearInterval(pollInterval);
                        await handleMatchFinished(Number(currentSession.score), user.id, sessionData.tournament_id);
                    }
                }, 2500);

            } catch (err: any) {
                console.error("Error loading play session:", err);
                setError(err.message || "Failed to load play session.");
                setLoading(false);
            }
        };

        init();

        return () => {
            if (cleanupRealtime) cleanupRealtime();
            if (pollInterval) clearInterval(pollInterval);
        };
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
                    
                    await handleMatchFinished(Number(updatedSession.score), currentUserId, tournamentId);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleMatchFinished = async (score: number, currentUserId: string, tournamentId: string | null) => {
        if (isGameOverRef.current) return;
        isGameOverRef.current = true;

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
        } else {
            try {
                // Fetch the game_id from the database for this session to make the query self-contained
                const { data: curSession, error: curErr } = await supabase
                    .from("game_sessions")
                    .select("game_id")
                    .eq("id", sessionId)
                    .single();

                if (curErr) throw curErr;
                if (!curSession) throw new Error("Active session not found in database");

                // Practice mode stats: query previous completed practice sessions for this user and game
                const { data: prevSessions, error: sErr } = await supabase
                    .from("game_sessions")
                    .select("score")
                    .eq("game_id", curSession.game_id)
                    .eq("user_id", currentUserId)
                    .eq("mode", "practice")
                    .eq("status", "completed")
                    .neq("id", sessionId);

                if (sErr) throw sErr;

                const scores = prevSessions ? prevSessions.map(s => Number(s.score || 0)) : [];
                const maxPrevScore = scores.length > 0 ? Math.max(...scores) : 0;

                setBestScore(Math.max(maxPrevScore, score));
                
                if (scores.length > 0) {
                    if (score > maxPrevScore) {
                        setIsHighScore(true);
                    }
                } else {
                    if (score > 0) {
                        setIsHighScore(true);
                    }
                }
            } catch (err) {
                console.error("Error fetching practice stats:", err);
            }
        }
        setFetchingResults(false);
    };

    const handlePlayAgain = async () => {
        if (!session || !session.game || !userId) return;
        
        try {
            setRestarting(true);
            isGameOverRef.current = false;
            setFinalScore(null);
            setIsHighScore(false);
            setBestScore(null);
            setLeaderboardRank(null);

            // 1. Fetch new session from backend
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

            const newSessionId = resData.sessionId;
            const newPath = `/dashboard/play/${newSessionId}`;

            // Reset ACK ref before sending message
            restartAckReceivedRef.current = false;
            hasTriggeredHighScoreAlertRef.current = false;

            // Hide overlay and allow iframe interaction
            setIsGameOver(false);
            setRestarting(false);

            // 2. Try the fast restart path: send postMessage to iframe
            const iframeEl = document.getElementById("game-iframe") as HTMLIFrameElement;
            const targetWindow = iframeEl?.contentWindow || iframeRef.current?.contentWindow;

            if (targetWindow) {
                console.log("Portal posting RESTART_GAME signal to game iframe. sessionId:", newSessionId);
                targetWindow.postMessage({
                    type: "RESTART_GAME",
                    sessionId: newSessionId
                }, "*");
            } else {
                console.error("Portal Error: Game iframe window not found via ref or document ID!");
            }

            // 3. Start a 500ms fallback timeout
            setTimeout(async () => {
                console.log("Portal 500ms timeout check. restartAckReceived =", restartAckReceivedRef.current);
                if (restartAckReceivedRef.current) {
                    console.log("Portal fast restart flow successful! Replacing URL bar silently.");
                    // Success! Game supports fast restart.
                    // Update React state and silently replace URL in address bar without reloading iframe
                    setSession(prev => prev ? { ...prev, id: newSessionId, status: 'in_progress', score: null } : null);
                    window.history.replaceState(null, '', newPath);
                } else {
                    console.warn("Portal fast restart timed out. Doing fallback full reload of the game iframe... (TEMPORARILY DISABLED FOR TESTING)");
                    // Fallback: Game does not support fast restart. Reload iframe.
                    // router.replace(newPath);
                }
            }, 500);

        } catch (err: any) {
            console.error("Error restarting match:", err);
            toast.error(err.message || "Failed to start new match");
            setRestarting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
                {/* Top header skeleton */}
                <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
                        <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
                {/* Immersive Game canvas skeleton placeholder */}
                <div className="flex-grow p-4 md:p-8 flex items-center justify-center">
                    <div className="w-full max-w-4xl aspect-[4/3] max-h-[80vh] bg-slate-200/80 rounded-3xl animate-pulse shadow-md flex flex-col items-center justify-center gap-3">
                        <Gamepad2 className="w-12 h-12 text-slate-300 animate-bounce" />
                        <p className="text-sm font-semibold text-slate-400">Preparing game session...</p>
                    </div>
                </div>
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

    const gameUrl = (session.game.game_url || "").trim();
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
                id="game-iframe"
                src={finalUrl}
                className="w-full h-full border-none"
                allow="autoplay; fullscreen"
            />

            {/* Mid-Game High Score Alert Pop-Up */}
            {showMidGameAlert && (
                <div className="absolute inset-0 pointer-events-none z-[999] flex items-center justify-center animate-in zoom-in-75 fade-in duration-500">
                    <div className="flex flex-col items-center animate-bounce">
                        <img
                            src="/ChatGPT Image Jul 8, 2026, 11_57_12 AM.png"
                            alt="NEW RECORD!"
                            className="w-44 sm:w-52 object-contain drop-shadow-[0_10px_25px_rgba(168,85,247,0.6)]"
                        />
                        <div className="bg-purple-600/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-purple-400 text-white text-[10px] font-black uppercase tracking-widest shadow-lg -mt-3 shadow-purple-500/20">
                            New High Score!
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Results Overlay (Commented out to allow the WebGL game to handle the results/restart flow) */}
            {/*
            {isGameOver && (
                <div className="absolute inset-0 z-[1000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {fetchingResults ? (
                        <div className="flex flex-col items-center gap-4 text-center text-white">
                            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                            <p className="text-xs text-purple-300 uppercase font-black tracking-widest">Saving results...</p>
                        </div>
                    ) : (
                        <div 
                            className="relative w-full max-w-[350px] h-[90vh] max-h-[640px] rounded-[40px] shadow-2xl border border-white/10 flex flex-col justify-end p-6 overflow-hidden bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: "url('/Logo_text__CAUGHT!__collision_2K_202607081133.jpeg')" }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                            <div className="relative z-10 w-full flex flex-col items-center">
                                {isHighScore && (
                                    <img
                                        src="/ChatGPT%20Image%20Jul%208,%202026,%2011_57_12%20AM.png"
                                        alt="NEW RECORD!"
                                        className="w-full max-w-[150px] sm:max-w-[185px] object-contain mb-4 animate-bounce duration-1000"
                                    />
                                )}

                                <div className="w-full bg-white rounded-[26px] shadow-xl p-5 text-center text-slate-800 mb-6">
                                    <div className="grid grid-cols-3 gap-1 divide-x divide-slate-100">
                                        <div className="flex flex-col items-center justify-between min-h-[44px] px-1">
                                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-tight">
                                                YOUR<br />SCORE
                                            </span>
                                            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 leading-none">
                                                {finalScore ?? 0}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center justify-between min-h-[44px] px-1">
                                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-tight">
                                                LEADERBOARD<br />RANK
                                            </span>
                                            <span className="text-xl sm:text-2xl font-black text-[#b81d6c] mt-1 leading-none">
                                                {tournament ? (leaderboardRank ? leaderboardRank : "-") : "N/A"}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center justify-between min-h-[44px] px-1">
                                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-tight">
                                                PERSONAL<br />BEST
                                            </span>
                                            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 leading-none">
                                                {bestScore ?? finalScore ?? 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full">
                                    <button
                                        onClick={handlePlayAgain}
                                        disabled={restarting}
                                        className="w-full py-4 bg-gradient-to-r from-[#941db4] to-[#d61e80] hover:from-[#aa26cf] hover:to-[#eb2791] text-white font-black text-xs tracking-widest uppercase rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-purple-950/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {restarting ? (
                                            <>
                                                RESTARTING... <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                            </>
                                        ) : (
                                            <>
                                                PLAY AGAIN <RotateCcw className="w-4 h-4 stroke-[3]" />
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (session.tournament_id) {
                                                router.push(`/dashboard/leaderboard/${session.tournament_id}`);
                                            } else {
                                                router.push("/dashboard");
                                            }
                                        }}
                                        className="w-full py-4 bg-transparent border-2 border-white/40 hover:border-white hover:bg-white/5 text-white font-black text-xs tracking-widest uppercase rounded-full transition-all active:scale-[0.98] cursor-pointer text-center"
                                    >
                                        BACK TO PORTAL
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            */}
        </div>
    );
}
