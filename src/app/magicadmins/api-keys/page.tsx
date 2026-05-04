"use client";

import React, { useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabase/client";
import { Key, Plus, Trash2, Copy, AlertCircle, Check, Search, Gamepad2, Globe } from "lucide-react";

interface ApiKey {
    id: string;
    key: string;
    owner_name: string;
    game_id?: string;
    is_active: boolean;
    created_at: string;
    games?: { title: string }; // Joined data
}

interface Game {
    id: string;
    title: string;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newOwner, setNewOwner] = useState("");
    const [selectedGameId, setSelectedGameId] = useState<string>(""); // "" means All Games
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [keysRes, gamesRes] = await Promise.all([
                supabase
                    .from('api_keys')
                    .select('*, games(title)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('games')
                    .select('id, title')
                    .eq('status', 'published')
                    .order('title')
            ]);

            if (keysRes.error) throw keysRes.error;
            if (gamesRes.error) throw gamesRes.error;

            setKeys(keysRes.data || []);
            setGames(gamesRes.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateKey = () => {
        // Simple random key generation
        const prefix = "mk_live_";
        const random = Array.from(crypto.getRandomValues(new Uint8Array(24)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return prefix + random;
    };

    const handleCreateKey = async () => {
        if (!newOwner.trim()) return;

        const key = generateKey();

        try {
            const { error } = await supabase
                .from('api_keys')
                .insert({
                    key: key,
                    owner_name: newOwner,
                    game_id: selectedGameId || null, // Handle "All Games"
                    is_active: true
                });

            if (error) throw error;

            setGeneratedKey(key); // Show the key to the user
            fetchData(); // Refresh list
            // Don't close modal yet, let them copy the key
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this key? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('api_keys')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewOwner("");
        setSelectedGameId("");
        setGeneratedKey(null);
    };

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="api-keys" />

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Key className="w-5 h-5 text-purple-400" />
                            API Keys
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Generate Key
                        </button>
                        <a
                            href="/API_DOCUMENTATION.md"
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all text-sm"
                        >
                            <Globe className="w-4 h-4" />
                            Docs
                        </a>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400 animate-pulse">
                            Loading keys...
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-2">
                            <AlertCircle className="w-8 h-8" />
                            <p>Error: {error}</p>
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                <Key className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-lg font-medium">No API keys found</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {keys.map((apiKey) => (
                                <div key={apiKey.id} className={`bg-white/5 border ${apiKey.is_active ? 'border-white/5' : 'border-red-500/20 bg-red-500/5'} p-6 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all`}>
                                    <div className="flex item-center gap-6">
                                        <div className={`p-3 rounded-xl ${apiKey.is_active ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'}`}>
                                            <Key className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg mb-1 flex items-center gap-2 ${apiKey.is_active ? 'text-white' : 'text-gray-500 line-through'}`}>
                                                {apiKey.owner_name}
                                                {!apiKey.is_active && <span className="text-xs no-underline bg-red-500/20 text-red-400 px-2 py-0.5 rounded">REVOKED</span>}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <div className="flex items-center gap-1.5 font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                                    {apiKey.key.substring(0, 12)}...
                                                    <button onClick={() => copyToClipboard(apiKey.key)} className="hover:text-white transition-colors ml-2">
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Gamepad2 className="w-3 h-3" />
                                                    {apiKey.games ? apiKey.games.title : "All Games"}
                                                </div>
                                                <div className="bg-white/5 px-2 py-0.5 rounded text-xs">
                                                    Created: {new Date(apiKey.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {apiKey.is_active && (
                                        <button
                                            onClick={() => handleRevoke(apiKey.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Revoke Key"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Key Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a0b2e] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />

                        {generatedKey ? (
                            // Success View
                            <div className="space-y-6 text-center relative">
                                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Key Generated!</h2>
                                    <p className="text-gray-400 text-sm">Copy this key now. You won't be able to see it again.</p>
                                </div>
                                <div className="bg-black/50 border border-white/10 p-4 rounded-xl font-mono text-purple-300 break-all select-all flex items-center gap-3 text-left">
                                    <span className="flex-1">{generatedKey}</span>
                                    <button onClick={() => copyToClipboard(generatedKey)} className="hover:text-white transition-colors">
                                        <Copy className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            // Form View
                            <div className="space-y-6 relative">
                                <h2 className="text-2xl font-bold text-white">Generate API Key</h2>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Partner Name</label>
                                    <input
                                        type="text"
                                        value={newOwner}
                                        onChange={(e) => setNewOwner(e.target.value)}
                                        placeholder="e.g. Ludo Portal Inc."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-colors text-white"
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Game Access</label>
                                    <div className="relative">
                                        <select
                                            value={selectedGameId}
                                            onChange={(e) => setSelectedGameId(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-purple-500/50 transition-colors text-white cursor-pointer"
                                        >
                                            <option value="" className="bg-[#1a0b2e]">All Games (Full Access)</option>
                                            <optgroup label="Specific Game Only">
                                                {games.map(g => (
                                                    <option key={g.id} value={g.id} className="bg-[#1a0b2e]">{g.title}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Select "All Games" to give access to your entire library, or pick a specific game.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateKey}
                                        disabled={!newOwner.trim()}
                                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-500/20"
                                    >
                                        Generate
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
