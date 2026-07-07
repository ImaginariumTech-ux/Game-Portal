"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Gamepad2, Loader2, ArrowLeft, Save, Clock, Globe, Hash, Store, Coins, Trophy, Users, Cpu } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function InstallGamePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [version, setVersion] = useState("1.0.0");
    const [gameUrl, setGameUrl] = useState("");
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);



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
            const finalSlug = (slug || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const { data: gameData, error: insertError } = await supabase.from('games').insert([
                {
                    title,
                    slug: finalSlug,
                    description,
                    version,
                    game_url: gameUrl,
                    thumbnail_url: thumbnailUrl,
                    status,
                    published_at: publishedAt,
                    has_leaderboard: true
                }
            ]).select().single();

            if (insertError) throw insertError;

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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Game Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => {
                                                setTitle(e.target.value);
                                                if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
                                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                                                }
                                            }}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                            placeholder="e.g. Ludo Royale"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Game Slug</label>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                                            placeholder="e.g. ludo-royale"
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
