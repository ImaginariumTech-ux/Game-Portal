"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft, Home, Gamepad2, Folder, DoorOpen, Users, Trophy,
    HelpCircle, BarChart3, LogOut, CheckCircle, XCircle, UserPlus,
    UserMinus, UserCheck, Calendar, MapPin, Sparkles, Zap, Bell, Wallet, Star, Menu
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    location: string | null;
    username: string | null;
    created_at: string;
}

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", href: "/dashboard/collections" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", href: null },
    { icon: <Users className="w-4 h-4" />, label: "Friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", href: null },
];

export default function GamerProfilePage() {
    const params = useParams();
    const router = useRouter();
    const targetUserId = params.id as string;

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
    const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState({ plays: 0, reviews: 0 });
    const [loading, setLoading] = useState(true);

    // Friendship status: 'none', 'pending', 'incoming', 'friends'
    const [friendshipStatus, setFriendshipStatus] = useState("none");
    const [friendshipId, setFriendshipId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }
            setCurrentUser(user);

            if (user.id === targetUserId) {
                // Should probably redirect to a "my profile" page or similar
                // For now, let them see their own profile but without add friend buttons
                setFriendshipStatus("self");
            }

            // Get Current User Profile for Sidebar
            const { data: cProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();
            if (cProfile) setCurrentUserProfile(cProfile);

            // Get Target Profile
            const { data: tProfile, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", targetUserId)
                .maybeSingle();

            if (error || !tProfile) {
                setLoading(false);
                return;
            }

            setTargetProfile(tProfile);

            // Get Friendship Status
            if (user.id !== targetUserId) {
                const { data: friendData } = await supabase
                    .from("friendships")
                    .select("*")
                    .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
                    .maybeSingle();

                if (friendData) {
                    setFriendshipId(friendData.id);
                    if (friendData.status === "accepted") {
                        setFriendshipStatus("friends");
                    } else if (friendData.status === "pending") {
                        setFriendshipStatus(friendData.user_id === user.id ? "pending" : "incoming");
                    }
                }
            }

            // Count their reviews
            const { count: reviewCount } = await supabase
                .from("game_ratings")
                .select("*", { count: "exact" })
                .eq("user_id", targetUserId);

            setStats(prev => ({ ...prev, reviews: reviewCount || 0 }));
            // Note: we don't track player play history yet, so plays is 0 for now.

            setLoading(false);
        };
        init();
    }, [targetUserId, router]);

    const handleAction = async (action: 'send' | 'accept' | 'decline' | 'remove') => {
        if (!currentUser || !targetUserId) return;
        setActionLoading(true);

        try {
            if (action === 'send') {
                const { data } = await supabase.from("friendships").insert({
                    user_id: currentUser.id,
                    friend_id: targetUserId,
                    status: "pending"
                }).select().single();
                if (data) {
                    setFriendshipId(data.id);
                    setFriendshipStatus("pending");
                }
            } else if (action === 'accept' && friendshipId) {
                await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
                setFriendshipStatus("friends");
            } else if ((action === 'decline' || action === 'remove') && friendshipId) {
                await supabase.from("friendships").delete().eq("id", friendshipId);
                setFriendshipId(null);
                setFriendshipStatus("none");
            }
        } catch (err) {
            console.error("Action error:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0d0f14] text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
            </div>
        );
    }

    if (!targetProfile) {
        return (
            <div className="flex h-screen bg-[#0d0f14] items-center justify-center flex-col gap-4 text-white">
                <Users className="w-16 h-16 text-gray-700" />
                <p className="text-gray-400 text-lg font-semibold">Gamer not found</p>
                <Link href="/dashboard/friends" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Friends
                </Link>
            </div>
        );
    }

    // Sidebar Data
    const cFullName = currentUserProfile?.full_name || "Gamer";
    const cInitials = cFullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";
    const cAvatar = currentUserProfile?.avatar_url;

    // Profile Data
    const tFullName = targetProfile.full_name;
    const tInitials = tFullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "G";

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">
            {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
            <Sidebar 
                currentActiveId="home" 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* ── Main content ──────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="absolute top-0 left-0 w-full h-16 z-20 flex items-center px-6 gap-3">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors bg-black/40 backdrop-blur-md rounded-full border border-white/10"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <Link href="/dashboard/friends" className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {/* Hero Banner */}
                    <div className="relative h-64 bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-black border-b border-white/5">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0d0f14] to-transparent"></div>
                    </div>

                    <div className="max-w-4xl mx-auto px-6 pb-20 -mt-24 relative z-10 w-full">
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-8">
                            <div className="w-40 h-40 rounded-3xl bg-[#1a1d24] border-4 border-[#0d0f14] flex items-center justify-center overflow-hidden shadow-2xl relative">
                                {targetProfile.avatar_url ? (
                                    <Image src={targetProfile.avatar_url} alt="" fill className="object-cover" />
                                ) : (
                                    <span className="text-5xl font-black bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                        {tInitials}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 pb-2">
                                <h1 className="text-4xl font-black text-white leading-tight mb-2">{tFullName}</h1>
                                <p className="text-purple-400 font-bold tracking-wide">@{targetProfile.username || "gamer"}</p>
                            </div>

                            {/* Friendship Actions */}
                            <div className="pb-2 flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                                {friendshipStatus === "none" && (
                                    <button
                                        onClick={() => handleAction('send')}
                                        disabled={actionLoading}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50"
                                    >
                                        <UserPlus className="w-5 h-5" /> Add Friend
                                    </button>
                                )}

                                {friendshipStatus === "pending" && (
                                    <button
                                        onClick={() => handleAction('remove')}
                                        disabled={actionLoading}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-gray-300 hover:text-red-400 px-6 py-3 rounded-xl font-bold transition disabled:opacity-50"
                                    >
                                        <XCircle className="w-5 h-5" /> Cancel Request
                                    </button>
                                )}

                                {friendshipStatus === "incoming" && (
                                    <>
                                        <button
                                            onClick={() => handleAction('accept')}
                                            disabled={actionLoading}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-5 h-5" /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleAction('decline')}
                                            disabled={actionLoading}
                                            className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-gray-300 hover:text-red-400 rounded-xl transition disabled:opacity-50"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </>
                                )}

                                {friendshipStatus === "friends" && (
                                    <button
                                        onClick={() => confirm("Are you sure you want to remove this friend?") && handleAction('remove')}
                                        disabled={actionLoading}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-emerald-400 hover:text-red-400 px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 group"
                                    >
                                        <div className="group-hover:hidden flex items-center gap-2">
                                            <UserCheck className="w-5 h-5" /> Friends
                                        </div>
                                        <div className="hidden group-hover:flex items-center gap-2">
                                            <UserMinus className="w-5 h-5" /> Unfriend
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Details Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#1a1d24] border border-white/5 rounded-2xl p-6">
                                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-4">Gamer Profile</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Origin</p>
                                            <p className="text-sm font-medium text-white">{targetProfile.location || "Unknown Realm"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Joined</p>
                                            <p className="text-sm font-medium text-white">{new Date(targetProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1a1d24] border border-white/5 rounded-2xl p-6 md:col-span-2">
                                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-4">Activity Stats</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                        <Zap className="w-5 h-5 text-yellow-400 mb-2" />
                                        <p className="text-2xl font-black text-white">0</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Games Played</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                        <Star className="w-5 h-5 text-purple-400 mb-2" />
                                        <p className="text-2xl font-black text-white">{stats.reviews}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Games Rated</p>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                        <Trophy className="w-5 h-5 text-emerald-400 mb-2" />
                                        <p className="text-2xl font-black text-white">0</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Achievements</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
