"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Users2, ArrowRight, ArrowLeft, RefreshCw, Search, Check, Plus, AlertCircle, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { usePresence } from "@/hooks/usePresence";

function InviteFriendsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get("roomId");

    const [user, setUser] = useState<any>(null);
    const [friends, setFriends] = useState<any[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [roomName, setRoomName] = useState("");
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Real-time presence for friends
    const { onlineUserIds, isOnline } = usePresence(user?.id);

    useEffect(() => {
        if (!roomId) {
            router.push("/dashboard/gameroom/create/mode");
            return;
        }

        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            // Fetch room current name
            const { data: roomData } = await supabase
                .from("game_rooms")
                .select("name")
                .eq("id", roomId)
                .single();
            setRoomName(roomData?.name || "");

            // Fetch friends (accepted only)
            const { data: friendsData } = await supabase
                .from("friendships")
                .select(`
                    id,
                    user:profiles!user_id(id, full_name, username, avatar_url),
                    friend:profiles!friend_id(id, full_name, username, avatar_url)
                `)
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                .eq("status", "accepted");

            const formatted = (friendsData || []).map((f: any) => {
                const other = f.user.id === user.id ? f.friend : f.user;
                return { id: other.id, name: other.full_name || other.username, username: other.username, avatar: other.avatar_url };
            });

            setFriends(formatted);
            setLoading(false);
        };

        fetchData();
    }, [roomId, router]);

    const toggleFriend = (id: string) => {
        setSelectedFriends(prev => 
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const handleFinalize = async () => {
        if (!roomId || finalizing) return;
        setFinalizing(true);
        setError(null);

        try {
            console.log("Finalizing roomId:", roomId);
            
            // 1. Update Room Name and set status to 'open'
            const { data: updateData, error: updateError } = await supabase
                .from("game_rooms")
                .update({ 
                    name: roomName.trim(),
                    status: 'open' 
                })
                .eq("id", roomId)
                .select();

            if (updateError) throw updateError;
            if (!updateData || updateData.length === 0) {
                throw new Error(`Room ${roomId} not found in database. Please go back and start over.`);
            }

            // 2. Send Invites
            if (selectedFriends.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Authentication required to send invites.");

                const invites = selectedFriends.map(friendId => ({
                    room_id: roomId,
                    inviter_id: user.id,
                    invitee_id: friendId,
                    status: 'pending'
                }));

                console.log("Sending invites:", invites);

                const { error: inviteError } = await supabase
                    .from("room_invites")
                    .insert(invites);
                
                if (inviteError) {
                    console.error("Invite insertion failed:", inviteError);
                    toast.error(`Some invites failed: ${inviteError.message}`, { duration: 6000 });
                } else {
                    toast.success(`${selectedFriends.length} invite(s) sent!`);
                }
            }

            toast.success("Room is now LIVE!");
            
            // 3. Redirect to Lobby
            setTimeout(() => {
                router.push(`/dashboard/gameroom/${roomId}/lobby`);
            }, 1000);
        } catch (err: any) {
            console.error("Error finalizing room:", err);
            const errorMessage = err.message || "Failed to finalize room.";
            setError(errorMessage);
            toast.error(errorMessage);
            setFinalizing(false);
        }
    };

    const filteredFriends = friends.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             f.username.toLowerCase().includes(searchQuery.toLowerCase());
        const online = isOnline(f.id);
        return matchesSearch && online;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Preparing friend list...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-3">Finalize Room</h2>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Name your room and invite your squad</p>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="space-y-8 mb-12">
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-4 mb-3 block">Room Name</label>
                    <input 
                        type="text" 
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="e.g. THE CHAMPIONS CLUB"
                        className="w-full bg-white/[0.03] border-2 border-white/5 rounded-[32px] px-8 py-5 text-xl font-black text-white outline-none focus:border-purple-500 transition-all placeholder:text-gray-800"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between px-4 mb-4">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Invite Online Friends</label>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{selectedFriends.length} Selected</span>
                    </div>
                    
                    <div className="bg-white/[0.03] border border-white/5 rounded-[40px] p-8">
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input 
                                type="text" 
                                placeholder="Search online friends..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-3 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-700"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                            {filteredFriends.length === 0 ? (
                                <div className="text-center py-12 opacity-20">
                                    <Users2 className="w-10 h-10 mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">{searchQuery ? "No online friends match your search" : "No friends are currently online"}</p>
                                </div>
                            ) : (
                                filteredFriends.map((friend) => (
                                    <button
                                        key={friend.id}
                                        onClick={() => toggleFriend(friend.id)}
                                        className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                                            selectedFriends.includes(friend.id) 
                                            ? "bg-purple-600/10 border-purple-500/30" 
                                            : "bg-white/5 border-transparent hover:bg-white/10"
                                        }`}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center relative overflow-hidden text-xs font-black uppercase border border-white/5">
                                                {friend.avatar ? (
                                                    <Image src={friend.avatar} alt="Avatar" fill className="object-cover" />
                                                ) : (
                                                    friend.username[0]
                                                )}
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0d0f14]" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-black text-white uppercase tracking-tight">{friend.name}</p>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">@{friend.username}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedFriends.includes(friend.id) ? "bg-purple-500 border-purple-500" : "border-white/10"
                                        }`}>
                                            {selectedFriends.includes(friend.id) ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-gray-600" />}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => router.back()}
                    className="flex-[0.3] py-5 bg-white/5 text-gray-500 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={handleFinalize}
                    disabled={finalizing || !roomName.trim()}
                    className="flex-1 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-3 shadow-[0_0_50px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                >
                    {finalizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                        <>
                            Open Lobby & Start
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function InviteFriendsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 text-purple-500 animate-spin" /></div>}>
            <InviteFriendsContent />
        </Suspense>
    );
}
