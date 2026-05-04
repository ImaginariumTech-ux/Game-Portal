"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import {
    LogOut, Sparkles, Zap, Search, Bell, Wallet, Home,
    Gamepad2, Users, HelpCircle, BarChart3, Globe,
    Trophy, Play, Folder, TrendingUp, UserCheck, UserMinus,
    MapPin, Calendar, Hash, ExternalLink, DoorOpen, Star
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { usePresence } from "@/hooks/usePresence";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Game {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    game_url: string;
    status: string;
    plays: number;
    version: string;
    created_at: string;
    avg_rating?: number;
    total_ratings?: number;
}

interface Collection {
    id: string;
    name: string;
    description: string;
    image_url: string;
}

// ─── Static chat data ──────────────────────────────────────────────────────────

const CHAT_MESSAGES = [
    { user: "DragonSlayer", msg: "Just unlocked a new game! 🔥", time: "2m", color: "#f59e0b" },
    { user: "MoonWizard", msg: "Anyone tried the new collection?", time: "4m", color: "#8b5cf6" },
    { user: "StarLord", msg: "This platform is insane 🎮", time: "6m", color: "#10b981" },
    { user: "JacobClark", msg: "GG everyone, see you at the top!", time: "9m", color: "#3b82f6" },
    { user: "NightOwl", msg: "Just hit a new high score 🎉", time: "12m", color: "#ec4899" },
];

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", id: "home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", id: "games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", id: "collections", href: "/dashboard/collections" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", id: "gameroom", href: null },
    { icon: <Users className="w-4 h-4" />, label: "Friends", id: "friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", id: "leaderboard", href: null },
];

// ─── Gradient palette for game cards (cycles) ──────────────────────────────────

