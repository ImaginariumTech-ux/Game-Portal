"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import {
    Sparkles, Search, Bell, Wallet, Home, Gamepad2, Users,
    HelpCircle, BarChart3, LogOut, Folder, MapPin, Calendar, Zap, LayoutGrid, ArrowLeft, Star, Play, ExternalLink,
    DoorOpen, Trophy
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

interface Collection {
    id: string;
    name: string;
    description: string;
    image_url: string;
}

interface Game {
    id: string;
    title: string;
    thumbnail_url: string;
    game_url: string;
    avg_rating?: number;
}

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", href: "/dashboard/collections" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", href: "/dashboard" },
    { icon: <Users className="w-4 h-4" />, label: "Friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", href: "/dashboard" },
];

export default function CollectionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const collectionId = params.id as string;

    const [collection, setCollection] = useState<Collection | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [location, setLocation] = useState("");
    const [joinDate, setJoinDate] = useState("");

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }

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

            if (collectionId) {
                const { data: colData } = await supabase
                    .from('collections')
                    .select('*')
                    .eq('id', collectionId)
                    .single();

                if (colData) setCollection(colData);

                const { data: gamesResult, error } = await supabase
                    .from('collection_games')
                    .select(`
                        game_id,
                        games (
                            id,
                            title,
                            thumbnail_url,
                            game_url,
                            game_ratings(rating)
                        )
                    `)
                    .eq('collection_id', collectionId);

                if (gamesResult) {
                    const mappedGames = gamesResult.map((item: any) => {
                        const g = item.games;
                        const ratings = g.game_ratings || [];
                        const total = ratings.length;
                        const sum = ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
                        const avg = total > 0 ? sum / total : 0;
                        return {
                            id: g.id,
                            title: g.title,
                            thumbnail_url: g.thumbnail_url,
                            game_url: g.game_url,
                            avg_rating: avg
                        };
                    });
                    setGames(mappedGames);
                }
            }
            setLoading(false);
        };
        init();
    }, [collectionId, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "G";

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">
            <Sidebar currentActiveId="collections" />

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-12 flex-shrink-0 bg-[#111318] border-b border-white/5 flex items-center px-4 gap-3">
                    <div className="flex items-center gap-2 bg-[#1a1d24] border border-white/5 rounded-full px-3 py-1.5">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white">M</span>
                        </div>
                        <span className="text-sm font-bold text-white">1,022.00</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-gray-500 animate-pulse">Loading collection...</span>
                        </div>
                    ) : !collection ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Folder className="w-16 h-16 text-gray-700" />
                            <p className="text-gray-400">Collection not found</p>
                            <Link href="/dashboard/collections" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                                <ArrowLeft className="w-4 h-4" /> Back to Collections
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <div className="relative h-64 bg-gradient-to-br from-purple-900 via-indigo-900 to-black overflow-hidden shrink-0">
                                {collection.image_url ? (
                                    <Image
                                        src={collection.image_url}
                                        alt={collection.name}
                                        fill
                                        className="object-cover opacity-60"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 opacity-60" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-transparent" />

                                <div className="absolute top-4 left-4 z-10">
                                    <Link
                                        href="/dashboard/collections"
                                        className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full transition-all hover:bg-black/50"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back to Collections
                                    </Link>
                                </div>

                                <div className="absolute bottom-0 left-0 p-8 z-10 w-full max-w-4xl">
                                    <h1 className="text-4xl font-black text-white mb-2 leading-tight drop-shadow-lg">{collection.name}</h1>
                                    <p className="text-gray-200 text-sm max-w-2xl drop-shadow-md">{collection.description}</p>
                                    <div className="mt-4 flex items-center gap-3">
                                        <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold border border-white/20 backdrop-blur-md">
                                            {games.length} Games
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                                    <Gamepad2 className="w-5 h-5 text-purple-400" />
                                    Review Games in this Collection
                                </h2>

                                {games.length === 0 ? (
                                    <div className="py-20 text-center border border-white/5 rounded-2xl bg-white/5">
                                        <p className="text-gray-500">No games in this collection yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {games.map((game) => (
                                            <div
                                                key={game.id}
                                                onClick={() => router.push(`/dashboard/games/${game.id}`)}
                                                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-purple-500/30 transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/10"
                                            >
                                                <div className="h-32 relative bg-black/50">
                                                    {game.thumbnail_url ? (
                                                        <Image src={game.thumbnail_url} alt={game.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Gamepad2 className="w-8 h-8 text-white/20" />
                                                        </div>
                                                    )}

                                                    {game.avg_rating && game.avg_rating > 0 ? (
                                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 z-10">
                                                            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                                                            {game.avg_rating.toFixed(1)}
                                                        </div>
                                                    ) : null}

                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                        <span className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                            <ExternalLink className="w-3 h-3" /> View Details
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="font-bold text-white truncate group-hover:text-purple-300 transition-colors">{game.title}</h3>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
