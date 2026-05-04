"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Search, MoreVertical, Gamepad2, AlertCircle } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabase/client";

interface Game {
    id: string;
    title: string;
    slug: string;
    description: string;
    status: string;
    thumbnail_url: string;
    game_url?: string; // Add game_url
    version: string;
    created_at: string;
    published_at?: string;
}

export default function GamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            const { data, error } = await supabase
                .from('games')
                .select('*, collection_games(collection:collections(name))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGames(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="games" />

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">Games Library</h1>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs text-gray-400 font-mono">
                            {games.length} Total
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search games..."
                                className="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                            />
                        </div>
                        <Link href="/magicadmins/games/upload">
                            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 text-sm">
                                <Plus className="w-4 h-4" />
                                Install Game
                            </button>
                        </Link>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400 animate-pulse">
                            Loading games...
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-2">
                            <AlertCircle className="w-8 h-8" />
                            <p>Error loading games: {error}</p>
                        </div>
                    ) : games.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                <Gamepad2 className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-lg font-medium">No games found</p>
                            <Link href="/magicadmins/games/upload">
                                <button className="text-purple-400 hover:text-purple-300 hover:underline">
                                    Install your first game
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {games.map((game) => (
                                <GameCard key={game.id} game={game} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function GameCard({ game }: { game: Game & { collection_games?: { collection: { name: string } }[] } }) {
    const isScheduled = game.status === 'published' && game.published_at && new Date(game.published_at) > new Date();
    const displayStatus = isScheduled ? 'scheduled' : game.status;
    const collectionName = game.collection_games?.[0]?.collection?.name;

    return (
        <div className="group relative bg-white/5 border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-all hover:bg-white/10 flex flex-col h-[340px]">
            {/* Thumbnail */}
            <div className="aspect-video relative bg-black/50 shrink-0">
                {game.thumbnail_url ? (
                    <Image
                        src={game.thumbnail_url}
                        alt={game.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                        <Gamepad2 className="w-8 h-8" />
                    </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${displayStatus === 'published' ? 'bg-green-500/20 text-green-400' :
                        displayStatus === 'scheduled' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {displayStatus}
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col flex-1">
                {collectionName && (
                    <div className="mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            {collectionName}
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                        <h3 className="font-bold text-white truncate pr-2" title={game.title}>{game.title}</h3>
                        <p className="text-xs text-gray-400">Ver. {game.version}</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">
                    {game.description || "No description provided."}
                </p>

                <div className="flex gap-2 mt-auto">
                    <Link href={`/magicadmins/games/${game.id}`} className="flex-1">
                        <button className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-center text-xs font-bold transition-colors border border-white/10 hover:border-white/20">
                            Manage Game
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
