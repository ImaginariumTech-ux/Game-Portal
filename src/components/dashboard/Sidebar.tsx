"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import {
    Home, Gamepad2, Folder, DoorOpen, Users, Trophy,
    HelpCircle, BarChart3, Globe, MapPin, Calendar, LogOut, X, Menu
} from "lucide-react";
import { usePresence } from "@/hooks/usePresence";

const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: "Home", id: "home", href: "/dashboard" },
    { icon: <Gamepad2 className="w-4 h-4" />, label: "Games", id: "games", href: "/dashboard/games" },
    { icon: <Folder className="w-4 h-4" />, label: "Collections", id: "collections", href: "/dashboard/collections" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Game Room", id: "gameroom", href: "/dashboard/gameroom" },
    { icon: <Users className="w-4 h-4" />, label: "Friends", id: "friends", href: "/dashboard/friends" },
    { icon: <Trophy className="w-4 h-4" />, label: "Leaderboard", id: "leaderboard", href: null },
];

interface SidebarProps {
    onNavItemClick?: (id: string) => void;
    currentActiveId?: string;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ onNavItemClick, currentActiveId, isOpen, onClose }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [friends, setFriends] = useState<any[]>([]);
    const [inviteCount, setInviteCount] = useState(0);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await supabase
                    .from("profiles")
                    .select("full_name, avatar_url, location, created_at")
                    .eq("id", user.id)
                    .maybeSingle();

                if (data) setProfile(data);

                // Fetch real friendships
                const { data: friendsData } = await supabase
                    .from("friendships")
                    .select(`
                        id, status,
                        user_id, friend_id
                    `)
                    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                    .eq("status", "accepted");

                const formatted = (friendsData || []).map((f: any) => {
                    const isMeUser = f.user_id === user.id;
                    return isMeUser ? f.friend_id : f.user_id;
                });
                setFriends(formatted);

                // Initial invite count
                const { count } = await supabase
                    .from("room_invites")
                    .select("*", { count: "exact", head: true })
                    .eq("invitee_id", user.id)
                    .eq("status", "pending");
                setInviteCount(count || 0);

                // Subscribe to new invites
                const channel = supabase
                    .channel(`sidebar-invites-${user.id}`)
                    .on("postgres_changes", {
                        event: "*",
                        schema: "public",
                        table: "room_invites",
                        filter: `invitee_id=eq.${user.id}`,
                    }, async () => {
                        const { count } = await supabase
                            .from("room_invites")
                            .select("*", { count: "exact", head: true })
                            .eq("invitee_id", user.id)
                            .eq("status", "pending");
                        setInviteCount(count || 0);
                    })
                    .subscribe();

                return () => { supabase.removeChannel(channel); };
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    // Real-time presence
    const { onlineUserIds } = usePresence(user?.id);
    const onlineFriendsCount = friends.filter(id => onlineUserIds.has(id)).length;

    // Derived display data exactly matching the homepage
    const displayName = user?.user_metadata?.first_name || user?.email?.split("@")[0] || "Adventurer";
    const fullName = profile?.full_name || user?.user_metadata?.full_name || displayName;
    const location = profile?.location || user?.user_metadata?.location;
    const joinDateRaw = profile?.created_at || user?.created_at;
    const joinDate = joinDateRaw ? new Date(joinDateRaw).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
    const avatarUrl = profile?.avatar_url;

    // Determine active item if not explicitly passed
    let activePathId = currentActiveId;
    if (!activePathId) {
        if (pathname === "/dashboard") activePathId = "home";
        else if (pathname.startsWith("/dashboard/games")) activePathId = "games";
        else if (pathname.startsWith("/dashboard/collections")) activePathId = "collections";
        else if (pathname.startsWith("/dashboard/gameroom")) activePathId = "gameroom";
        else if (pathname.startsWith("/dashboard/friends")) activePathId = "friends";
        else if (pathname.startsWith("/dashboard/gamers")) activePathId = "home"; // Fallback
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-[#111318] border-r border-white/5 flex flex-col 
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
                md:relative md:translate-x-0 md:w-52 md:flex-shrink-0
            `}>
                {/* Logo & Close Button */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 relative rounded-lg overflow-hidden bg-purple-600/20 border border-purple-500/30">
                            <Image src="/magic-logo-white.png" alt="Logo" fill className="object-contain p-1" />
                        </div>
                        <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Magic Games
                        </span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="md:hidden p-2 text-gray-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

            {/* Player profile mini-card */}
            <div className="p-3 border-b border-white/5">
                <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                        {avatarUrl ? (
                            <div className="w-9 h-9 relative rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-black flex-shrink-0">
                                {displayName[0]?.toUpperCase() || "G"}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{fullName}</p>
                            <p className="text-[9px] text-purple-400 font-medium">Player</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {location && (
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">{location}</span>
                            </div>
                        )}
                        {joinDate && (
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                <span>Joined {joinDate}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.href) {
                                router.push(item.href);
                            } else if (onNavItemClick) {
                                onNavItemClick(item.id);
                            }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activePathId === item.id
                            ? "bg-purple-600/20 text-purple-300 border border-purple-500/20"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        {item.icon}
                        {item.label}
                        {/* Live online badge on Friends nav item */}
                        {item.id === "friends" && onlineFriendsCount > 0 && (
                            <span className="ml-auto flex items-center gap-1 bg-green-500/20 text-green-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-green-500/30">
                                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                                {onlineFriendsCount}
                            </span>
                        )}
                        {/* Live invite badge on Game Room nav item */}
                        {item.id === "gameroom" && inviteCount > 0 && (
                            <span className="ml-auto flex items-center justify-center w-4 h-4 bg-amber-500 text-black text-[10px] font-black rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-bounce">
                                {inviteCount}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-white/5 space-y-0.5">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                    <HelpCircle className="w-3.5 h-3.5" /> Help Center
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                    <BarChart3 className="w-3.5 h-3.5" /> Rank System
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                    <Globe className="w-3.5 h-3.5" /> English
                </button>
                {/* Ensure friends page and others with logout buttons also see logout on standard sidebar */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-500 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all mt-2"
                >
                    <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
            </div>
        </aside>
    </>
    );
}
