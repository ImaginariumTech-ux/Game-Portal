"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Gamepad2, Loader2, ArrowLeft, Save, Clock, Globe, Hash, Store, Coins, Trophy, Users, Cpu } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

type ModeTab = 'online' | 'room' | 'practice';

export default function InstallGamePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [version, setVersion] = useState("1.0.0");
    const [gameUrl, setGameUrl] = useState("");
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    // Game Modes - Fixed Templates
    const [activeTab, setActiveTab] = useState<ModeTab>('online');

    // Online Mode
    const [onlineEnabled, setOnlineEnabled] = useState(true);
    const [onlineEntryFee, setOnlineEntryFee] = useState(30);
    const [onlineMinPlayers, setOnlineMinPlayers] = useState(2);
    const [onlineMaxPlayers, setOnlineMaxPlayers] = useState(4);
    const [onlinePrize1st, setOnlinePrize1st] = useState(60);
    const [onlinePrize2nd, setOnlinePrize2nd] = useState(30);
    const [onlinePrize3rd, setOnlinePrize3rd] = useState(10);
    const [onlinePrize4th, setOnlinePrize4th] = useState(0);

    // Game Room Mode
    const [roomEnabled, setRoomEnabled] = useState(true);

    // Practice Mode
    const [practiceEnabled, setPracticeEnabled] = useState(true);

    const [hasLeaderboard, setHasLeaderboard] = useState(true);

    // Publishing State
    const [publishType, setPublishType] = useState<'now' | 'schedule' | 'draft'>('now');
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");

    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [collections, setCollections] = useState<{ id: string, name: string }[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

    React.useEffect(() => {
        const fetchCollections = async () => {
            const { data } = await supabase.from('collections').select('id, name');
            if (data) setCollections(data);
        };
        fetchCollections();
    }, []);

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnail(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!title || !gameUrl) {
                alert("Please fill in all required fields");
                setLoading(false);
                return;
            }

            // 1. Upload Thumbnail
            let thumbnailUrl = null;
            if (thumbnail) {
                const fileExt = thumbnail.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('game-images')
                    .upload(filePath, thumbnail);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('game-images')
                    .getPublicUrl(filePath);

                thumbnailUrl = data.publicUrl;
            }

            // 2. Determine Status
            let status = 'draft';
            let publishedAt = null;

            if (publishType === 'now') {
                status = 'published';
                publishedAt = new Date().toISOString();
            } else if (publishType === 'schedule') {
                status = 'published';
                if (!scheduledDate || !scheduledTime) {
                    alert("Please select a date and time for scheduling.");
                    setLoading(false);
                    return;
                }
                publishedAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            } else {
                status = 'draft';
            }

            // 3. Insert Game Record
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const { data: gameData, error: insertError } = await supabase.from('games').insert([
                {
                    title,
                    slug,
                    description,
                    version,
                    game_url: gameUrl,
                    thumbnail_url: thumbnailUrl,
                    status,
                    published_at: publishedAt,
                    has_leaderboard: hasLeaderboard
                }
            ]).select().single();

            if (insertError) throw insertError;

            // 4. Insert Game Modes (Fixed Templates)
            if (gameData) {
                const modesData = [];

                // Online Mode
                if (onlineEnabled) {
                    modesData.push({
                        game_id: gameData.id,
                        name: "Online Ranked",
                        slug: "online",
                        description: "Competitive matchmaking with leaderboard ranking",
                        platform_fee: onlineEntryFee,
                        prize_distribution: {
                            "1": onlinePrize1st,
                            "2": onlinePrize2nd,
                            "3": onlinePrize3rd,
                            "4": onlinePrize4th
                        },
                        min_players: onlineMinPlayers,
                        max_players: onlineMaxPlayers,
                        affects_leaderboard: true
                    });
                }

                // Game Room Mode
                if (roomEnabled) {
                    modesData.push({
                        game_id: gameData.id,
                        name: "Friend Room",
                        slug: "room",
                        description: "Play with friends in private rooms",
                        platform_fee: 0,
                        prize_distribution: {},
                        min_players: 2,
                        max_players: 4,
                        affects_leaderboard: false
                    });
                }

                // Practice Mode
                if (practiceEnabled) {
                    modesData.push({
                        game_id: gameData.id,
                        name: "Practice",
                        slug: "practice",
                        description: "Play against computer for free",
                        platform_fee: 0,
                        prize_distribution: {},
                        min_players: 1,
                        max_players: 1,
                        affects_leaderboard: false
                    });
                }

                if (modesData.length > 0) {
                    const { error: modesError } = await supabase.from('game_modes').insert(modesData);
                    if (modesError) {
                        console.error("Error adding game modes:", JSON.stringify(modesError, null, 2));
                        alert(`Error saving game modes: ${modesError.message}`);
                    }
                }
            }

            // 5. Link to Collection
            if (selectedCollectionId && gameData) {
                const { error: collectionError } = await supabase.from('collection_games').insert({
                    collection_id: selectedCollectionId,
                    game_id: gameData.id
                });
                if (collectionError) console.error("Error adding to collection:", collectionError);
            }

            router.push('/magicadmins/games');
        } catch (error: any) {
            console.error('Error uploading game:', error);
            alert(`Error uploading game: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="games" />

            <main className="flex-1 flex flex-col overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a1b3e] to-[#1a0b2e]">
                <div className="max-w-7xl mx-auto w-full p-8 md:p-12">
                    {/* Header */}
                    <div className="flex items-center gap-6 mb-12">
                        <button
                            onClick={() => router.back()}
                            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 group"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Install New Game</h1>
                            <p className="text-gray-400 mt-2">Configure game modes, pricing, and leaderboard settings.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Basic Info Section */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-purple-400">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <Gamepad2 className="w-5 h-5" />
                                </div>
                                Game Details
                            </h2>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Game Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                            placeholder="e.g. Ludo Royale"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Collection <span className="text-gray-500 text-xs">(Optional)</span></label>
                                        <div className="relative">
                                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                            <select
                                                value={selectedCollectionId}
                                                onChange={(e) => setSelectedCollectionId(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer hover:bg-black/30"
                                            >
                                                <option value="">No Collection</option>
                                                {collections.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Game URL</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="url"
                                                value={gameUrl}
                                                onChange={(e) => setGameUrl(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                                placeholder="https://ludo.magicgames.com"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Version</label>
                                        <div className="relative">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="text"
                                                value={version}
                                                onChange={(e) => setVersion(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center"
                                                placeholder="1.0.0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300 ml-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all min-h-[140px] resize-none leading-relaxed"
                                        placeholder="Write a catchy description for the game..."
                                    />
                                </div>

                                {/* Thumbnail Upload */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300 ml-1">Game Thumbnail</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative aspect-video bg-black/20 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all group"
                                    >
                                        {thumbnailPreview ? (
                                            <Image src={thumbnailPreview} alt="Preview" fill className="object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                                <Upload className="w-12 h-12 mb-2" />
                                                <span className="text-sm">Click to upload thumbnail</span>
                                                <span className="text-xs mt-1">1920 x 1080 recommended</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleThumbnailChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Game Modes Section - Fixed Tabs */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-blue-400">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                    <Coins className="w-5 h-5" />
                                </div>
                                Game Modes & Pricing
                            </h2>

                            {/* Mode Tabs */}
                            <div className="flex gap-2 border-b border-white/10 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('online')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all ${activeTab === 'online'
                                        ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <Trophy className="w-4 h-4" />
                                    Online
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('room')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all ${activeTab === 'room'
                                        ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <Users className="w-4 h-4" />
                                    Game Room
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('practice')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all ${activeTab === 'practice'
                                        ? 'bg-green-500/20 text-green-400 border-b-2 border-green-500'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <Cpu className="w-4 h-4" />
                                    Practice
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="min-h-[300px]">
                                {/* Online Mode Tab */}
                                {activeTab === 'online' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                            <div className="flex items-center gap-3">
                                                <Trophy className="w-6 h-6 text-blue-400" />
                                                <div>
                                                    <div className="font-bold text-white">Online Ranked Mode</div>
                                                    <div className="text-sm text-gray-400">Competitive matchmaking with leaderboard</div>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={onlineEnabled}
                                                    onChange={(e) => setOnlineEnabled(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                            </label>
                                        </div>

                                        {onlineEnabled && (
                                            <div className="space-y-6 pl-4">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-300">Entry Fee (Coins)</label>
                                                        <input
                                                            type="number"
                                                            value={onlineEntryFee}
                                                            onChange={(e) => setOnlineEntryFee(parseFloat(e.target.value) || 0)}
                                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                            min="0"
                                                        />
                                                        <p className="text-xs text-gray-500">Cost per player to join</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-300">Min Players</label>
                                                            <input
                                                                type="number"
                                                                value={onlineMinPlayers}
                                                                onChange={(e) => setOnlineMinPlayers(parseInt(e.target.value) || 2)}
                                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                min="2"
                                                                max={onlineMaxPlayers}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-300">Max Players</label>
                                                            <input
                                                                type="number"
                                                                value={onlineMaxPlayers}
                                                                onChange={(e) => setOnlineMaxPlayers(parseInt(e.target.value) || 4)}
                                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                min={onlineMinPlayers}
                                                                max="1000"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-sm font-medium text-gray-300">Prize Distribution (%)</label>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-gray-400">1st Place</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={onlinePrize1st}
                                                                    onChange={(e) => setOnlinePrize1st(parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                    min="0"
                                                                    max="100"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-gray-400">2nd Place</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={onlinePrize2nd}
                                                                    onChange={(e) => setOnlinePrize2nd(parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                    min="0"
                                                                    max="100"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-gray-400">3rd Place</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={onlinePrize3rd}
                                                                    onChange={(e) => setOnlinePrize3rd(parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                    min="0"
                                                                    max="100"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-gray-400">4th Place</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={onlinePrize4th}
                                                                    onChange={(e) => setOnlinePrize4th(parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                                    min="0"
                                                                    max="100"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Total: {onlinePrize1st + onlinePrize2nd + onlinePrize3rd + onlinePrize4th}%
                                                        {(onlinePrize1st + onlinePrize2nd + onlinePrize3rd + onlinePrize4th) === 100 ?
                                                            <span className="text-green-400 ml-2">✓ Valid</span> :
                                                            <span className="text-yellow-400 ml-2">⚠ Should equal 100%</span>
                                                        }
                                                    </p>
                                                </div>

                                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                                    <div className="flex items-start gap-3">
                                                        <Trophy className="w-5 h-5 text-blue-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-blue-400">Example:</strong> With {onlineMaxPlayers} players at {onlineEntryFee} coins each = {onlineMaxPlayers * onlineEntryFee} coins total pool.
                                                            1st gets {Math.floor(onlineMaxPlayers * onlineEntryFee * onlinePrize1st / 100)} coins ({onlinePrize1st}%),
                                                            2nd gets {Math.floor(onlineMaxPlayers * onlineEntryFee * onlinePrize2nd / 100)} coins ({onlinePrize2nd}%).
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                                    <div className="flex items-start gap-3">
                                                        <Trophy className="w-5 h-5 text-blue-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-blue-400">Leaderboard:</strong> This mode always affects the global leaderboard. Winners gain ranking points.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Game Room Tab */}
                                {activeTab === 'room' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                            <div className="flex items-center gap-3">
                                                <Users className="w-6 h-6 text-purple-400" />
                                                <div>
                                                    <div className="font-bold text-white">Friend Room Mode</div>
                                                    <div className="text-sm text-gray-400">Private rooms for playing with friends</div>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={roomEnabled}
                                                    onChange={(e) => setRoomEnabled(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                            </label>
                                        </div>

                                        {roomEnabled && (
                                            <div className="space-y-6 pl-4">
                                                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <Users className="w-5 h-5 text-purple-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-purple-400">User Controlled:</strong> Players create rooms and decide their own stakes and rules.
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <Coins className="w-5 h-5 text-purple-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-purple-400">Flexible Betting:</strong> Users can choose to play for free or set custom coin amounts.
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <X className="w-5 h-5 text-purple-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-purple-400">No Leaderboard Impact:</strong> Friend room matches are casual and don't affect global rankings.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Practice Mode Tab */}
                                {activeTab === 'practice' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                            <div className="flex items-center gap-3">
                                                <Cpu className="w-6 h-6 text-green-400" />
                                                <div>
                                                    <div className="font-bold text-white">Practice Mode</div>
                                                    <div className="text-sm text-gray-400">Play against computer for free</div>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={practiceEnabled}
                                                    onChange={(e) => setPracticeEnabled(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                        </div>

                                        {practiceEnabled && (
                                            <div className="space-y-4 pl-4">
                                                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <Coins className="w-5 h-5 text-green-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-green-400">Always Free:</strong> No coins required or awarded
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <X className="w-5 h-5 text-green-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-green-400">No Leaderboard:</strong> Practice matches don't affect rankings
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <Cpu className="w-5 h-5 text-green-400 mt-0.5" />
                                                        <div className="text-sm text-gray-300">
                                                            <strong className="text-green-400">Offline Play:</strong> Game handles AI opponent internally
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                                    <div className="text-xs text-yellow-400">
                                                        ℹ️ <strong>Note:</strong> The game must implement its own AI/computer opponent. The portal only launches the game without a session token.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Global Leaderboard Toggle */}
                            <div className="pt-6 border-t border-white/10">
                                <label className="flex items-center gap-3 cursor-pointer p-4 bg-black/20 rounded-xl border border-white/10 hover:bg-black/30 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={hasLeaderboard}
                                        onChange={(e) => setHasLeaderboard(e.target.checked)}
                                        className="w-5 h-5 rounded bg-black/30 border-white/10 text-yellow-500 focus:ring-yellow-500/50"
                                    />
                                    <Trophy className="w-5 h-5 text-yellow-400" />
                                    <div>
                                        <div className="text-sm font-medium text-white">Enable Global Leaderboard</div>
                                        <div className="text-xs text-gray-400">Track and display top players for this game</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Publishing Section */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-green-400">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <Clock className="w-5 h-5" />
                                </div>
                                Release Settings
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'now', label: 'Publish Now', desc: 'Live immediately' },
                                    { id: 'schedule', label: 'Schedule', desc: 'Release later' },
                                    { id: 'draft', label: 'Save Draft', desc: 'Hidden for now' },
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setPublishType(option.id as any)}
                                        className={`p-4 rounded-2xl border text-left transition-all duration-300 ${publishType === option.id
                                            ? 'bg-green-500/20 border-green-500 text-green-400'
                                            : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="font-bold mb-1">{option.label}</div>
                                        <div className="text-xs opacity-70">{option.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {publishType === 'schedule' && (
                                <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300 ml-1">Date</label>
                                            <input
                                                type="date"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-green-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300 ml-1">Time</label>
                                            <input
                                                type="time"
                                                value={scheduledTime}
                                                onChange={(e) => setScheduledTime(e.target.value)}
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-green-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </form>

                    {/* Bottom Action Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#1a0b2e]/80 backdrop-blur-xl border-t border-white/5 z-50 flex justify-end items-center gap-4 lg:pl-72">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 rounded-xl hover:bg-white/5 text-gray-400 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {publishType === 'draft' ? 'Save Draft' : publishType === 'schedule' ? 'Schedule Game' : 'Publish Game'}
                        </button>
                    </div>
                    <div className="h-24"></div>
                </div>
            </main>
        </div>
    );
}
