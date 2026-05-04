"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, Trash2, Gamepad2, Layers } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabase/client";
import AddGameModal from "./AddGameModal";
import EditCollectionModal from "./EditCollectionModal";
import ActionModal from "@/components/ActionModal";
import { Edit } from "lucide-react";

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
}

export default function CollectionDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const collectionId = params.id as string;

    const [collection, setCollection] = useState<Collection | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Action Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: "danger" | "warning" | "success";
        title: string;
        description: string;
        confirmText: string;
        action: () => void;
    }>({
        isOpen: false,
        type: "warning",
        title: "",
        description: "",
        confirmText: "",
        action: () => { }
    });

    useEffect(() => {
        if (collectionId) {
            fetchCollectionDetails();
            fetchCollectionGames();
        }
    }, [collectionId]);

    const fetchCollectionDetails = async () => {
        const { data, error } = await supabase
            .from('collections')
            .select('*')
            .eq('id', collectionId)
            .single();

        if (data) setCollection(data);
        if (error) console.error("Error loading collection:", error);
    };

    const fetchCollectionGames = async () => {
        // Init loading state if needed
        const { data, error } = await supabase
            .from('collection_games')
            .select(`
                game_id,
                games (
                    id,
                    title,
                    thumbnail_url
                )
            `)
            .eq('collection_id', collectionId);

        if (error) {
            console.error("Error loading games:", error);
        } else {
            // Flatten structure
            const mappedGames = data.map((item: any) => item.games) as Game[];
            setGames(mappedGames);
        }
        setLoading(false);
    };

    const confirmRemoveGame = (gameId: string) => {
        setActionModal({
            isOpen: true,
            type: "warning",
            title: "Remove Game?",
            description: "Are you sure you want to remove this game from the collection? The game itself will not be deleted.",
            confirmText: "Remove Game",
            action: () => handleRemoveGame(gameId)
        });
    };

    const handleRemoveGame = async (gameId: string) => {
        const { error } = await supabase
            .from('collection_games')
            .delete()
            .match({ collection_id: collectionId, game_id: gameId });

        if (error) {
            alert("Failed to remove game");
        } else {
            fetchCollectionGames();
        }
    };

    const confirmDeleteCollection = () => {
        setActionModal({
            isOpen: true,
            type: "danger",
            title: "Delete Collection?",
            description: "Are you sure you want to DELETE this collection? This will NOT delete the games within it, but the collection itself will be gone forever.",
            confirmText: "Delete Collection",
            action: handleDeleteCollection
        });
    };

    const handleDeleteCollection = async () => {
        try {
            const { error } = await supabase
                .from('collections')
                .delete()
                .eq('id', collectionId);

            if (error) throw error;

            router.push('/magicadmins/collections');
        } catch (error) {
            console.error("Error deleting collection:", error);
            alert("Failed to delete collection");
        }
    };

    if (loading) return <div className="h-screen bg-[#1a0b2e] text-white flex items-center justify-center">Loading...</div>;
    if (!collection) return <div className="h-screen bg-[#1a0b2e] text-white flex items-center justify-center">Collection not found</div>;

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="collections" />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header / Cover */}
                <div className="h-64 relative shrink-0">
                    {collection.image_url ? (
                        <Image src={collection.image_url} alt={collection.name} fill className="object-cover opacity-60" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-blue-900 opacity-60" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] to-transparent" />

                    <div className="absolute top-8 right-8 flex gap-3 z-10">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all border border-white/10 text-sm font-medium"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </button>
                        <button
                            onClick={confirmDeleteCollection}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl backdrop-blur-md transition-all border border-red-500/20 text-sm font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 p-8 w-full flex items-end justify-between">
                        <div>
                            <Link href="/magicadmins/collections" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors text-sm">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Collections
                            </Link>
                            <h1 className="text-4xl font-bold mb-2">{collection.name}</h1>
                            <p className="text-gray-300 max-w-2xl">{collection.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 rounded-full bg-white/10 text-sm font-medium border border-white/10">
                                {games.length} Games
                            </span>
                        </div>
                    </div>
                </div>

                {/* Games List */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-purple-400" />
                            Games in Collection
                        </h2>
                        <button
                            onClick={() => setIsAddGameModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Game
                        </button>
                    </div>

                    {games.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                            <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">This collection is empty.</p>
                            <button className="text-purple-400 hover:text-purple-300 mt-2 hover:underline" onClick={() => setIsAddGameModalOpen(true)}>Add your first game</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {games.map((game) => (
                                <div key={game.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-purple-500/30 transition-all">
                                    <div className="h-32 relative bg-black/50">
                                        {game.thumbnail_url ? (
                                            <Image src={game.thumbnail_url} alt={game.title} fill className="object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Gamepad2 className="w-8 h-8 text-white/20" />
                                            </div>
                                        )}
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => confirmRemoveGame(game.id)}
                                                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 backdrop-blur-sm"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-white truncate">{game.title}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <AddGameModal
                isOpen={isAddGameModalOpen}
                onClose={() => setIsAddGameModalOpen(false)}
                collectionId={collectionId}
                currentGameIds={games.map(g => g.id)}
                onSuccess={fetchCollectionGames}
            />

            {collection && (
                <EditCollectionModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    collection={collection}
                    onSuccess={fetchCollectionDetails}
                />
            )}

            <ActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                onConfirm={actionModal.action}
                title={actionModal.title}
                description={actionModal.description}
                confirmText={actionModal.confirmText}
                type={actionModal.type}
            />
        </div>
    );
}
