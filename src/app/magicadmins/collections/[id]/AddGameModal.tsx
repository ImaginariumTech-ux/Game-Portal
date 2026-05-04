"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X, Search, CheckCircle, Circle, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Game {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
}

interface AddGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    collectionId: string;
    currentGameIds: string[];
    onSuccess: () => void;
}

export default function AddGameModal({ isOpen, onClose, collectionId, currentGameIds, onSuccess }: AddGameModalProps) {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGames, setSelectedGames] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchGames();
            setSelectedGames([]);
        }
    }, [isOpen]);

    const fetchGames = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('games')
            .select('id, title, description, thumbnail_url')
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setGames(data);
        }
        setLoading(false);
    };

    const toggleSelection = (gameId: string) => {
        setSelectedGames(prev =>
            prev.includes(gameId)
                ? prev.filter(id => id !== gameId)
                : [...prev, gameId]
        );
    };

    const handleAddGames = async () => {
        if (selectedGames.length === 0) return;
        setSaving(true);

        const inserts = selectedGames.map(gameId => ({
            collection_id: collectionId,
            game_id: gameId
        }));

        const { error } = await supabase
            .from('collection_games')
            .insert(inserts);

        setSaving(false);

        if (error) {
            console.error("Error adding games:", error);
            alert("Failed to add games. Please try again.");
        } else {
            onSuccess();
            onClose();
        }
    };

    // Filter games: Must match search AND not already be in collection
    const filteredGames = games.filter(g =>
        !currentGameIds.includes(g.id) &&
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a0b2e] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold">Add Games</h2>
                        <p className="text-gray-400 text-sm">Select games to add to this collection</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5 bg-black/20 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search available games..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-600"
                        />
                    </div>
                </div>

                {/* Game List */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                    ) : filteredGames.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            {games.length === 0 ? "No published games found." : "No matching games found (or all already added)."}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredGames.map(game => {
                                const isSelected = selectedGames.includes(game.id);
                                return (
                                    <div
                                        key={game.id}
                                        onClick={() => toggleSelection(game.id)}
                                        className={`flex items-start gap-4 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                ? 'bg-purple-600/20 border-purple-500/50 hover:bg-purple-600/30'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="w-16 h-16 rounded-lg bg-black/50 relative overflow-hidden shrink-0">
                                            {game.thumbnail_url && (
                                                <Image src={game.thumbnail_url} alt={game.title} fill className="object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold truncate ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                                                {game.title}
                                            </h4>
                                            <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                                {game.description || "No description"}
                                            </p>
                                        </div>
                                        <div className={`shrink-0 mt-1 ${isSelected ? 'text-purple-500' : 'text-gray-600'}`}>
                                            {isSelected ? <CheckCircle className="w-5 h-5 fill-purple-500 text-black" /> : <Circle className="w-5 h-5" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 shrink-0 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddGames}
                        disabled={selectedGames.length === 0 || saving}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Add {selectedGames.length} Game{selectedGames.length !== 1 ? 's' : ''}
                    </button>
                </div>

            </div>
        </div>
    );
}
