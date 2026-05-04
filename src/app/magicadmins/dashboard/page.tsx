"use client";

// Trigger rebuild

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    Bell,
    Settings,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    Star,
    Gamepad2,
    Users,
    Activity
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabase/client";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalGames: 0,
        totalPlays: 0,
        activeCollections: 0
    });
    const [featuredGame, setFeaturedGame] = useState<any>(null);
    const [recentGames, setRecentGames] = useState<any[]>([]);
    const [recentUploads, setRecentUploads] = useState<any[]>([]);
    const [adminProfile, setAdminProfile] = useState<{ full_name: string; email: string } | null>(null);
    const router = useRouter();


    const [collections, setCollections] = useState<any[]>([]);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                // 0. Fetch logged-in admin profile
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, email')
                        .eq('id', session.user.id)
                        .single();
                    setAdminProfile({
                        full_name: profile?.full_name || session.user.email?.split('@')[0] || 'Admin',
                        email: profile?.email || session.user.email || '',
                    });
                }

                // 1. Fetch Counts
                const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
                const { count: gameCount } = await supabase.from('games').select('*', { count: 'exact', head: true });
                const { count: collectionCount } = await supabase.from('collections').select('*', { count: 'exact', head: true });

                // 2. Fetch Total Plays
                const { data: playsData } = await supabase.from('games').select('plays');
                const totalPlays = playsData?.reduce((sum, game) => sum + (game.plays || 0), 0) || 0;

                setStats({
                    totalUsers: userCount || 0,
                    totalGames: gameCount || 0,
                    totalPlays,
                    activeCollections: collectionCount || 0
                });

                // 3. Fetch hero game (most recent)
                const { data: games } = await supabase.from('games').select('*').order('created_at', { ascending: false }).limit(4);
                if (games && games.length > 0) {
                    setFeaturedGame(games[0]);          // most recently added
                    setRecentGames(games.slice(1, 4));  // next up to 3
                }

                // 3b. Fetch recent uploads independently (always 3, regardless of hero)
                const { data: uploads } = await supabase.from('games').select('*').order('created_at', { ascending: false }).limit(3);
                if (uploads) setRecentUploads(uploads);

                // 4. Fetch Collections for Right Panel
                const { data: cols } = await supabase.from('collections').select('*').order('created_at', { ascending: false }).limit(5);
                if (cols) setCollections(cols);

            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
    }, []);


    // Helper to calculate "time ago" (simplified)
    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 3600) return 'Just now';
        if (seconds < 86400) return 'Today';
        return date.toLocaleDateString();
    };

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            {/* Sidebar */}
            <AdminSidebar activeItem="dashboard" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    {/* Header content removed per request */}
                    <div></div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white/5 rounded-full p-1 pr-4 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center text-xs font-bold">
                                {adminProfile
                                    ? adminProfile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                    : '...'}
                            </div>
                            <div className="text-xs text-left">
                                <div className="font-bold">{adminProfile?.full_name || '...'}</div>
                                <div className="text-gray-400">{adminProfile?.email || ''}</div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">

                    {/* Stats Overview */}
                    <div className="grid grid-cols-4 gap-6 mb-8">
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Users</p>
                                <h3 className="text-2xl font-bold">{stats.totalUsers}</h3>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                                <Gamepad2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Games</p>
                                <h3 className="text-2xl font-bold">{stats.totalGames}</h3>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Plays</p>
                                <h3 className="text-2xl font-bold">{stats.totalPlays.toLocaleString()}</h3>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-400">
                                <Star className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Collections</p>
                                <h3 className="text-2xl font-bold">{stats.activeCollections}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8">
                        {/* Hero & Game List */}
                        <div className="col-span-8 flex flex-col gap-8">

                            {/* Featured Game (Most Recent) */}
                            {featuredGame ? (
                                <div className="relative h-80 rounded-3xl overflow-hidden group">
                                    {featuredGame.thumbnail_url ? (
                                        <Image
                                            src={featuredGame.thumbnail_url}
                                            alt={featuredGame.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-blue-900" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent" />

                                    <div className="absolute bottom-0 left-0 p-8 w-2/3">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold mb-4 backdrop-blur-md">
                                            <Star className="w-3 h-3 fill-current" /> Newest Arrival
                                        </div>
                                        <h2 className="text-4xl font-bold mb-2 leading-tight">{featuredGame.title}</h2>
                                        <p className="text-gray-300 text-sm mb-6 line-clamp-2">
                                            {featuredGame.description || "No description provided."}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => router.push(`/magicadmins/games/${featuredGame.id}`)}
                                                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5"
                                            >
                                                Manage Game
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-80 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                                    No games found.
                                </div>
                            )}

                            {/* Recent Games List */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold">Recent Uploads</h3>
                                    <button
                                        onClick={() => router.push('/magicadmins/games')}
                                        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                    >
                                        View All <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {recentUploads.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        {recentUploads.map((game) => (
                                            <GameCard
                                                key={game.id}
                                                game={game}
                                                onClick={() => router.push(`/magicadmins/games/${game.id}`)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No games uploaded yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Collections */}
                        <div className="col-span-4 flex flex-col gap-6">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 h-full">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-400" />
                                    Active Collections
                                </h3>
                                <div className="space-y-4">
                                    {collections.length > 0 ? (
                                        collections.map((collection) => (
                                            <div
                                                key={collection.id}
                                                onClick={() => router.push(`/magicadmins/collections/${collection.id}`)}
                                                className="group p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-300">
                                                        <Gamepad2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">{collection.title}</h4>
                                                        <p className="text-xs text-gray-500">View Collection</p>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 text-sm">
                                            No collections found.
                                            <button
                                                onClick={() => router.push('/magicadmins/games/upload')}
                                                className="block mx-auto mt-2 text-blue-400 hover:text-blue-300"
                                            >
                                                Create one?
                                            </button>
                                        </div>
                                    )}

                                    <hr className="border-white/10 my-6" />

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-300 mb-4">Quick Actions</h4>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => router.push('/magicadmins/games/upload')}
                                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-left px-4 text-sm font-medium text-gray-300 hover:text-white transition-all border border-white/5 flex items-center justify-between group"
                                            >
                                                Upload New Game
                                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                                            </button>
                                            <button
                                                onClick={() => router.push('/magicadmins/api-keys')}
                                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-left px-4 text-sm font-medium text-gray-300 hover:text-white transition-all border border-white/5 flex items-center justify-between group"
                                            >
                                                Manage API Keys
                                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Subcomponents

function GameCard({ game, onClick }: any) {
    return (
        <div onClick={onClick} className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer border border-white/5 hover:border-white/20 transition-all">
            {/* Placeholder Image */}
            {game.thumbnail_url ? (
                <Image
                    src={game.thumbnail_url}
                    alt={game.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br from-purple-900/40 to-gray-900/90 z-0`}></div>
            )}

            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />

            <div className="absolute top-3 right-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-[10px] font-bold border border-white/10">
                <Gamepad2 className="w-3 h-3" /> {(game.plays || 0).toLocaleString()} Plays
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
                <h4 className="font-bold text-sm leading-tight mb-2 drop-shadow-md line-clamp-2">{game.title}</h4>
                <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] backdrop-blur-sm ${game.status === 'published' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                        {game.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-gray-300 backdrop-blur-sm">v{game.version}</span>
                </div>
            </div>
        </div>
    )
}

function LibraryItem({ title, tags, status }: any) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-800 overflow-hidden relative shadow-lg">
                    {/* <Image ... /> */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                </div>
                <div>
                    <h4 className="font-bold text-sm mb-1 group-hover:text-pink-400 transition-colors">{title}</h4>
                    <div className="flex gap-2">
                        {tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            <button className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${status === 'downloading' ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}>
                <Download className="w-4 h-4" />
            </button>
        </div>
    )
}
