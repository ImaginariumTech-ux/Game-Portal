"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import {
    Sparkles, Search, Bell, Wallet, Home, Gamepad2, Users,
    HelpCircle, BarChart3, LogOut, Folder, MapPin, Calendar, Zap, LayoutGrid, DoorOpen, Trophy, Menu
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

interface Collection {
    id: string;
    name: string;
    description: string;
    image_url: string;
    created_at: string;
}

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", href: "/dashboard/collections" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", href: "/dashboard" },
    { icon: <Users className="w-4 h-4" />, label: "Friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", href: "/dashboard" },
];

export default function CollectionsPage() {
    const router = useRouter();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Sidebar profile state
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [location, setLocation] = useState("");
    const [joinDate, setJoinDate] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }

            // Profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, avatar_url, location, created_at")
                .eq("id", user.id)
                .maybeSingle();

            if (profile) {
                setFullName(profile.full_name || user.email?.split("@")[0] || "Gamer");
                setAvatarUrl(profile.avatar_url);
                setLocation(profile.location || "");
                setJoinDate(profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");
            }

            // Collections
            const { data: colData } = await supabase
                .from("collections")
                .select("*")
                .order("created_at", { ascending: false });

            setCollections(colData || []);
            setLoading(false);
        };
        init();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "G";

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">
            {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
            <Sidebar 
                currentActiveId="collections" 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* ── Main ─────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-12 flex-shrink-0 bg-[#111318] border-b border-white/5 flex items-center px-4 gap-3">
                    {/* Mobile Toggle */}
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 bg-[#1a1d24] border border-white/5 rounded-full px-3 py-1.5">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white">M</span>
                        </div>
                        <span className="text-sm font-bold text-white">1,022.00</span>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-[#1a1d24] border border-white/5 rounded-full pl-7 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 w-48"
                                placeholder="Search collections..."
                            />
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <LayoutGrid className="w-5 h-5 text-purple-400" />
                        <h1 className="text-xl font-bold uppercase tracking-wide">Collections</h1>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                            {collections.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : filteredCollections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <Folder className="w-8 h-8 opacity-40" />
                            </div>
                            <p className="text-sm font-medium">No collections found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredCollections.map((collection) => (
                                <Link
                                    key={collection.id}
                                    href={`/dashboard/collections/${collection.id}`}
                                    className="group relative bg-[#1a1d24] border border-white/5 hover:border-purple-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 block"
                                >
                                    {/* Image */}
                                    <div className="aspect-video relative bg-black/50 overflow-hidden">
                                        {collection.image_url ? (
                                            <Image
                                                src={collection.image_url}
                                                alt={collection.name}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-indigo-900/40">
                                                <Folder className="w-10 h-10 text-white/20 group-hover:text-purple-400/50 transition-colors" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1d24] via-transparent to-transparent opacity-80" />

                                        <div className="absolute bottom-0 left-0 p-4">
                                            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-purple-300 transition-colors mb-1">
                                                {collection.name}
                                            </h3>
                                            <p className="text-xs text-gray-400 line-clamp-2">
                                                {collection.description || "Explore this collection of amazing games."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Additional info footer */}
                                    <div className="px-4 py-3 bg-[#111318] border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                                        <span className="flex items-center gap-1 group-hover:text-purple-400 transition-colors">
                                            View Collection
                                        </span>
                                        <Folder className="w-3 h-3 group-hover:text-purple-400 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
