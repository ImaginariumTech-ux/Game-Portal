"use client";

import React, { useState, useRef } from "react";
import { X, Upload, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

interface CreateCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateCollectionModal({ isOpen, onClose, onSuccess }: CreateCollectionModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (!name) throw new Error("Collection name is required");

            let imageUrl = null;

            if (image) {
                console.log('Starting image upload...');
                const fileExt = image.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('collection-images')
                    .upload(filePath, image);

                if (uploadError) {
                    console.error('Upload Error:', uploadError);
                    throw new Error(`Image upload failed: ${uploadError.message}`);
                }

                const { data } = supabase.storage
                    .from('collection-images')
                    .getPublicUrl(filePath);

                imageUrl = data.publicUrl;
                console.log('Image uploaded successfully:', imageUrl);
            }

            console.log('Inserting collection into database...');
            const { error: insertError } = await supabase.from('collections').insert([
                {
                    name,
                    description,
                    image_url: imageUrl
                }
            ]);

            if (insertError) {
                console.error('Database Insert Error:', insertError);
                throw new Error(`Database insert failed: ${insertError.message}`);
            }

            onSuccess();
            onClose();
            // Reset form
            setName("");
            setDescription("");
            setImage(null);
            setImagePreview(null);
        } catch (err: any) {
            setError(err.message || "Failed to create collection");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a0b2e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">New Collection</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Collection Image</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-full aspect-video rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center group overflow-hidden"
                        >
                            {imagePreview ? (
                                <Image
                                    src={imagePreview}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-purple-400">
                                    <div className="p-3 rounded-full bg-white/5 group-hover:bg-purple-500/20 transition-colors">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs">Click to upload image</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Action RPGs"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this collection..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Create Collection
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
