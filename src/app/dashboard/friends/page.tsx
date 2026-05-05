"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import {
    Home, Gamepad2, Folder, DoorOpen, Users, Trophy, Bell,
    LogOut, Search, UserMinus, UserCheck, CheckCircle, XCircle, UserPlus,
    Sparkles, Zap, MapPin, Calendar, Heart, Shield, ExternalLink, Menu, Wallet
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { usePresence } from "@/hooks/usePresence";

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", href: "/dashboard/collections" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", href: null },
    { icon: <Users className="w-4 h-4" />, label: "Friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", href: null },
];

interface FriendRequest {
    id: string;
    status: string;
    created_at: string;
    friend_id: string;
    profiles: {
        id: string;
        full_name: string;
        avatar_url: string;
        location: string;
        username?: string;
    };
    is_incoming: boolean;
}

export default function FriendsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("MY_FRIENDS"); // "MY_FRIENDS", "REQUESTS", "ADD_FRIENDS"

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const [friends, setFriends] = useState<FriendRequest[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Real-time presence
    const { isOnline, onlineUserIds } = usePresence(user?.id);
    const onlineFriendsCount = friends.filter(f => isOnline(f.friend_id)).length;

    // Sidebar states
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }
            setUser(user);

            // Fetch profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

            if (profile) {
                setFullName(profile.full_name || user.email?.split("@")[0] || "Gamer");
                setAvatarUrl(profile.avatar_url);
            }

            fetchFriendships(user.id);
        };
        init();
    }, [router]);

    const fetchFriendships = async (userId: string) => {
        const { data, error } = await supabase
            .from("friendships")
            .select(`
                id, status, created_at, user_id, friend_id,
                user:profiles!user_id(id, full_name, avatar_url, location, username),
                friend:profiles!friend_id(id, full_name, avatar_url, location, username)
            `)
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (error) {
            console.error("Error fetching friendships:", error);
            setLoading(false);
            return;
        }

        const formatted: FriendRequest[] = (data || []).map((f: any) => {
            const isIncoming = f.friend_id === userId;
            const otherProfile = isIncoming ? f.user : f.friend;
            return {
                id: f.id,
                status: f.status,
                created_at: f.created_at,
                friend_id: otherProfile.id,
                profiles: otherProfile,
                is_incoming: isIncoming
            };
        });

        setFriends(formatted.filter(f => f.status === "accepted"));
        setRequests(formatted.filter(f => f.status === "pending"));
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim() || !user) return;
        setSearching(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, location, username")
            .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
            .neq("id", user.id)
            .limit(20);

        if (error) {
            console.error(error);
        } else {
            setSearchResults(data || []);
        }
        setSearching(false);
    };

    const handleSendRequest = async (targetId: string) => {
        if (!user) return;
        setActionLoading(targetId);

        const { data: existing } = await supabase
            .from("friendships")
            .select("id")
            .or(`and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id})`)
            .maybeSingle();

        if (!existing) {
            await supabase.from("friendships").insert({
                user_id: user.id,
                friend_id: targetId,
                status: "pending"
            });
            fetchFriendships(user.id);
        }
        setActionLoading(null);
    };

    const handleAcceptRequest = async (friendshipId: string) => {
        setActionLoading(friendshipId);
        await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
        if (user) fetchFriendships(user.id);
        setActionLoading(null);
    };

    const handleDeclineRequest = async (friendshipId: string) => {
        setActionLoading(friendshipId);
        await supabase.from("friendships").delete().eq("id", friendshipId);
        if (user) fetchFriendships(user.id);
        setActionLoading(null);
    };

    const handleRemoveFriend = async (friendshipId: string) => {
        if (!confirm("Are you sure you want to remove this friend?")) return;
        setActionLoading(friendshipId);
        await supabase.from("friendships").delete().eq("id", friendshipId);
        if (user) fetchFriendships(user.id);
        setActionLoading(null);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const isFriendOrPending = (targetId: string) => {
        const f = friends.find(x => x.friend_id === targetId);
        if (f) return "friends";
        const r = requests.find(x => x.friend_id === targetId);
        if (r) return r.is_incoming ? "incoming" : "pending";
        return "none";
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0d0f14] text-white">
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 animate-pulse">
                    <Users className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="flex gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
            </div>
        );
    }

    const initials = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">
            {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
            {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
            <Sidebar 
                currentActiveId="friends" 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            {/* ── Main content ──────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-[#090b0f]">
                {/* Background ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none opacity-50 mix-blend-screen"></div>
                <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-indigo-900/10 blur-[100px] rounded-full pointer-events-none opacity-50"></div>
                
                {/* Top Bar (Consistent with other pages) */}
                <header className="h-12 flex-shrink-0 bg-transparent border-b border-white/5 flex items-center px-4 gap-3 relative z-20">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-full px-3 py-1.5">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white">M</span>
                        </div>
                        <span className="text-sm font-bold text-white">1,022.00</span>
                    </div>
                    <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1.5">
                        <Wallet className="w-3 h-3" /> Wallet
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-black/40 px-2 py-1 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto relative z-10 w-full no-scrollbar">

                    {/* Hero Header */}
                    <div className="relative pt-16 pb-12 px-8 md:px-12 border-b border-white/5 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none"></div>
                        <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200 tracking-tight leading-tight mb-2">
                                    Connections
                                </h1>
                                <p className="text-gray-400 mt-2 max-w-md font-medium">Build your network, find worthy adversaries, and assemble your ultimate gaming squad.</p>
                            </div>

                            <div className="flex items-center gap-3 pb-2">
                                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-xl">
                                    <Users className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm font-bold text-white">{friends.length} <span className="text-gray-500 font-medium ml-1">Friends</span></span>
                                </div>
                                {onlineFriendsCount > 0 && (
                                    <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-md px-4 py-2.5 rounded-full border border-green-500/20 shadow-xl">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-sm font-bold text-green-300">{onlineFriendsCount} <span className="text-green-500/70 font-medium ml-1">Online</span></span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-xl">
                                    <Bell className={`w-4 h-4 ${requests.filter(r => r.is_incoming).length > 0 ? "text-amber-400" : "text-gray-500"}`} />
                                    <span className="text-sm font-bold text-white">{requests.filter(r => r.is_incoming).length} <span className="text-gray-500 font-medium ml-1">Requests</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:px-12 max-w-6xl mx-auto w-full">
                        {/* Tabs */}
                        <div className="flex items-center p-1.5 mb-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl w-fit shadow-2xl">
                            {[
                                { id: "MY_FRIENDS", label: "My Squad", icon: <Shield className="w-4 h-4" /> },
                                { id: "REQUESTS", label: "Pending", icon: <Bell className="w-4 h-4" /> },
                                { id: "ADD_FRIENDS", label: "Add Friends", icon: <Search className="w-4 h-4" /> }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 overflow-hidden ${activeTab === tab.id
                                        ? "text-white shadow-lg"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {activeTab === tab.id && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-100 transition-opacity"></div>
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab.icon}
                                        {tab.label}
                                        {tab.id === "REQUESTS" && requests.length > 0 && (
                                            <span className="bg-amber-500 text-black px-2 py-0.5 rounded-full text-[10px] ml-1">{requests.length}</span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">

                            {/* MY FRIENDS TAB */}
                            {activeTab === "MY_FRIENDS" && (
                                <div>
                                    {friends.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-32 px-4 bg-gradient-to-b from-white/5 to-transparent rounded-3xl border border-white/5 backdrop-blur-sm text-center">
                                            <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 flex items-center justify-center rotate-12 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
                                                <Users className="w-10 h-10 text-purple-400 -rotate-12" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white tracking-tight mb-2">It's quiet here...</h3>
                                            <p className="text-gray-400 max-w-sm mb-8">You haven't formed any alliances yet. Search the network and invite gamers to your squad.</p>
                                            <button
                                                onClick={() => setActiveTab("ADD_FRIENDS")}
                                                className="group relative px-8 py-4 bg-white text-black font-black text-sm uppercase tracking-widest rounded-xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all"
                                            >
                                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                                <span className="relative z-10">Add Friends</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {friends.map(friend => (
                                                <div
                                                    key={friend.id}
                                                    onClick={(e) => {
                                                        if ((e.target as any).closest("button")) return;
                                                        router.push(`/dashboard/gamers/${friend.friend_id}`);
                                                    }}
                                                    className="group relative bg-[#13151a]/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/20"
                                                >
                                                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"></div>

                                                    <div className="p-6 flex flex-col items-center text-center relative z-10">
                                                        <div className="relative w-20 h-20 mb-4">
                                                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-900/30 p-0.5 transform -rotate-3 transition-transform group-hover:rotate-0 duration-300">
                                                                <div className="w-full h-full bg-[#13151a] rounded-xl overflow-hidden relative">
                                                                    {friend.profiles.avatar_url ? (
                                                                        <Image src={friend.profiles.avatar_url} alt="" fill className="object-cover" />
                                                                    ) : (
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-600/20">
                                                                            <span className="font-black text-2xl text-white">{friend.profiles.full_name[0]?.toUpperCase()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Online presence dot */}
                                                            <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#13151a] ${isOnline(friend.friend_id) ? "bg-green-400" : "bg-gray-600"
                                                                }`} />
                                                        </div>

                                                        <h4 className="font-black text-lg text-white mb-1 group-hover:text-purple-300 transition-colors">{friend.profiles.full_name}</h4>
                                                        <p className="text-xs font-medium text-gray-500 mb-6">@{friend.profiles.username || "gamer"}</p>

                                                        <div className="w-full flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                <Gamepad2 className="w-3.5 h-3.5" />
                                                                Squad
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.id); }}
                                                                disabled={actionLoading === friend.id}
                                                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30 transition-all z-20"
                                                                title="Remove friend"
                                                            >
                                                                <UserMinus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* REQUESTS TAB */}
                            {activeTab === "REQUESTS" && (
                                <div className="space-y-12">
                                    {/* Incoming Requests */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-amber-400" />
                                            </div>
                                            <h3 className="text-xl font-black text-white">Incoming Summons</h3>
                                        </div>

                                        {requests.filter(r => r.is_incoming).length === 0 ? (
                                            <div className="py-12 px-6 bg-[#13151a]/50 border border-white/5 rounded-2xl flex items-center text-gray-500 font-medium">
                                                No one is seeking your alliance at the moment.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                                {requests.filter(r => r.is_incoming).map(req => (
                                                    <div key={req.id} className="relative bg-gradient-to-r from-white/5 to-[#13151a] p-1 border border-white/10 rounded-2xl group overflow-hidden shadow-xl shadow-black/50">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                                        <div className="bg-[#13151a] p-5 rounded-xl h-full flex flex-col justify-between relative z-10">
                                                            <div className="flex items-start gap-4 mb-6">
                                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5 shadow-lg flex-shrink-0">
                                                                    <div className="w-full h-full rounded-full overflow-hidden bg-black relative">
                                                                        {req.profiles.avatar_url ? (
                                                                            <Image src={req.profiles.avatar_url} alt="" fill className="object-cover" />
                                                                        ) : (
                                                                            <span className="absolute inset-0 flex items-center justify-center font-bold text-lg">{req.profiles.full_name[0]?.toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0 pt-1">
                                                                    <p className="font-black text-base text-white truncate">{req.profiles.full_name}</p>
                                                                    <p className="text-xs text-amber-400 font-medium mt-1">Wants to ally</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 grid grid-cols-2">
                                                                <button
                                                                    onClick={() => handleAcceptRequest(req.id)}
                                                                    disabled={actionLoading === req.id}
                                                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" /> Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeclineRequest(req.id)}
                                                                    disabled={actionLoading === req.id}
                                                                    className="w-full py-3 bg-white/5 hover:bg-red-500 border border-white/10 hover:border-red-500 text-gray-300 hover:text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                                                >
                                                                    Ignore
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    {/* Outgoing Requests */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-400">Sent Invitations</h3>
                                        </div>

                                        {requests.filter(r => !r.is_incoming).length === 0 ? (
                                            <p className="text-sm text-gray-600">No active outbound requests.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {requests.filter(r => !r.is_incoming).map(req => (
                                                    <div key={req.id} className="bg-[#13151a]/40 border border-white/5 p-4 rounded-xl flex items-center gap-4 opacity-80 backdrop-blur-sm">
                                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            {req.profiles.avatar_url ? (
                                                                <Image src={req.profiles.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full grayscale opacity-70" />
                                                            ) : (
                                                                <span className="font-bold text-xs text-gray-500">{req.profiles.full_name[0]?.toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-gray-300 truncate">{req.profiles.full_name}</p>
                                                            <p className="text-[10px] uppercase font-bold text-purple-400/70 tracking-wider">Awaiting response</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeclineRequest(req.id)}
                                                            disabled={actionLoading === req.id}
                                                            className="text-gray-500 hover:text-red-400 transition-colors p-2"
                                                            title="Cancel Request"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}

                            {/* ADD FRIENDS TAB */}
                            {activeTab === "ADD_FRIENDS" && (
                                <div className="space-y-8 max-w-4xl mx-auto">
                                    <div className="bg-gradient-to-b from-indigo-900/40 to-[#13151a] p-1.5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full"></div>
                                        <div className="relative flex flex-col md:flex-row gap-2 z-10 p-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                    placeholder="Search database by alias or full name..."
                                                    className="w-full bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-black/60 transition-all font-medium text-lg h-full"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSearch}
                                                disabled={searching || !searchQuery.trim()}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 px-10 rounded-2xl transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] active:scale-95 uppercase tracking-widest text-sm"
                                            >
                                                {searching ? "Scanning..." : "Search"}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        {searchResults.length > 0 ? (
                                            <div className="space-y-4">
                                                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest pl-2">Search Results ({searchResults.length})</p>
                                                {searchResults.map((res, i) => {
                                                    const status = isFriendOrPending(res.id);
                                                    return (
                                                        <div
                                                            key={res.id}
                                                            onClick={(e) => {
                                                                if ((e.target as any).closest("button")) return;
                                                                router.push(`/dashboard/gamers/${res.id}`);
                                                            }}
                                                            className="group bg-[#13151a] hover:bg-white/5 p-4 md:p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4"
                                                            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                                                        >
                                                            <div className="flex items-center gap-5 min-w-0">
                                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg flex-shrink-0">
                                                                    <div className="w-full h-full bg-black rounded-full overflow-hidden relative">
                                                                        {res.avatar_url ? (
                                                                            <Image src={res.avatar_url} alt="" fill className="object-cover" />
                                                                        ) : (
                                                                            <span className="absolute inset-0 flex items-center justify-center font-black text-xl text-white">{res.full_name[0]?.toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-lg text-white truncate drop-shadow-sm">{res.full_name}</p>
                                                                    <p className="text-xs font-medium text-indigo-300">@{res.username || "gamer"}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex-shrink-0 pl-4">
                                                                {status === "friends" && (
                                                                    <div className="px-5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                                                        <UserCheck className="w-4 h-4" /> Allies
                                                                    </div>
                                                                )}
                                                                {status === "pending" && (
                                                                    <div className="px-5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 font-black text-xs uppercase tracking-widest">
                                                                        Request Sent
                                                                    </div>
                                                                )}
                                                                {status === "incoming" && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setActiveTab("REQUESTS"); }}
                                                                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                                                    >
                                                                        Respond
                                                                    </button>
                                                                )}
                                                                {status === "none" && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleSendRequest(res.id); }}
                                                                        disabled={actionLoading === res.id}
                                                                        className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-indigo-50 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:-translate-y-0.5"
                                                                    >
                                                                        <UserPlus className="w-4 h-4" /> Add Friend
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            searchQuery && !searching && (
                                                <div className="text-center py-20 px-4">
                                                    <Search className="w-12 h-12 text-white/5 mx-auto mb-4" />
                                                    <p className="text-gray-400 text-lg font-medium">No signal found matching <span className="text-white">"{searchQuery}"</span></p>
                                                    <p className="text-gray-600 text-sm mt-2">Try adjusting your scanner frequencies (check spelling).</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div >
    );
}
