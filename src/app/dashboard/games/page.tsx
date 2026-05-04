"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import {
    Search, Gamepad2, Play, Star, TrendingUp, Folder,
    Home, Users, Trophy, DoorOpen, HelpCircle, BarChart3,
    Globe, LogOut, Sparkles, Zap, Bell, Wallet, MapPin,
    Calendar, Hash, Loader2, Heart, ChevronDown
} from "lucide-react";
import Link from "next/link";
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
    collection_games?: { collection_id: string }[];
}

interface Collection {
    id: string;
    name: string;
}

const GRADIENTS = [
    { from: "from-emerald-900 via-green-800 to-teal-900", accent: "#10b981" },
    { from: "from-amber-900 via-orange-800 to-red-900", accent: "#f59e0b" },
    { from: "from-violet-900 via-purple-800 to-indigo-900", accent: "#8b5cf6" },
    { from: "from-blue-900 via-cyan-800 to-sky-900", accent: "#3b82f6" },
    { from: "from-pink-900 via-rose-800 to-red-900", accent: "#ec4899" },
    { from: "from-lime-900 via-green-800 to-emerald-900", accent: "#84cc16" },
];

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", href: "/dashboard" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", href: "/dashboard" },
    { icon: <Users className="w-4 h-4" />, label: "Friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", href: "/dashboard" },
];

export default function GamesPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCollection, setSelectedCollection] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
    const [favourites, setFavourites] = useState<string[]>([]);
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [location, setLocation] = useState("");
    const [joinDate, setJoinDate] = useState("");

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }
            setUser(user);

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

            // Games
            const { data: gamesData } = await supabase
                .from("games")
                .select("id, title, description, thumbnail_url, game_url, plays, version, created_at, featured, collection_games(collection_id)")
                .eq("status", "published")
                .order("plays", { ascending: false });
            setGames(gamesData || []);

            // Collections
            const { data: colData } = await supabase
                .from("collections")
                .select("id, name")
                .order("name");
            setCollections(colData || []);

            // Load favourites from localStorage
            const favs: string[] = JSON.parse(localStorage.getItem("mg_favourites") || "[]");
            setFavourites(favs);

            setLoading(false);
        };
        init();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const filtered = games.filter(g => {
        const matchesSearch = !search || g.title.toLowerCase().includes(search.toLowerCase()) ||
            (g.description || "").toLowerCase().includes(search.toLowerCase());
        const matchesCollection = selectedCollection === "all" ||
            g.collection_games?.some(cg => cg.collection_id === selectedCollection);
        const matchesTab = activeTab === "all" || favourites.includes(g.id);
        return matchesSearch && matchesCollection && matchesTab;
    });

    const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "G";

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
                <main className="flex-1 overflow-y-auto p-6">

                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Gamepad2 className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Games</h1>
                        </div>
                        <p className="text-sm text-gray-400 ml-11">Browse and play all available games on the platform</p>
                    </div>

                    {/* All Games / My Games tabs */}
                    <div className="flex items-center gap-1 bg-[#1a1d24] border border-white/5 rounded-xl p-1 w-fit mb-6">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "all"
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            <Gamepad2 className="w-3.5 h-3.5" /> All Games
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "all" ? "bg-white/20 text-white" : "bg-white/5 text-gray-500"
                                }`}>{games.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("mine")}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "mine"
                                ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            <Heart className={`w-3.5 h-3.5 ${activeTab === "mine" ? "fill-current" : ""}`} /> My Games
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "mine" ? "bg-white/20 text-white" : "bg-white/5 text-gray-500"
                                }`}>{favourites.length}</span>
                        </button>
                    </div>

                    {/* Search + Filter */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search games..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-[#1a1d24] border border-white/10 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                            />
                        </div>

                        {/* Collection Filter Dropdown */}
                        <div className="relative">
                            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            <select
                                value={selectedCollection}
                                onChange={e => setSelectedCollection(e.target.value)}
                                className="appearance-none bg-[#1a1d24] border border-white/10 text-sm text-white rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all cursor-pointer hover:border-white/20"
                            >
                                <option value="all">All Collections</option>
                                {collections.map(col => (
                                    <option key={col.id} value={col.id}>{col.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-5 text-xs text-gray-500">
                        <span><span className="text-white font-semibold">{filtered.length}</span> games found</span>
                        {search && <span>for "<span className="text-purple-400">{search}</span>"</span>}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-center">
                            {activeTab === "mine" ? (
                                <>
                                    <Heart className="w-12 h-12 text-gray-700 mb-3" />
                                    <p className="text-gray-400 font-medium">No favourites yet</p>
                                    <p className="text-gray-600 text-sm mt-1">Open a game and hit the ❤️ button to save it here</p>
                                </>
                            ) : (
                                <>
                                    <Gamepad2 className="w-12 h-12 text-gray-700 mb-3" />
                                    <p className="text-gray-400 font-medium">No games found</p>
                                    <p className="text-gray-600 text-sm mt-1">Try a different search or filter</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Games Grid */}
                    {!loading && filtered.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filtered.map((game, i) => {
                                const grad = GRADIENTS[i % GRADIENTS.length];
                                return (
                                    <Link
                                        key={game.id}
                                        href={`/dashboard/games/${game.id}`}
                                        className="group relative bg-[#1a1d24] rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 cursor-pointer"
                                    >
                                        {/* Thumbnail */}
                                        <div className={`relative h-36 bg-gradient-to-br ${grad.from} overflow-hidden`}>
                                            {game.thumbnail_url ? (
                                                <Image
                                                    src={game.thumbnail_url}
                                                    alt={game.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Gamepad2 className="w-10 h-10 text-white/20" />
                                                </div>
                                            )}
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                                                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                                                </div>
                                            </div>
                                            {/* Featured badge */}
                                            {game.featured && (
                                                <div className="absolute top-2 left-2 flex items-center gap-1 bg-yellow-500/90 backdrop-blur-sm text-black text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                                    <Star className="w-2.5 h-2.5" fill="currentColor" /> FEATURED
                                                </div>
                                            )}
                                            {/* Plays */}
                                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                                <TrendingUp className="w-2.5 h-2.5" />
                                                {(game.plays || 0).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-3">
                                            <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">{game.title}</h3>
                                            {game.description && (
                                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{game.description}</p>
                                            )}
                                            <div className="flex items-center justify-between mt-2">
                                                {game.version && (
                                                    <div className="flex items-center gap-1 text-[9px] text-gray-600">
                                                        <Hash className="w-2.5 h-2.5" /> v{game.version}
                                                    </div>
                                                )}
                                                <div className="ml-auto">
                                                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wide">Play →</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
