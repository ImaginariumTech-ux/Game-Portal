"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Gamepad2, Upload, Calendar, Clock, Loader2, AlertCircle, CheckCircle, Play, Edit, X, Star, Users2, Plus } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import ActionModal from "@/components/ActionModal";

export default function ManageGamePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [version, setVersion] = useState("");
    const [gameUrl, setGameUrl] = useState("");
    const [status, setStatus] = useState<string>("draft");
    const [plays, setPlays] = useState<number>(0);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

    // Publishing State
    const [publishType, setPublishType] = useState<'now' | 'schedule' | 'draft'>('draft');
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");

    // Collections
    const [collections, setCollections] = useState<{ id: string, name: string }[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

    // Delete Modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [featured, setFeatured] = useState(false);
    const [togglingFeatured, setTogglingFeatured] = useState(false);

    // Ratings
    const [avgRating, setAvgRating] = useState<number>(0);
    const [ratingCount, setRatingCount] = useState<number>(0);
    const [ratingBreakdown, setRatingBreakdown] = useState<number[]>([0, 0, 0, 0, 0]); // index 0 = 1 star

    const [activeTab, setActiveTab] = useState<'analytics' | 'characters'>('analytics');
    const [characters, setCharacters] = useState<any[]>([]);
    const [loadingCharacters, setLoadingCharacters] = useState(false);
    const [characterName, setCharacterName] = useState("");
    const [characterFile, setCharacterFile] = useState<File | null>(null);
    const [characterPreview, setCharacterPreview] = useState<string | null>(null);
    const [isAddingCharacter, setIsAddingCharacter] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const charFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchGameDetails();
        fetchCollections();
        fetchCharacters();
    }, [id]);

    const fetchCharacters = async () => {
        setLoadingCharacters(true);
        const { data, error } = await supabase
            .from('game_characters')
            .select('*')
            .eq('game_id', id)
            .order('created_at', { ascending: true });
        if (data) setCharacters(data);
        setLoadingCharacters(false);
    };

    const fetchCollections = async () => {
        const { data } = await supabase.from('collections').select('id, name');
        if (data) setCollections(data);
    };

    const fetchGameDetails = async () => {
        try {
            const { data: game, error } = await supabase
                .from('games')
                .select('*, collection_games(collection_id)')
                .eq('id', id)
                .single();

            if (error) throw error;

            setTitle(game.title || '');
            setDescription(game.description || '');
            setVersion(game.version || '');
            setGameUrl(game.game_url || '');
            setStatus(game.status || 'draft');
            setPlays(game.plays || 0);
            setThumbnailUrl(game.thumbnail_url || null);
            setThumbnailPreview(game.thumbnail_url || null);
            setFeatured(game.featured || false);

            // Fetch ratings
            const { data: ratingsData } = await supabase
                .from('game_ratings')
                .select('rating')
                .eq('game_id', id);

            if (ratingsData && ratingsData.length > 0) {
                const total = ratingsData.reduce((sum, r) => sum + r.rating, 0);
                setAvgRating(parseFloat((total / ratingsData.length).toFixed(1)));
                setRatingCount(ratingsData.length);
                const breakdown = [0, 0, 0, 0, 0];
                ratingsData.forEach(r => { if (r.rating >= 1 && r.rating <= 5) breakdown[r.rating - 1]++; });
                setRatingBreakdown(breakdown);
            } else {
                setAvgRating(0);
                setRatingCount(0);
                setRatingBreakdown([0, 0, 0, 0, 0]);
            }

            // Handle Publishing Status
            if (game.status === 'published') {
                if (game.published_at && new Date(game.published_at) > new Date()) {
                    setPublishType('schedule');
                    const date = new Date(game.published_at);
                    setScheduledDate(date.toISOString().split('T')[0]);
                    setScheduledTime(date.toTimeString().split(' ')[0].substring(0, 5));
                } else {
                    setPublishType('now');
                }
            } else {
                setPublishType('draft');
            }

            // Handle Collection
            if (game.collection_games && game.collection_games.length > 0) {
                setSelectedCollectionId(game.collection_games[0].collection_id);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // 1. Upload new thumbnail if changed
            let finalThumbnailUrl = thumbnailUrl;
            if (thumbnailFile) {
                const fileExt = thumbnailFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('game-images')
                    .upload(filePath, thumbnailFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('game-images')
                    .getPublicUrl(filePath);

                finalThumbnailUrl = data.publicUrl;
            }

            // 2. Determine Status/PublishedAt
            let newStatus = 'draft';
            let newPublishedAt = null;

            if (publishType === 'now') {
                newStatus = 'published';
                newPublishedAt = new Date().toISOString();
            } else if (publishType === 'schedule') {
                newStatus = 'published';
                if (!scheduledDate || !scheduledTime) {
                    throw new Error("Invalid schedule date/time");
                }
                newPublishedAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            } else {
                newStatus = 'draft';
            }

            // 3. Update Game
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const { error: updateError } = await supabase
                .from('games')
                .update({
                    title,
                    slug,
                    description,
                    version,
                    game_url: gameUrl,
                    thumbnail_url: finalThumbnailUrl,
                    status: newStatus,
                    published_at: newPublishedAt
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 4. Update Collection Association
            await supabase.from('collection_games').delete().eq('game_id', id);

            if (selectedCollectionId) {
                await supabase.from('collection_games').insert({
                    collection_id: selectedCollectionId,
                    game_id: id
                });
            }

            await fetchGameDetails(); // Refresh data to update UI status

            setSuccess(true);
            setIsEditing(false); // Switch back to view mode on success
            setTimeout(() => setSuccess(false), 3000);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            const { error } = await supabase.from('games').delete().eq('id', id);
            if (error) throw error;
            router.push('/magicadmins/games');
        } catch (err: any) {
            alert("Error deleting game: " + err.message);
        }
    };

    const handlePlayGame = () => {
        if (gameUrl) {
            supabase.rpc('increment_game_plays', { p_game_id: id });
            setPlays(p => p + 1);
            window.open(gameUrl, '_blank');
        }
    };

    const handleToggleFeatured = async () => {
        setTogglingFeatured(true);
        const newVal = !featured;
        const { error } = await supabase.from('games').update({ featured: newVal }).eq('id', id);
        if (!error) setFeatured(newVal);
        setTogglingFeatured(false);
    };

    const handleCharacterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCharacterFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCharacterPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddCharacter = async () => {
        if (!characterName || !characterFile) return;
        setSaving(true);
        setError(null);
        try {
            const fileExt = characterFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `characters/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('game-images')
                .upload(filePath, characterFile);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('game-images')
                .getPublicUrl(filePath);

            const { error: insertError } = await supabase
                .from('game_characters')
                .insert({
                    game_id: id,
                    name: characterName,
                    image_url: urlData.publicUrl
                });

            if (insertError) throw insertError;

            setCharacterName("");
            setCharacterFile(null);
            setCharacterPreview(null);
            setIsAddingCharacter(false);
            fetchCharacters();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCharacter = async (charId: string) => {
        if (!confirm("Delete this character?")) return;
        try {
            const { error } = await supabase.from('game_characters').delete().eq('id', charId);
            if (error) throw error;
            fetchCharacters();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#1a0b2e] text-white">Loading...</div>;

    const collectionName = collections.find(c => c.id === selectedCollectionId)?.name;

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="games" />

            <main className="flex-1 flex flex-col overflow-y-auto relative">

                {/* HERO SECTION / COVER */}
                <div className="h-80 relative shrink-0 group">
                    {thumbnailPreview ? (
                        <Image src={thumbnailPreview} alt={title} fill className="object-cover opacity-60" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 opacity-60" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-[#1a0b2e]/60 to-transparent" />

                    {/* Top Bar Actions */}
                    <div className="absolute top-8 right-8 flex gap-3 z-10">
                        {/* Featured Toggle — always visible */}
                        <button
                            onClick={handleToggleFeatured}
                            disabled={togglingFeatured}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md transition-all border text-sm font-medium ${featured
                                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30'
                                : 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            {togglingFeatured
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Star className={`w-4 h-4 ${featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            }
                            {featured ? '★ Featured' : 'Add to Featured'}
                        </button>

                        {/* Edit / Cancel conditional */}
                        {isEditing ? (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all border border-white/10 text-sm font-medium"
                            >
                                <X className="w-4 h-4" />
                                Cancel Edit
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        setPublishType('draft');
                                        setIsEditing(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all border border-white/10 text-sm font-medium"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Details
                                </button>
                                <button
                                    onClick={() => setDeleteModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl backdrop-blur-md transition-all border border-red-500/20 text-sm font-medium"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </>
                        )}
                    </div>

                    {/* Hero Content */}
                    <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full flex flex-col md:flex-row items-end justify-between gap-6">
                        <div className="max-w-2xl">
                            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors text-sm group/back">
                                <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" />
                                Back to Games
                            </button>
                            <div className="flex items-center gap-3 mb-2">
                                {collectionName && (
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/20 uppercase tracking-wide">
                                        {collectionName}
                                    </span>
                                )}
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${status === 'published' ? 'bg-green-500/20 text-green-300 border-green-500/20' :
                                    'bg-yellow-500/20 text-yellow-300 border-yellow-500/20'
                                    }`}>
                                    {status}
                                </span>
                            </div>
                            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{title}</h1>
                            <p className="text-gray-300 text-lg leading-relaxed line-clamp-2">{description}</p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right mr-4 hidden md:block">
                                <div className="text-sm text-gray-400">Total Plays</div>
                                <div className="text-2xl font-bold text-white">{plays.toLocaleString()}</div>
                            </div>
                            <div className="text-right mr-4 hidden md:block">
                                <div className="text-sm text-gray-400">Version</div>
                                <div className="text-2xl font-bold text-white">{version}</div>
                            </div>

                            <button
                                onClick={handlePlayGame}
                                className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-all transform hover:scale-105 shadow-xl shadow-white/10 flex items-center gap-2"
                            >
                                <Play className="w-6 h-6 fill-current" />
                                Play Game
                            </button>
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 bg-[#1a0b2e]">
                    {isEditing ? (
                        <div className="max-w-4xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-[#2a1b3e] border border-white/10 rounded-2xl p-8 shadow-xl">
                                <form onSubmit={handleSave} className="space-y-8">
                                    {/* ... Previous Form Content ... */}
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2 text-purple-400">
                                            <Edit className="w-5 h-5" />
                                            Edit Game Details
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Left Col */}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Game Title</label>
                                                    <input
                                                        type="text"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Game URL</label>
                                                    <input
                                                        type="url"
                                                        value={gameUrl}
                                                        onChange={(e) => setGameUrl(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Version</label>
                                                    <input
                                                        type="text"
                                                        value={version}
                                                        onChange={(e) => setVersion(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Description</label>
                                                    <textarea
                                                        value={description}
                                                        onChange={(e) => setDescription(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all min-h-[120px] resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Collection (Optional)</label>
                                                    <select
                                                        value={selectedCollectionId}
                                                        onChange={(e) => setSelectedCollectionId(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                                    >
                                                        <option value="">No Collection</option>
                                                        {collections.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Right Col: Thumbnail */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-300">Game Thumbnail</label>
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="relative aspect-video rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center group overflow-hidden bg-black/20"
                                                >
                                                    {thumbnailPreview ? (
                                                        <Image
                                                            src={thumbnailPreview}
                                                            alt="Preview"
                                                            fill
                                                            className="object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-purple-400">
                                                            <Upload className="w-8 h-8" />
                                                            <span className="text-sm font-medium">Change Thumbnail</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Upload className="w-6 h-6 text-white" />
                                                        </div>
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
                                    </div>

                                    <hr className="border-white/10" />

                                    {/* Publishing Options */}
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
                                            <Clock className="w-5 h-5" />
                                            Publishing Status
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {status !== 'published' ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPublishType('now')}
                                                        className={`p-4 rounded-xl border text-left transition-all ${publishType === 'now'
                                                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                                    >
                                                        <div className="font-bold mb-1">Published</div>
                                                        <div className="text-xs opacity-70">Game is live.</div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setPublishType('schedule')}
                                                        className={`p-4 rounded-xl border text-left transition-all ${publishType === 'schedule'
                                                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                                    >
                                                        <div className="font-bold mb-1">Scheduled</div>
                                                        <div className="text-xs opacity-70">Set for future release.</div>
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="col-span-2 p-4 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-300 flex items-center justify-between">
                                                    <div>
                                                        <div className="font-bold mb-1">Currently Published</div>
                                                        <div className="text-xs opacity-70">This game is live. Select Draft to unpublish.</div>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setPublishType('draft')}
                                                className={`p-4 rounded-xl border text-left transition-all ${publishType === 'draft'
                                                    ? 'bg-gray-500/20 border-gray-400 text-gray-300'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                            >
                                                <div className="font-bold mb-1">Draft</div>
                                                <div className="text-xs opacity-70">Hidden from users.</div>
                                            </button>
                                        </div>

                                        {publishType === 'schedule' && (
                                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
                                                <h3 className="font-bold text-purple-300 mb-4 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    Schedule
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-300">Date</label>
                                                        <input
                                                            type="date"
                                                            value={scheduledDate}
                                                            onChange={(e) => setScheduledDate(e.target.value)}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-300">Time</label>
                                                        <input
                                                            type="time"
                                                            value={scheduledTime}
                                                            onChange={(e) => setScheduledTime(e.target.value)}
                                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-between pt-6 border-t border-white/10">
                                        <div className="flex-1">
                                            {error && (
                                                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg inline-block">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {error}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(false)}
                                                className="px-6 py-3 rounded-xl hover:bg-white/5 text-gray-400 font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50 transition-all transform hover:scale-105"
                                            >
                                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    ) : (
                        // VIEW MODE (Analytics, etc)
                        <div className="max-w-7xl mx-auto p-8 md:p-12">
                            {/* Tabs */}
                            <div className="flex items-center gap-8 mb-8 border-b border-white/5">
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'analytics' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Analytics
                                    {activeTab === 'analytics' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('characters')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'characters' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Characters
                                    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-400 font-mono">
                                        {characters.length}
                                    </span>
                                    {activeTab === 'characters' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Content */}
                                <div className="lg:col-span-2 space-y-8">
                                    {activeTab === 'analytics' ? (
                                        <>
                                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                                Analytics
                                                <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-1 rounded-md">Last 30 Days</span>
                                            </h2>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                                    <div className="text-gray-400 text-sm mb-1">Total Plays</div>
                                                    <div className="text-3xl font-bold text-white">{plays.toLocaleString()}</div>
                                                    <div className="text-green-400 text-xs mt-2 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> +12% this week
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                                    <div className="text-gray-400 text-sm mb-1">Avg. Session</div>
                                                    <div className="text-3xl font-bold text-white">12m</div>
                                                    <div className="text-green-400 text-xs mt-2 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> +5% this week
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                                    <div className="text-gray-400 text-sm mb-1">Rating</div>
                                                    {ratingCount === 0 ? (
                                                        <>
                                                            <div className="text-3xl font-bold text-white">—</div>
                                                            <div className="text-gray-600 text-xs mt-2">No ratings yet</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-3xl font-bold text-white">{avgRating}</div>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                {[1, 2, 3, 4, 5].map(s => (
                                                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
                                                                ))}
                                                                <span className="text-gray-500 text-xs ml-1">({ratingCount})</span>
                                                            </div>
                                                            {/* Breakdown bars */}
                                                            <div className="mt-3 space-y-1">
                                                                {[5, 4, 3, 2, 1].map(star => {
                                                                    const count = ratingBreakdown[star - 1];
                                                                    const pct = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
                                                                    return (
                                                                        <div key={star} className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] text-gray-500 w-3">{star}</span>
                                                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                                            </div>
                                                                            <span className="text-[10px] text-gray-600 w-5 text-right">{count}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold">Characters</h2>
                                                    <p className="text-sm text-gray-500 mt-1">Manage avatars available for player selection.</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsAddingCharacter(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-500/20"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add Character
                                                </button>
                                            </div>

                                            {isAddingCharacter && (
                                                <div className="bg-[#2a1b3e] border border-purple-500/30 rounded-2xl p-6 animate-in slide-in-from-top-4">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h3 className="font-bold text-lg">New Character</h3>
                                                        <button onClick={() => setIsAddingCharacter(false)} className="text-gray-500 hover:text-white">
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-medium text-gray-400">Character Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={characterName}
                                                                    onChange={(e) => setCharacterName(e.target.value)}
                                                                    placeholder="e.g. Red Warrior"
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={handleAddCharacter}
                                                                disabled={saving || !characterName || !characterFile}
                                                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                                                            >
                                                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Character"}
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-400">Avatar Image</label>
                                                            <div
                                                                onClick={() => charFileInputRef.current?.click()}
                                                                className="relative aspect-square w-32 rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-black/20 group"
                                                            >
                                                                {characterPreview ? (
                                                                    <Image src={characterPreview} alt="Preview" fill className="object-cover" />
                                                                ) : (
                                                                    <Upload className="w-6 h-6 text-gray-600 group-hover:text-purple-400" />
                                                                )}
                                                                <input
                                                                    type="file"
                                                                    ref={charFileInputRef}
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    onChange={handleCharacterFileChange}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {loadingCharacters ? (
                                                <div className="flex justify-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                                </div>
                                            ) : characters.length === 0 ? (
                                                <div className="text-center py-16 bg-white/5 border border-dashed border-white/10 rounded-[32px]">
                                                    <Users2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                                    <p className="text-gray-500 font-medium">No characters added yet.</p>
                                                    <button
                                                        onClick={() => setIsAddingCharacter(true)}
                                                        className="text-purple-400 hover:text-purple-300 text-sm font-bold mt-2"
                                                    >
                                                        Create the first one
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {characters.map((char) => (
                                                        <div key={char.id} className="group relative bg-white/5 border border-white/10 rounded-[24px] p-4 hover:bg-white/10 transition-all overflow-hidden">
                                                            <div className="aspect-square relative rounded-xl overflow-hidden mb-3 bg-black/20">
                                                                <Image src={char.image_url} alt={char.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                                            </div>
                                                            <h4 className="font-bold text-sm text-white truncate">{char.name}</h4>
                                                            <button
                                                                onClick={() => handleDeleteCharacter(char.id)}
                                                                className="absolute top-2 right-2 p-2 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Metadata/Info */}
                                <div className="space-y-8">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                                        <h3 className="font-bold text-lg text-gray-300">About This Game</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Description</div>
                                                <p className="text-gray-300 text-sm leading-relaxed">
                                                    {description || "No description provided."}
                                                </p>
                                            </div>

                                            <hr className="border-white/10" />

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Version</div>
                                                    <div className="text-white font-mono text-sm">{version}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Slug</div>
                                                    <div className="text-white font-mono text-sm truncate" title={gameUrl}>{title.toLowerCase().replace(/ /g, '-')}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Game URL</div>
                                                <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm break-all hover:underline block truncate">
                                                    {gameUrl}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <ActionModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Game?"
                description="Are you sure you want to delete this game? This action cannot be undone."
                confirmText="Delete Game"
                type="danger"
            />
        </div>
    );
}
