"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft, Play, Star, TrendingUp, Hash, Calendar,
    Gamepad2, Folder, ExternalLink, Heart, Share2,
    Loader2, Globe, Trophy, Users, Home, DoorOpen,
    HelpCircle, BarChart3, LogOut, Sparkles, Zap, Bell,
    Wallet, MapPin, CheckCircle
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

interface Game {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    game_url: string | null;
    plays: number;
    version: string | null;
    created_at: string;
    featured: boolean;
    status: string;
}

interface Collection {
    id: string;
    name: string;
}

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", href: "/dashboard" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", href: "/dashboard" },
    { icon: <Users className="w-4 h-4" />, label: "Friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", href: "/dashboard" },
];

export default function GameDetailPage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [game, setGame] = useState<Game | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isFavourited, setIsFavourited] = useState(false);
    const [favouriteLoading, setFavouriteLoading] = useState(false);
    const [shared, setShared] = useState(false);

    // Rating state
    const [userRating, setUserRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [avgRating, setAvgRating] = useState<number>(0);
    const [ratingCount, setRatingCount] = useState<number>(0);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingSuccess, setRatingSuccess] = useState(false);

    // Sidebar profile state
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [location, setLocation] = useState("");
    const [joinDate, setJoinDate] = useState("");
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }
            setUserId(user.id);

            // Profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, avatar_url, location, created_at")
                .eq("id", user.id)
                .maybeSingle();
            if (profile) {
                setFullName(profile.full_name || user.email?.split("@")[0] || "Gamer");
                setAvatarUrl(profile.avatar_url);
                setLocation(profile.location || "");
                setJoinDate(profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");
            }

            // Game
            const { data: gameData, error } = await supabase
                .from("games")
                .select("id, title, description, thumbnail_url, game_url, plays, version, created_at, featured, status, collection_games(collection_id, collections(id, name))")
                .eq("id", gameId)
                .eq("status", "published")
                .single();

            if (error || !gameData) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            setGame(gameData);

            // Extract collections
            const cols = (gameData as any).collection_games
                ?.map((cg: any) => cg.collections)
                .filter(Boolean) || [];
            setCollections(cols);

            // Check if favourited (using localStorage for now)
            const favs = JSON.parse(localStorage.getItem("mg_favourites") || "[]");
            setIsFavourited(favs.includes(gameId));

            // Fetch ratings
            const { data: ratingsData } = await supabase
                .from("game_ratings")
                .select("rating, user_id")
                .eq("game_id", gameId);

            if (ratingsData && ratingsData.length > 0) {
                const total = ratingsData.reduce((sum, r) => sum + r.rating, 0);
                setAvgRating(parseFloat((total / ratingsData.length).toFixed(1)));
                setRatingCount(ratingsData.length);
                const mine = ratingsData.find(r => r.user_id === user.id);
                if (mine) setUserRating(mine.rating);
            }

            setLoading(false);
        };
        init();
    }, [gameId, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const toggleFavourite = async () => {
        setFavouriteLoading(true);
        const favs: string[] = JSON.parse(localStorage.getItem("mg_favourites") || "[]");
        let newFavs: string[];
        if (isFavourited) {
            newFavs = favs.filter(id => id !== gameId);
        } else {
            newFavs = [...favs, gameId];
        }
        localStorage.setItem("mg_favourites", JSON.stringify(newFavs));
        setIsFavourited(!isFavourited);
        setFavouriteLoading(false);
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href).catch(() => { });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
    };

    const handlePlay = async () => {
        if (!game?.game_url) return;
        // Increment play count
        await supabase.from("games").update({ plays: (game.plays || 0) + 1 }).eq("id", gameId);
        window.open(game.game_url, "_blank");
    };

    const submitRating = async (stars: number) => {
        if (!userId || ratingSubmitting) return;
        setRatingSubmitting(true);
        setUserRating(stars);
        // Upsert rating
        await supabase.from("game_ratings").upsert(
            { game_id: gameId, user_id: userId, rating: stars },
            { onConflict: "game_id,user_id" }
        );
        // Refresh aggregate
        const { data: ratingsData } = await supabase
            .from("game_ratings")
            .select("rating")
            .eq("game_id", gameId);
        if (ratingsData && ratingsData.length > 0) {
            const total = ratingsData.reduce((sum, r) => sum + r.rating, 0);
            setAvgRating(parseFloat((total / ratingsData.length).toFixed(1)));
            setRatingCount(ratingsData.length);
        }
        setRatingSubmitting(false);
        setRatingSuccess(true);
        setTimeout(() => setRatingSuccess(false), 2000);
    };

    const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "G";

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0d0f14] items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="flex h-screen bg-[#0d0f14] items-center justify-center flex-col gap-4">
                <Gamepad2 className="w-16 h-16 text-gray-700" />
                <p className="text-gray-400 text-lg font-semibold">Game not found</p>
                <Link href="/dashboard/games" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Games
                </Link>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">

            {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
            <Sidebar currentActiveId="games" />

            {/* ── Main ─────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-12 flex-shrink-0 bg-[#111318] border-b border-white/5 flex items-center px-4 gap-3">
                    <div className="flex items-center gap-2 bg-[#1a1d24] border border-white/5 rounded-full px-3 py-1.5">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white">M</span>
                        </div>
                        <span className="text-sm font-bold text-white">1,022.00</span>
                    </div>
                    <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5">
                        <Wallet className="w-3 h-3" /> Wallet
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto">
                    {game && (
                        <>
                            {/* Hero Banner */}
                            <div className="relative h-64 bg-gradient-to-br from-purple-900 via-indigo-900 to-black overflow-hidden">
                                {game.thumbnail_url && (
                                    <Image
                                        src={game.thumbnail_url}
                                        alt={game.title}
                                        fill
                                        className="object-cover opacity-40"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-transparent" />

                                {/* Back button */}
                                <div className="absolute top-4 left-4">
                                    <Link
                                        href="/dashboard/games"
                                        className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full transition-all hover:bg-black/50"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back to Games
                                    </Link>
                                </div>

                                {/* Featured badge */}
                                {game.featured && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-yellow-500/90 backdrop-blur-sm text-black text-xs font-black px-2.5 py-1 rounded-full">
                                        <Star className="w-3 h-3" fill="currentColor" /> FEATURED
                                    </div>
                                )}
                            </div>

                            {/* Game Info */}
                            <div className="px-6 pb-6 -mt-16 relative z-10">
                                <div className="flex items-end gap-5 mb-6">
                                    {/* Thumbnail card */}
                                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-[#0d0f14] bg-gradient-to-br from-purple-900 to-indigo-900 flex-shrink-0 shadow-2xl">
                                        {game.thumbnail_url ? (
                                            <Image src={game.thumbnail_url} alt={game.title} width={112} height={112} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Gamepad2 className="w-10 h-10 text-white/30" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Title + actions */}
                                    <div className="flex-1 min-w-0 pb-1">
                                        <h1 className="text-2xl font-black text-white mb-1 leading-tight">{game.title}</h1>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {collections.map(col => (
                                                <span key={col.id} className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                                                    <Folder className="w-3 h-3" /> {col.name}
                                                </span>
                                            ))}
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <TrendingUp className="w-3 h-3" /> {(game.plays || 0).toLocaleString()} plays
                                            </span>
                                            {game.version && (
                                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                                    <Hash className="w-3 h-3" /> v{game.version}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 pb-1 flex-shrink-0">
                                        <button
                                            onClick={toggleFavourite}
                                            disabled={favouriteLoading}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isFavourited
                                                ? "bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30"
                                                : "bg-white/5 text-gray-400 border-white/10 hover:border-pink-500/30 hover:text-pink-400"
                                                }`}
                                        >
                                            <Heart className={`w-4 h-4 ${isFavourited ? "fill-current" : ""}`} />
                                            {isFavourited ? "Saved" : "Favourite"}
                                        </button>
                                        <button
                                            onClick={handleShare}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
                                        >
                                            {shared ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                                            {shared ? "Copied!" : "Share"}
                                        </button>
                                        {game.game_url && (
                                            <button
                                                onClick={handlePlay}
                                                className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50 hover:scale-105"
                                            >
                                                <Play className="w-4 h-4" fill="white" /> Play Now
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Details grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Description */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <div className="bg-[#1a1d24] rounded-2xl p-5 border border-white/5">
                                            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-purple-400" /> About This Game
                                            </h2>
                                            {game.description ? (
                                                <p className="text-sm text-gray-400 leading-relaxed">{game.description}</p>
                                            ) : (
                                                <p className="text-sm text-gray-600 italic">No description available.</p>
                                            )}
                                        </div>

                                        {/* Play button (large, if game_url exists) */}
                                        {game.game_url && (
                                            <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-2xl p-5 border border-purple-500/20 flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-bold mb-0.5">Ready to play?</p>
                                                    <p className="text-xs text-gray-400">Click play to launch the game in a new tab</p>
                                                </div>
                                                <button
                                                    onClick={handlePlay}
                                                    className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50 hover:scale-105"
                                                >
                                                    <Play className="w-5 h-5" fill="white" /> Launch Game
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats sidebar */}
                                    <div className="space-y-3">
                                        <div className="bg-[#1a1d24] rounded-2xl p-5 border border-white/5">
                                            <h2 className="text-sm font-bold text-white mb-4">Game Info</h2>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Total Plays</span>
                                                    <span className="text-sm font-bold text-white">{(game.plays || 0).toLocaleString()}</span>
                                                </div>
                                                {game.version && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Version</span>
                                                        <span className="text-sm font-bold text-white">v{game.version}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Added</span>
                                                    <span className="text-sm font-bold text-white">
                                                        {new Date(game.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </span>
                                                </div>
                                                {game.featured && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Status</span>
                                                        <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">⭐ Featured</span>
                                                    </div>
                                                )}
                                                {collections.length > 0 && (
                                                    <div>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1.5 mb-2"><Folder className="w-3.5 h-3.5" /> Collections</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {collections.map(col => (
                                                                <span key={col.id} className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                                                    {col.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Favourite card */}
                                        <div className="bg-[#1a1d24] rounded-2xl p-5 border border-white/5">
                                            <h2 className="text-sm font-bold text-white mb-3">Your Actions</h2>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={toggleFavourite}
                                                    className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${isFavourited
                                                        ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                                                        : "bg-white/5 text-gray-400 border-white/10 hover:border-pink-500/30 hover:text-pink-400"
                                                        }`}
                                                >
                                                    <Heart className={`w-4 h-4 ${isFavourited ? "fill-current" : ""}`} />
                                                    {isFavourited ? "Remove from Favourites" : "Add to Favourites"}
                                                </button>
                                                <button
                                                    onClick={handleShare}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
                                                >
                                                    {shared ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                                                    {shared ? "Link Copied!" : "Share Game"}
                                                </button>
                                                {game.game_url && (
                                                    <button
                                                        onClick={handlePlay}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition-all"
                                                    >
                                                        <ExternalLink className="w-4 h-4" /> Open Game
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Star Rating card */}
                                        <div className="bg-[#1a1d24] rounded-2xl p-5 border border-white/5">
                                            <h2 className="text-sm font-bold text-white mb-1">Rate This Game</h2>
                                            {/* Aggregate */}
                                            {ratingCount > 0 && (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-bold text-yellow-400">{avgRating}</span>
                                                    <span className="text-xs text-gray-500">({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})</span>
                                                </div>
                                            )}
                                            {/* Interactive stars */}
                                            <div className="flex gap-1 mb-3">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        disabled={ratingSubmitting}
                                                        onClick={() => submitRating(star)}
                                                        onMouseEnter={() => setHoverRating(star)}
                                                        onMouseLeave={() => setHoverRating(0)}
                                                        className="transition-transform hover:scale-125 disabled:cursor-not-allowed"
                                                    >
                                                        <Star
                                                            className={`w-7 h-7 transition-colors ${star <= (hoverRating || userRating)
                                                                ? "text-yellow-400 fill-yellow-400"
                                                                : "text-gray-600 hover:text-yellow-400"
                                                                }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            {ratingSuccess && (
                                                <p className="text-xs text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Rating saved!
                                                </p>
                                            )}
                                            {!ratingSuccess && userRating > 0 && (
                                                <p className="text-xs text-gray-500">Your rating: {userRating} star{userRating !== 1 ? "s" : ""}</p>
                                            )}
                                            {!ratingSuccess && userRating === 0 && (
                                                <p className="text-xs text-gray-600">Click a star to rate</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
