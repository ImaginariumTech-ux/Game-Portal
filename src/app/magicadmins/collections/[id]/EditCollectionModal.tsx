"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Loader2, Folder, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

interface EditCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    collection: {
        id: string;
        name: string;
        description: string;
        image_url: string;
    };
}

export default function EditCollectionModal({ isOpen, onClose, onSuccess, collection }: EditCollectionModalProps) {
    const [name, setName] = useState(collection.name);
    const [description, setDescription] = useState(collection.description);
    const [imageUrl, setImageUrl] = useState(collection.image_url);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (collection) {
            setName(collection.name);
            setDescription(collection.description);
            setImageUrl(collection.image_url);
        }
    }, [collection, isOpen]);

    if (!isOpen) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('collection-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('collection-images')
                .getPublicUrl(filePath);

            setImageUrl(data.publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('collections')
                .update({
                    name,
                    description,
                    image_url: imageUrl,
                })
                .eq('id', collection.id);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating collection:', error);
            alert('Error updating collection');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a0b2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Folder className="w-5 h-5 text-purple-400" />
                        Edit Collection
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Cover Image</label>
                        <div className="relative h-40 bg-black/40 rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/50 transition-colors overflow-hidden group">
                            {imageUrl ? (
                                <>
                                    <Image
                                        src={imageUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-sm font-medium text-white">Click to change image</p>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm">Click to upload cover</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 cursor-pointer opacity-0 z-10"
                                disabled={uploading}
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Collection Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                            placeholder="e.g., Action RPGs"
                            required
                        />
                    </div>

                    {/* Description Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all min-h-[100px] resize-none"
                            placeholder="What's this collection about?"
                            required
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Check className="w-5 h-5" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