const GRADIENTS = [
    { from: "from-emerald-900 via-green-800 to-teal-900", accent: "#10b981" },
    { from: "from-amber-900 via-orange-800 to-red-900", accent: "#f59e0b" },
    { from: "from-violet-900 via-purple-800 to-indigo-900", accent: "#8b5cf6" },
    { from: "from-blue-900 via-cyan-800 to-sky-900", accent: "#3b82f6" },
    { from: "from-pink-900 via-rose-800 to-red-900", accent: "#ec4899" },
    { from: "from-lime-900 via-green-800 to-emerald-900", accent: "#84cc16" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function UserDashboard() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeNav, setActiveNav] = useState("home");
    const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
    const [activeTab, setActiveTab] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
    const [realFriends, setRealFriends] = useState<any[]>([]);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const router = useRouter();

    // Real-time presence
    const { isOnline, onlineCount } = usePresence(user?.id);
    const onlineFriendsCount = realFriends.filter(f => isOnline(f.friend_id)).length;

    // ── Auth + data fetch ──────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.push("/"); return; }
                setUser(user);

                // Fetch profile for real username/full_name
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("full_name, username, avatar_url, location, created_at")
                    .eq("id", user.id)
                    .maybeSingle();
                if (profileData) setProfile(profileData);

                // Fetch published games WITH RATINGS
                const { data: gamesData, error } = await supabase
                    .from("games")
                    .select(`
                        id, title, description, thumbnail_url, game_url, status, plays, version, created_at,
                        game_ratings(rating)
                    `)
                    .eq("status", "published")
                    .order("plays", { ascending: false });

                if (error) console.error("Error fetching games:", error);

                // Process ratings
                const processedGames = (gamesData || []).map((game: any) => {
                    const ratings = game.game_ratings || [];
                    const totalRatings = ratings.length;
                    const sum = ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
                    const avg = totalRatings > 0 ? sum / totalRatings : 0;
                    return { ...game, avg_rating: avg, total_ratings: totalRatings };
                });

                // Fetch collections
                const { data: colData } = await supabase
                    .from("collections")
                    .select("id, name, description, image_url")
                    .order("created_at", { ascending: false });

                // Fetch featured games
                const { data: featuredData } = await supabase
                    .from("games")
                    .select("id, title, description, thumbnail_url, game_url, status, plays, version, created_at")
                    .eq("status", "published")
                    .eq("featured", true)
                    .order("plays", { ascending: false });

                setGames(processedGames);
                setCollections(colData || []);
                setFeaturedGames(featuredData || []);

                // Fetch real friendships
                const { data: friendsData } = await supabase
                    .from("friendships")
                    .select(`
                        id, status,
                        user:profiles!user_id(id, full_name, username, avatar_url),
                        friend:profiles!friend_id(id, full_name, username, avatar_url)
                    `)
                    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                    .eq("status", "accepted");

                const formatted = (friendsData || []).map((f: any) => {
                    const isMeUser = f.user?.id === user.id;
                    const other = isMeUser ? f.friend : f.user;
                    return { id: f.id, friend_id: other?.id, profiles: other };
                }).filter(f => f.profiles);
                setRealFriends(formatted);

                // Fetch pending invites
                const { data: invitesData } = await supabase
                    .from("room_invites")
                    .select(`
                        id, status, created_at, room_id,
                        room:rooms(id, name, code, status),
                        inviter:profiles!inviter_id(full_name, username, avatar_url)
                    `)
                    .eq("invitee_id", user.id)
                    .eq("status", "pending")
                    .order("created_at", { ascending: false });
                setPendingInvites(invitesData || []);
            } catch {
                router.push("/");
            } finally {
                setLoading(false);
            }
        };
        init();

        const favs = JSON.parse(localStorage.getItem("mg_favourites") || "[]");
        setFavouriteIds(favs);
    }, [router]);

    // Real-time invites listener
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel(`dashboard-invites-${user.id}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "room_invites",
                filter: `invitee_id=eq.${user.id}`,
            }, async (payload) => {
                // Refresh invites
                const { data } = await supabase
                    .from("room_invites")
                    .select(`
                        id, status, created_at, room_id,
                        room:rooms(id, name, code, status),
                        inviter:profiles!inviter_id(full_name, username, avatar_url)
                    `)
                    .eq("invitee_id", user.id)
                    .eq("status", "pending")
                    .order("created_at", { ascending: false });
                setPendingInvites(data || []);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const handleAcceptInvite = async (invite: any) => {
        await supabase.from("room_invites").update({ status: "accepted" }).eq("id", invite.id);
        // Check if already in room
        const { data: existing } = await supabase
            .from("room_players")
            .select("room_id")
            .eq("room_id", invite.room_id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!existing) {
            await supabase.from("room_players").insert({ room_id: invite.room_id, user_id: user.id });
        }
        router.push("/dashboard/gameroom");
    };

    const handleDeclineInvite = async (inviteId: string) => {
        await supabase.from("room_invites").update({ status: "declined" }).eq("id", inviteId);
        setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const handlePlayGame = (game: Game) => {
        if (game.game_url) {
            window.open(game.game_url, "_blank");
        }
    };

    // ── Derived data ───────────────────────────────────────────────────────────
    // Prefer profiles table data over auth metadata
    const displayName = profile?.username || profile?.full_name || user?.user_metadata?.first_name || user?.email?.split("@")[0] || "Adventurer";
    const fullName = profile?.full_name || user?.user_metadata?.full_name || displayName;
    const location = profile?.location || user?.user_metadata?.location;
    const joinDate = (profile?.created_at || user?.created_at)
        ? new Date(profile?.created_at || user?.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : "";

    const filteredGames = games.filter(g => {
        const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const topGames = [...games].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 4);
    const newGames = [...games].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);

    // Top Rated Logic: Rating >= 3, sorted by rating desc
    const topRatedGames = [...games]
        .filter(g => (g.avg_rating || 0) >= 3)
        .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));

    const favouriteGames = games.filter(g => favouriteIds.includes(g.id));

    const displayedGames = activeTab === "TOP" ? topRatedGames : activeTab === "FAV" ? favouriteGames : filteredGames;

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0d0f14] text-white">
                <div className="flex flex-col items-center gap-3">
                    <Sparkles className="w-8 h-8 animate-spin text-purple-500" />
                    <p className="text-sm text-gray-400">Loading your adventure...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#0d0f14] text-white font-sans overflow-hidden">

            {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
            <Sidebar onNavItemClick={setActiveNav} currentActiveId={activeNav} />

            {/* ── Main ────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top Bar */}
                <header className="h-12 flex-shrink-0 bg-[#111318] border-b border-white/5 flex items-center px-4 gap-3">
                    {/* Coins */}
                    <div className="flex items-center gap-2 bg-[#1a1d24] border border-white/5 rounded-full px-3 py-1.5">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white">M</span>
                        </div>
                        <span className="text-sm font-bold text-white">1,022.00</span>
                    </div>

                    <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5">
                        <Wallet className="w-3 h-3" /> Wallet
                    </button>

                    <div className="flex-1" />

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#1a1d24] border border-white/5 rounded-full pl-7 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 w-40"
                            placeholder="Search games..."
                        />
                    </div>

                    {/* Notif */}
                    <button className="relative w-8 h-8 rounded-full bg-[#1a1d24] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                        <Bell className="w-3.5 h-3.5 text-gray-400" />
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                    </button>

                    {/* User */}
                    <div className="flex items-center gap-2 bg-[#1a1d24] border border-white/5 rounded-full pl-1 pr-3 py-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold">
                            {displayName[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-300">{displayName}</span>
                    </div>

                    {/* Logout */}
                    <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-[#1a1d24] border border-white/5 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all group">
                        <LogOut className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-400" />
                    </button>
                </header>

                {/* Content + Chat */}
                <div className="flex-1 flex overflow-hidden">

                    {/* ── Scrollable center ─────────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">

                        {/* Room Invites Alert */}
                        {pendingInvites.length > 0 && (
                            <div className="relative overflow-hidden bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                                <div className="absolute top-0 right-0 p-1 opacity-20"><DoorOpen className="w-16 h-16" /></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center animate-pulse">
                                        <Bell className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-white text-lg">New Room Invite!</h3>
                                        <p className="text-sm text-amber-200/70">
                                            <span className="font-bold text-amber-400">{pendingInvites[0].inviter?.full_name || pendingInvites[0].inviter?.username}</span> invited you to join <span className="text-white font-bold">"{pendingInvites[0].room?.name}"</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAcceptInvite(pendingInvites[0])}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg transition-all"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleDeclineInvite(pendingInvites[0].id)}
                                            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                                {pendingInvites.length > 1 && (
                                    <button
                                        onClick={() => router.push("/dashboard/gameroom")}
                                        className="mt-3 text-[10px] font-bold text-amber-400/80 hover:text-amber-300 flex items-center gap-1 transition-all"
                                    >
                                        See all {pendingInvites.length} invites <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Welcome banner */}
                        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-purple-900/60 via-blue-900/40 to-indigo-900/60 border border-white/10 p-5">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h1 className="text-xl font-black mb-0.5">Welcome back, {displayName}! 👋</h1>
                                    <p className="text-sm text-gray-300">
                                        {games.length > 0
                                            ? `${games.length} game${games.length !== 1 ? "s" : ""} available to play right now`
                                            : "Your adventure awaits — games coming soon!"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-center bg-black/30 rounded-xl px-4 py-2 border border-white/5">
                                        <p className="text-xl font-black text-purple-400">{games.length}</p>
                                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">Games</p>
                                    </div>
                                    <div className="text-center bg-black/30 rounded-xl px-4 py-2 border border-white/5">
                                        <p className="text-xl font-black text-blue-400">{collections.length}</p>
                                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">Collections</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Featured Games ─────────────────────────────────────────── */}
                        {featuredGames.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    <h2 className="font-bold text-sm uppercase tracking-wide">Featured Games</h2>
                                    <span className="ml-auto text-[9px] text-gray-500 font-medium uppercase tracking-wider">Curated by Admin</span>
                                </div>

                                {/* Big hero card — first featured game */}
                                {featuredGames[0] && (
                                    <div className="relative h-52 rounded-2xl overflow-hidden group mb-3">
                                        {featuredGames[0].thumbnail_url ? (
                                            <Image
                                                src={featuredGames[0].thumbnail_url}
                                                alt={featuredGames[0].title}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                        <div className="absolute bottom-0 left-0 p-5 w-2/3">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-[9px] font-bold mb-2 backdrop-blur-md">
                                                <Star className="w-2.5 h-2.5 fill-current" /> Featured
                                            </div>
                                            <h2 className="text-2xl font-black mb-1 leading-tight">{featuredGames[0].title}</h2>
                                            <p className="text-gray-300 text-xs mb-3 line-clamp-2">
                                                {featuredGames[0].description || "No description provided."}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    if (featuredGames[0].game_url) {
                                                        supabase.rpc('increment_game_plays', { p_game_id: featuredGames[0].id });
                                                        window.open(featuredGames[0].game_url, '_blank');
                                                    }
                                                }}
                                                disabled={!featuredGames[0].game_url}
                                                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                                {featuredGames[0].game_url ? 'Play Game' : 'Coming Soon'}
                                            </button>
                                        </div>

                                        {/* Plays badge */}
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1 border border-white/10">
                                            <Zap className="w-2.5 h-2.5 text-yellow-400" />
                                            <span className="text-[9px] font-bold text-white">{(featuredGames[0].plays || 0).toLocaleString()} plays</span>
                                        </div>
                                    </div>
                                )}

                                {/* Additional featured games — small cards */}
                                {featuredGames.length > 1 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {featuredGames.slice(1, 3).map((game, i) => (
                                            <div key={game.id} className="relative h-28 rounded-xl overflow-hidden group cursor-pointer"
                                                onClick={() => { if (game.game_url) { supabase.rpc('increment_game_plays', { p_game_id: game.id }); window.open(game.game_url, '_blank'); } }}
                                            >
                                                {game.thumbnail_url ? (
                                                    <Image src={game.thumbnail_url} alt={game.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                                ) : (
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length].from}`} />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                <div className="absolute bottom-0 left-0 p-3">
                                                    <p className="text-xs font-bold text-white leading-tight">{game.title}</p>
                                                    <p className="text-[8px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Play className="w-2 h-2" />{(game.plays || 0).toLocaleString()} plays
                                                    </p>
                                                </div>
                                                <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Play className="w-3 h-3 text-white fill-white" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}




                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-[#111318] border border-white/5 rounded-xl p-1">
                            {["ALL", "TOP", "FAV"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${activeTab === tab
                                        ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                                        : "text-gray-500 hover:text-gray-300"
                                        }`}
                                >
                                    {tab === "ALL" ? "All Games" : tab === "TOP" ? "🔥 Top Rated" : "⭐ Favourites"}
                                </button>
                            ))}
                        </div>

                        {/* Games grid */}
                        {displayedGames.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                    <Gamepad2 className="w-8 h-8 opacity-40" />
                                </div>
                                <p className="text-sm font-medium">
                                    {searchQuery ? `No games matching "${searchQuery}"` : "No games available yet"}
                                </p>
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="text-xs text-purple-400 hover:text-purple-300">
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-yellow-500" />
                                        <h3 className="font-bold text-sm uppercase tracking-wide">
                                            {activeTab === "TOP" ? "Top Rated Games" : activeTab === "NEW" ? "Newest Games" : "All Games"}
                                        </h3>
                                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                                            {displayedGames.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {displayedGames.map((game, i) => {
                                        const grad = GRADIENTS[i % GRADIENTS.length];
                                        return (
                                            <div
                                                key={game.id}
                                                onClick={() => router.push(`/dashboard/games/${game.id}`)}
                                                className={`relative rounded-xl overflow-hidden border border-white/10 group cursor-pointer transition-all hover:scale-[1.03] hover:border-white/20 bg-gradient-to-br ${grad.from}`}
                                                style={{ boxShadow: `0 4px 20px ${grad.accent}15` }}
                                            >
                                                {/* Thumbnail or gradient placeholder */}
                                                <div className="relative h-28 overflow-hidden">
                                                    {game.thumbnail_url ? (
                                                        <Image
                                                            src={game.thumbnail_url}
                                                            alt={game.title}
                                                            fill
                                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Gamepad2 className="w-10 h-10 opacity-30" />
                                                        </div>
                                                    )}
                                                    {/* Play overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                                            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                                                        </div>
                                                    </div>
                                                    {/* Rating badge if exists */}
                                                    {game.avg_rating && game.avg_rating > 0 && (
                                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 z-10">
                                                            <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                                                            {game.avg_rating.toFixed(1)}
                                                        </div>
                                                    )}

                                                    {/* Plays badge */}
                                                    {(game.plays || 0) > 0 && (
                                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                            <Zap className="w-2 h-2" style={{ color: grad.accent }} />
                                                            {(game.plays || 0).toLocaleString()} plays
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-3">
                                                    <p className="text-xs font-bold text-white truncate mb-0.5">{game.title}</p>
                                                    {game.description && (
                                                        <p className="text-[9px] text-gray-400 line-clamp-2 mb-2">{game.description}</p>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePlayGame(game); }}
                                                        disabled={!game.game_url}
                                                        className="w-full py-1.5 rounded-lg text-[10px] font-black text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                                        style={{ background: `linear-gradient(135deg, ${grad.accent}, ${grad.accent}99)` }}
                                                    >
                                                        {game.game_url ? (
                                                            <><ExternalLink className="w-2.5 h-2.5" /> Play Now</>
                                                        ) : (
                                                            "Coming Soon"
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ── Friends Panel ─────────────────────────────────────────────── */}
                    <aside className="w-52 flex-shrink-0 bg-[#111318] border-l border-white/5 flex flex-col">
                        {/* Header */}
                        <div className="p-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-xs font-bold">Friends</span>
                                {onlineFriendsCount > 0 && (
                                    <span className="ml-auto flex items-center gap-1 bg-green-500/20 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-green-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        {onlineFriendsCount} online
                                    </span>
                                )}
                                {onlineFriendsCount === 0 && (
                                    <span className="ml-auto bg-purple-500/20 text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-purple-500/30">
                                        {realFriends.length} friends
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {realFriends.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600 py-8">
                                    <Users className="w-6 h-6 opacity-30" />
                                    <p className="text-[9px] text-center">Add friends to see them here</p>
                                </div>
                            ) : (
                                realFriends.map((friend) => {
                                    const online = isOnline(friend.friend_id);
                                    const name = friend.profiles?.full_name || friend.profiles?.username || "Gamer";
                                    return (
                                        <div
                                            key={friend.id}
                                            onClick={() => router.push(`/dashboard/gamers/${friend.friend_id}`)}
                                            className="flex items-center gap-2 bg-[#1a1d24] rounded-lg p-2 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-black overflow-hidden relative">
                                                    {friend.profiles?.avatar_url ? (
                                                        <Image src={friend.profiles.avatar_url} alt={name} fill className="object-cover" />
                                                    ) : (
                                                        name[0]?.toUpperCase()
                                                    )}
                                                </div>
                                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1d24] ${online ? "bg-green-500" : "bg-gray-600"
                                                    }`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-bold text-white truncate group-hover:text-purple-300 transition-colors">{name}</p>
                                                <p className={`text-[8px] ${online ? "text-green-400" : "text-gray-500"}`}>
                                                    {online ? "Online" : "Offline"}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add friend link */}
                        <div className="p-2 border-t border-white/5">
                            <button
                                onClick={() => router.push("/dashboard/friends")}
                                className="w-full py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                                <Users className="w-3 h-3" /> Manage Friends
                            </button>
                        </div>
                    </aside>

                </div>
            </div>
        </div>
    );
}
