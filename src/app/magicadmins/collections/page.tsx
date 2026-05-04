"use client";

import React, { useEffect, useState } from "react";
import { Search, Plus, Folder, LayoutGrid, AlertCircle } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import CreateCollectionModal from "./CreateCollectionModal";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

interface Collection {
    id: string;
    name: string;
    description: string;
    image_url: string;
    created_at: string;
}

export default function CollectionsPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('collections')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCollections(data || []);
        } catch (err: any) {
            console.error('Error fetching collections:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="collections" />

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-purple-400" />
                            Collections
                        </h1>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs text-gray-400 font-mono">
                            {collections.length} Total
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search collections..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            New Collection
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-2">
                            <AlertCircle className="w-8 h-8" />
                            <p>Error loading collections: {error}</p>
                            <button
                                onClick={fetchCollections}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white mt-2 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredCollections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                <Folder className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-lg font-medium">No collections found</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-purple-400 hover:text-purple-300 hover:underline"
                            >
                                <span className="cursor-pointer">Create your first collection</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredCollections.map((collection) => (
                                <Link
                                    href={`/magicadmins/collections/${collection.id}`}
                                    key={collection.id}
                                    className="group relative bg-[#1a0b2e] border border-white/10 hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 cursor-pointer block"
                                >
                                    {/* Image */}
                                    <div className="aspect-video relative bg-black/50 overflow-hidden">
                                        {collection.image_url ? (
                                            <Image
                                                src={collection.image_url}
                                                alt={collection.name}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                                                <Folder className="w-12 h-12 text-white/20 group-hover:text-purple-400/50 transition-colors" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-transparent to-transparent opacity-60" />
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 relative">
                                        <h3 className="font-bold text-lg text-white mb-1 group-hover:text-purple-400 transition-colors truncate">
                                            {collection.name}
                                        </h3>
                                        <p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5em]">
                                            {collection.description || "No description"}
                                        </p>

                                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                                            <span>Manage Games</span>
                                            <span className="bg-white/5 px-2 py-1 rounded-md group-hover:bg-purple-500/10 group-hover:text-purple-400 transition-colors">
                                                Manage
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <CreateCollectionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchCollections}
            />
        </div>
    );
}
