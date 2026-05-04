"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
    Plus, 
    RefreshCw, 
    LayoutGrid, 
    Heart, 
    DoorOpen, 
    ArrowRight,
    Gamepad2,
    Users2,
    Crown,
    Wallet,
    Trash2,
    XCircle,
    CheckCircle2,
    Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Sidebar from "@/components/dashboard/Sidebar";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Room {
    id: string;
    name: string;
    join_code: string;
    host_id: string;
    game_id: string;
    mode: 'friend_room' | 'online_ranked' | 'practice';
    status: 'forming' | 'open' | 'live' | 'dissolved';
    stake_amount: number;
    max_players: number;
    player_count?: number;
    game?: {
        title: string;
        thumbnail_url: string;
        game_url?: string;
        slug?: string;
    };
    host_profile?: {
        full_name: string;
        username: string;
        avatar_url: string;
    };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GameRoomPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my_rooms' | 'invites'>('my_rooms');

    const [myRoom, setMyRoom] = useState<Room | null>(null);
    const [myInvites, setMyInvites] = useState<any[]>([]);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        let roomSubscription: any;
        let inviteSubscription: any;
        let playerSubscription: any;

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }
            setUser(user);
            await fetchData(user.id);
            setLoading(false);

            // ── Real-time Listeners ──

            // Listen for room changes
            roomSubscription = supabase
                .channel('room_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, () => {
                    fetchData(user.id);
                })
                .subscribe();

            // Listen for invite changes
            inviteSubscription = supabase
                .channel('invite_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'room_invites', filter: `invitee_id=eq.${user.id}` }, () => {
                    fetchData(user.id);
                })
                .subscribe();

            // Listen for player membership changes
            playerSubscription = supabase
                .channel('player_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `user_id=eq.${user.id}` }, () => {
                    fetchData(user.id);
                })
                .subscribe();
        };

        init();

        return () => {
            if (roomSubscription) supabase.removeChannel(roomSubscription);
            if (inviteSubscription) supabase.removeChannel(inviteSubscription);
            if (playerSubscription) supabase.removeChannel(playerSubscription);
        };
    }, []);

    const fetchData = async (userId: string) => {
        // 1. Fetch Active Room (Hosted or Joined)
        let activeRoomData = null;

        // Try hosting first
        const { data: hosted } = await supabase
            .from("game_rooms")
            .select(`
                *,
                game:games(title, thumbnail_url),
                players:room_players(count)
            `)
            .eq("host_id", userId)
            .neq("status", "dissolved")
            .limit(1)
            .maybeSingle();

        if (hosted) {
            activeRoomData = hosted;
        } else {
            // Check if user is a guest in an active room
            const { data: membership } = await supabase
                .from("room_players")
                .select("room_id")
                .eq("user_id", userId)
                .is("left_at", null)
                .limit(1)
                .maybeSingle();

            if (membership) {
                const { data: joined } = await supabase
                    .from("game_rooms")
                    .select(`
                        *,
                        game:games(title, thumbnail_url),
                        players:room_players(count)
                    `)
                    .eq("id", membership.room_id)
                    .neq("status", "dissolved")
                    .maybeSingle();
                
                if (joined) activeRoomData = joined;
            }
        }
        
        if (activeRoomData) {
            // Handle count aggregation format (Supabase sometimes returns [{count: X}] or {count: X})
            const rawCount = activeRoomData.players;
            const pCount = Array.isArray(rawCount) ? (rawCount[0]?.count || 0) : (rawCount?.count || 0);

            setMyRoom({
                ...activeRoomData,
                player_count: pCount
            });
        } else {
            setMyRoom(null);
        }

        // 2. Fetch Pending Invites
        const { data: invites } = await supabase
            .from("room_invites")
            .select(`
                id, status, created_at,
                room:game_rooms(
                    id, name, join_code, mode, stake_amount, status,
                    game:games(title, thumbnail_url),
                    host:profiles!host_id(full_name, username, avatar_url)
                )
            `)
            .eq("invitee_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        setMyInvites(invites || []);
    };

    const handleCancelRoom = async () => {
        if (!myRoom || cancelling) return;
        if (!confirm("End this room? All players will be removed and any pending invites will expire.")) return;

        setCancelling(true);
        const { error } = await supabase
            .from("game_rooms")
            .update({ status: "dissolved", dissolved_at: new Date().toISOString() })
            .eq("id", myRoom.id);

        if (!error) {
            setMyRoom(null);
        }
        setCancelling(false);
    };

    const handleAcceptInvite = async (invite: any) => {
        const { error } = await supabase
            .from("room_invites")
            .update({ status: "accepted" })
            .eq("id", invite.id);

        if (!error) {
            router.push(`/dashboard/gameroom/${invite.room.id}/lobby`);
        }
    };

    const handleDeclineInvite = async (inviteId: string) => {
        await supabase
            .from("room_invites")
            .update({ status: "declined" })
            .eq("id", inviteId);
        
        setMyInvites(prev => prev.filter(i => i.id !== inviteId));
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0d0f14] items-center justify-center">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">
            <Sidebar currentActiveId="gameroom" />

            <div className="flex-1 flex flex-col overflow-hidden bg-[#090b0f] relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />

                <main className="flex-1 overflow-y-auto relative z-10 no-scrollbar">
                    <header className="pt-16 pb-8 px-8 md:px-12">
                        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-2 uppercase italic">Game Rooms</h1>
                                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]">Rooms dissolve when the session ends. No host, no room.</p>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        placeholder="ENTER ROOM CODE"
                                        id="room-code-input"
                                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black tracking-[0.3em] uppercase w-48 focus:w-64 focus:bg-white/10 focus:border-purple-500/50 outline-none transition-all placeholder:text-gray-700"
                                    />
                                    <button 
                                        onClick={async () => {
                                            const input = document.getElementById('room-code-input') as HTMLInputElement;
                                            const code = input.value.trim().toUpperCase();
                                            if (!code) return;
                                            
                                            const { data: room, error: roomError } = await supabase
                                                .from("game_rooms")
                                                .select("id, status")
                                                .eq("join_code", code)
                                                .neq("status", "dissolved")
                                                .maybeSingle();
                                            
                                            if (roomError || !room) {
                                                return;
                                            }

                                            // Request to join
                                            const { error: joinError } = await supabase
                                                .from("room_players")
                                                .insert({
                                                    room_id: room.id,
                                                    user_id: user.id,
                                                    status: 'pending',
                                                    is_ready: false
                                                });
                                            
                                            if (!joinError) {
                                                router.push(`/dashboard/gameroom/${room.id}/lobby`);
                                            }
                                        }}
                                        className="absolute right-2 top-2 bottom-2 px-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                                    >
                                        <ArrowRight className="w-4 h-4 text-purple-400" />
                                    </button>
                                </div>

                                <button 
                                    onClick={() => router.push("/dashboard/gameroom/create/mode")}
                                    disabled={!!myRoom}
                                    title={myRoom ? "You already have an active room. Cancel it before creating a new one." : ""}
                                    className="flex items-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.2)] transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Room
                                </button>
                            </div>
                        </div>
                    </header>

                    <nav className="max-w-6xl mx-auto px-8 md:px-12 mb-12">
                        <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl w-fit">
                            <button
                                onClick={() => setActiveTab('my_rooms')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'my_rooms' ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                My Room
                            </button>
                            <button
                                onClick={() => setActiveTab('invites')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all relative ${activeTab === 'invites' ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                            >
                                <Heart className="w-3.5 h-3.5" />
                                Invites
                                {myInvites.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-bounce">
                                        {myInvites.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </nav>

                    <div className="max-w-6xl mx-auto px-8 md:px-12 pb-20">
                        {activeTab === 'my_rooms' ? (
                            <section>
                                {!myRoom ? (
                                    <div className="flex flex-col items-center justify-center py-32 px-4 bg-white/[0.02] rounded-[40px] border border-white/5 text-center">
                                        <div className="w-24 h-24 mb-6 rounded-[32px] bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                            <DoorOpen className="w-10 h-10 text-purple-400/30" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight italic">No active room</h3>
                                        <p className="text-gray-600 font-bold text-xs max-w-xs mb-10 uppercase tracking-widest leading-relaxed">Create a room to invite friends and start playing your favorite games.</p>
                                        <button 
                                            onClick={() => router.push("/dashboard/gameroom/create/mode")}
                                            className="px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-purple-100 transition-all active:scale-95 flex items-center gap-3"
                                        >
                                            Start Hosting <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-[#13151a] border border-white/10 rounded-[40px] p-10 flex flex-col group relative overflow-hidden">
                                            {/* Status Dot */}
                                            <div className="absolute top-8 right-8 flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${myRoom.status === 'live' ? 'bg-green-500 animate-pulse' : 'bg-purple-500 pulsing-dot'}`} />
                                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{myRoom.status}</span>
                                            </div>

                                            <div className="flex items-center gap-6 mb-10">
                                                <div className="w-20 h-20 rounded-3xl bg-purple-500/20 flex items-center justify-center border border-white/5 relative overflow-hidden shadow-2xl">
                                                    {myRoom.game?.thumbnail_url ? (
                                                        <Image src={myRoom.game.thumbnail_url} alt="Game" fill className="object-cover" />
                                                    ) : (
                                                        <Gamepad2 className="w-8 h-8 text-purple-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h2 className="text-3xl font-black text-white uppercase tracking-tight italic mb-1">{myRoom.name}</h2>
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-purple-600/20 text-purple-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{myRoom.mode.replace('_', ' ')}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{myRoom.game?.title}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 mb-10">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Join Code</p>
                                                    <p className="text-sm font-mono font-black text-white tracking-widest">{myRoom.join_code}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Players</p>
                                                    <p className="text-sm font-black text-white">{myRoom.player_count} / {myRoom.max_players}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Stakes</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <Wallet className="w-3.5 h-3.5 text-amber-500" />
                                                        <p className="text-sm font-black text-amber-500">{myRoom.stake_amount || 'Free'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 mt-auto">
                                                <button 
                                                    onClick={() => router.push(`/dashboard/gameroom/${myRoom.id}/lobby`)}
                                                    className="flex-1 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-purple-100 transition-all active:scale-95"
                                                >
                                                    Open Lobby
                                                </button>
                                                <button 
                                                    onClick={handleCancelRoom}
                                                    disabled={cancelling}
                                                    className="w-16 h-14 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-red-500 transition-all active:scale-95"
                                                >
                                                    {cancelling ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        ) : (
                            <section>
                                {myInvites.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-32 px-4 bg-white/[0.02] rounded-[40px] border border-white/5 text-center">
                                        <div className="w-24 h-24 mb-6 rounded-[32px] bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                            <Heart className="w-10 h-10 text-amber-500/30" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight italic">No pending invites</h3>
                                        <p className="text-gray-600 font-bold text-xs max-w-xs uppercase tracking-widest leading-relaxed">When a friend invites you to a room, it will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {myInvites.map((invite) => (
                                            <div key={invite.id} className="bg-[#13151a] border border-white/10 rounded-[40px] p-8 flex flex-col group relative overflow-hidden">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center relative overflow-hidden border border-amber-500/10 text-amber-500 font-black text-lg">
                                                        {invite.room?.host?.avatar_url ? (
                                                            <Image src={invite.room.host.avatar_url} alt="Host" fill className="object-cover" />
                                                        ) : (
                                                            invite.room?.host?.username?.[0]?.toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-white uppercase tracking-tight">{invite.room?.name}</h4>
                                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">From {invite.room?.host?.full_name}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 mb-8">
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-4">
                                                        <span className="text-gray-600">Game</span>
                                                        <span className="text-purple-400">{invite.room?.game?.title}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-4">
                                                        <span className="text-gray-600">Mode</span>
                                                        <span className="text-white">{invite.room?.mode?.replace('_', ' ')}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                        <span className="text-gray-600">Entry Stakes</span>
                                                        <span className="text-amber-500 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> {invite.room?.stake_amount || 'Free'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 mt-auto">
                                                    <button 
                                                        onClick={() => handleAcceptInvite(invite)}
                                                        className="flex-1 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-100 transition-all active:scale-95"
                                                    >
                                                        Join Lobby
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeclineInvite(invite.id)}
                                                        className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-2xl text-gray-600 hover:text-red-500 transition-all"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </main>
            </div>
            
            <style jsx global>{`
                .pulsing-dot {
                    animation: pulse-purple 2s infinite;
                }
                @keyframes pulse-purple {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
                }
            `}</style>
        </div>
    );
}
