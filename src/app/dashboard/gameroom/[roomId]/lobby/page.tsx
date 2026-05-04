"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { 
    Users2, 
    Gamepad2, 
    Crown, 
    Wallet, 
    ArrowLeft, 
    RefreshCw, 
    CheckCircle2, 
    Circle,
    X,
    MessageSquare,
    Play,
    Settings2,
    LogOut,
    Copy,
    Trophy,
    Share2,
    AlertCircle,
    Clock,
    XCircle,
    Plus,
    UserPlus
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Sidebar from "@/components/dashboard/Sidebar";
import { usePresence } from "@/hooks/usePresence";
import { toast } from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Player {
    user_id: string;
    is_ready: boolean;
    joined_at: string;
    status: string;
    profile: {
        id: string;
        full_name: string;
        username: string;
        avatar_url: string;
    };
    character_id?: string;
    character?: {
        id: string;
        name: string;
        image_url: string;
    };
}

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
    payout_type: 'winner_takes_all' | 'custom_split';
    payout_config: Record<string, number>;
    game?: {
        title: string;
        thumbnail_url: string;
        game_url: string;
        slug: string;
    };
    host_profile?: {
        full_name: string;
        username: string;
        avatar_url: string;
    };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GameLobbyPage() {
    const router = useRouter();
    const { roomId } = useParams();
    
    const [user, setUser] = useState<any>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [inviting, setInviting] = useState<string | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableCharacters, setAvailableCharacters] = useState<any[]>([]);
    const [selectingCharacter, setSelectingCharacter] = useState<string | null>(null);

    // Real-time presence for friends
    const { onlineUserIds, isOnline } = usePresence(user?.id);

    const isHost = user?.id === room?.host_id;
    const myPlayer = players.find(p => p.user_id === user?.id);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }
            setUser(user);
            
            await fetchRoomData();
            await fetchFriends();
            setLoading(false);
        };
        init();
    }, [roomId]);

    const fetchFriends = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("friendships")
            .select(`
                id, status, user_id, friend_id,
                user:profiles!user_id(id, full_name, avatar_url, username),
                friend:profiles!friend_id(id, full_name, avatar_url, username)
            `)
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .eq("status", "accepted");

        const formatted = (data || []).map((f: any) => {
            const otherProfile = f.friend_id === user.id ? f.user : f.friend;
            return otherProfile;
        });
        setFriends(formatted);
    };

    const handleApproveRequest = async (playerId: string) => {
        const { error } = await supabase
            .from("room_players")
            .update({ status: 'joined' })
            .eq("room_id", roomId)
            .eq("user_id", playerId);
        
        if (error) {
            alert("Error approving: " + error.message);
        } else {
            fetchRoomData();
        }
    };

    const handleDenyRequest = async (playerId: string) => {
        await supabase
            .from("room_players")
            .delete()
            .eq("room_id", roomId)
            .eq("user_id", playerId);
        fetchRoomData();
    };

    const handleInviteFriend = async (friendId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || inviting) return;
        setInviting(friendId);
        
        const { error } = await supabase
            .from("room_invites")
            .insert({
                room_id: roomId,
                inviter_id: user.id,
                invitee_id: friendId,
                status: 'pending'
            });
        
        if (error) {
            alert("Error sending invite: " + error.message);
        } else {
            // Success!
        }
        setInviting(null);
    };

    const fetchRoomData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log("Fetching room data for roomId:", roomId);

        const { data: roomData, error: roomError } = await supabase
            .from("game_rooms")
            .select(`
                *,
                game:games(title, thumbnail_url, game_url, slug),
                host_profile:profiles!host_id(full_name, username, avatar_url)
            `)
            .eq("id", roomId)
            .maybeSingle();

        if (roomError) {
            console.error("Room fetch error:", roomError);
            setError(`Error loading room: ${roomError.message}`);
            return;
        }

        if (!roomData) {
            console.error("Room not found in database for ID:", roomId);
            setError("Room not found or has been dissolved.");
            return;
        }

        setRoom(roomData);
        if (roomData.game_id) {
            fetchAvailableCharacters(roomData.game_id);
        }

        // Fetch current players
        const { data: playersData, error: playersError } = await supabase
            .from("room_players")
            .select(`
                user_id, is_ready, joined_at, status, character_id,
                profile:profiles(id, full_name, username, avatar_url),
                character:game_characters(id, name, image_url)
            `)
            .eq("room_id", roomId)
            .order("joined_at", { ascending: true });

        if (playersError) {
            console.error("Players fetch error details:", JSON.stringify(playersError, null, 2));
            
            // Fallback: fetch without profile if join fails
            const { data: fallbackData } = await supabase
                .from("room_players")
                .select("user_id, is_ready, joined_at, status")
                .eq("room_id", roomId);
            
            if (fallbackData) {
                const formatted = fallbackData.map(p => ({ 
                    ...p, 
                    profile: { id: p.user_id, full_name: "Player", username: "player", avatar_url: "" } 
                }));
                const joined = formatted.filter(p => p.status === 'joined' || !p.status);
                setPlayers(joined as any);
                setPendingRequests(formatted.filter(p => p.status === 'pending'));
                return;
            }
        }

        const formatted = (playersData || []).map((p: any) => ({
            ...p,
            profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
            character: Array.isArray(p.character) ? p.character[0] : p.character
        }));
        
        // Separate joined players and pending requests
        const joined = formatted.filter(p => p.status === 'joined' || !p.status);
        setPlayers(joined);
        setPendingRequests(formatted.filter(p => p.status === 'pending'));

        // Auto-join if user (host or guest) is not in room at all
        const inRoomAtAll = formatted.some(p => p.user_id === user.id);

        if (!inRoomAtAll) {
            const isHost = user.id === roomData.host_id;
            
            // Check if there's an active invite for this user
            const { data: invite } = await supabase
                .from("room_invites")
                .select("id")
                .eq("room_id", roomId)
                .eq("invitee_id", user.id)
                .eq("status", "pending")
                .maybeSingle();

            const shouldAutoJoinAsMember = isHost || invite;

            console.log("User missing from room_players, auto-joining...", { isHost, hasInvite: !!invite });
            
            const { error: joinError } = await supabase
                .from("room_players")
                .upsert({
                    room_id: roomId,
                    user_id: user.id,
                    is_ready: isHost,
                    status: shouldAutoJoinAsMember ? 'joined' : 'pending'
                }, { onConflict: 'room_id,user_id' });
            
            if (joinError) {
                console.error("Auto-join error message:", joinError.message || "No message");
                if (joinError.message?.includes("row-level security")) {
                    setError("You don't have permission to join this room yet.");
                }
            } else {
                // If they were invited, mark the invite as 'accepted'
                if (invite) {
                    await supabase
                        .from("room_invites")
                        .update({ status: 'accepted' })
                        .eq("id", invite.id);
                }

                console.log("Auto-join successful, refreshing...");
                fetchRoomData();
            }
        }
    };

    const fetchAvailableCharacters = async (gameId: string) => {
        const { data } = await supabase
            .from('game_characters')
            .select('*')
            .eq('game_id', gameId)
            .order('name', { ascending: true });
        if (data) setAvailableCharacters(data);
    };

    // ── Real-time Listeners ──────────────────────────────────────────────────
    useEffect(() => {
        if (!roomId) return;

        const roomSub = supabase
            .channel(`room-${roomId}`)
            .on("postgres_changes", { 
                event: "*", 
                schema: "public", 
                table: "game_rooms", 
                filter: `id=eq.${roomId}` 
            }, (payload: any) => {
                console.log("Room change detected:", payload.new.status);
                if (payload.new.status === 'dissolved') {
                    toast.error("The host has dissolved the room.");
                    router.push("/dashboard/gameroom");
                } else if (payload.new.status === 'live') {
                    // Update state immediately to trigger the Iframe transition
                    setRoom(prev => prev ? { ...prev, status: 'live' } : null);
                    // Also fetch fresh data to ensure we have everything
                    fetchRoomData();
                } else {
                    fetchRoomData();
                }
            })
            .on("postgres_changes", { 
                event: "*", 
                schema: "public", 
                table: "room_players", 
                filter: `room_id=eq.${roomId}` 
            }, () => {
                fetchRoomData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(roomSub);
        };
    }, [roomId]);

    // ── Actions ──────────────────────────────────────────────────────────────

    const handleToggleReady = async () => {
        if (!myPlayer || isHost) return;
        
        const { error } = await supabase
            .from("room_players")
            .update({ is_ready: !myPlayer.is_ready })
            .eq("room_id", roomId)
            .eq("user_id", user.id);
        
        if (error) {
            alert("Failed to update status: " + error.message);
        } else {
            fetchRoomData();
        }
    };

    const handleSelectCharacter = async (charId: string) => {
        if (!user || selectingCharacter) return;
        
        // Check if character is already taken
        const isTaken = players.some(p => p.character_id === charId && p.user_id !== user.id);
        if (isTaken) {
            toast.error("This character is already taken!");
            return;
        }

        setSelectingCharacter(charId);
        
        const { error } = await supabase
            .from("room_players")
            .update({ character_id: charId })
            .eq("room_id", roomId)
            .eq("user_id", user.id);
        
        if (error) {
            toast.error("Failed to select character: " + error.message);
        } else {
            fetchRoomData();
        }
        setSelectingCharacter(null);
    };

    const handleLeaveRoom = async () => {
        if (isLeaving) return;
        setIsLeaving(true);

        if (isHost) {
            const confirmDissolve = confirm("As the host, leaving will dissolve the room for everyone. Proceed?");
            if (!confirmDissolve) { setIsLeaving(false); return; }
            
            await supabase
                .from("game_rooms")
                .update({ status: 'dissolved', dissolved_at: new Date().toISOString() })
                .eq("id", roomId);
        } else {
            await supabase
                .from("room_players")
                .delete()
                .eq("room_id", roomId)
                .eq("user_id", user.id);
        }

        router.push("/dashboard/gameroom");
    };

    const handleStartGame = async () => {
        if (!isHost || starting) return;
        
        const allReady = players.every(p => p.is_ready || p.user_id === room?.host_id);
        if (!allReady) {
            toast.error("All players must be ready before starting.");
            return;
        }

        const allSelected = players.every(p => p.character_id);
        if (!allSelected) {
            toast.error("All players must select a character before starting.");
            return;
        }

        setStarting(true);
        
        try {
            const res = await fetch('/api/game/match/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId })
            });
            
            const data = await res.json();
            
            if (!data.success) {
                if (data.players) {
                    toast.error(`Insufficient funds: ${data.players.join(', ')}`, { duration: 5000 });
                } else {
                    toast.error(data.error || "Failed to start match");
                }
                setStarting(false);
                return;
            }

            toast.success("Match starting! Stakes deducted.");
            // The room status update will be picked up by the realtime listener
        } catch (err) {
            console.error("Match start error:", err);
            toast.error("Failed to start match.");
            setStarting(false);
        }
    };

    const copyJoinCode = () => {
        if (room?.join_code) {
            navigator.clipboard.writeText(room.join_code);
            alert("Join code copied!");
        }
    };

    if (loading) return <div className="h-screen bg-[#0d0f14] flex items-center justify-center"><RefreshCw className="w-8 h-8 text-purple-500 animate-spin" /></div>;
    if (error) return <div className="h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-8 text-center"><XCircle className="w-16 h-16 text-red-500 mb-6" /><h2 className="text-2xl font-black text-white mb-2 uppercase italic">{error}</h2><button onClick={() => router.push("/dashboard/gameroom")} className="mt-6 px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all">Back to Rooms</button></div>;
    if (!room) return null;

    const isPending = myPlayer?.status === 'pending';
    const isLive = room?.status === 'live';

    if (isLive) {
        const baseUrl = room.game?.game_url || "";
        const separator = baseUrl.includes("?") ? "&" : "?";
        const finalUrl = `${baseUrl}${separator}roomId=${roomId}`;

        return (
            <div className="fixed inset-0 z-[1000] bg-black">
                <iframe 
                    src={finalUrl}
                    className="w-full h-full border-none"
                    allow="autoplay; fullscreen; pointer-lock"
                />
                {/* Overlay to exit if needed or show info */}
                <div className="absolute top-4 left-4 group">
                    <button 
                        onClick={() => router.push("/dashboard/gameroom")}
                        className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">
            <Sidebar currentActiveId="gameroom" />

            <div className="flex-1 flex flex-col overflow-hidden bg-[#090b0f] relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />

                {/* Invite Friends Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#0d0f14]/80 backdrop-blur-md" onClick={() => setShowInviteModal(false)} />
                        <div className="relative w-full max-w-md bg-[#13151a] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Invite Friends</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Select online friends to join your room</p>
                                </div>
                                <button onClick={() => setShowInviteModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                {friends.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                                        <Users2 className="w-12 h-12 mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">No friends found</p>
                                    </div>
                                ) : (
                                    friends.map((friend) => {
                                        const online = isOnline(friend.id);
                                        const inRoom = players.some(p => p.user_id === friend.id);
                                        
                                        return (
                                            <div key={friend.id} className={`p-4 rounded-[24px] border border-white/5 bg-white/[0.02] flex items-center justify-between transition-all ${!online && 'opacity-40 grayscale'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-white/5 relative overflow-hidden">
                                                            {friend.avatar_url ? (
                                                                <Image src={friend.avatar_url} alt="Avatar" fill className="object-cover" />
                                                            ) : (
                                                                <span className="text-purple-400 font-black text-lg uppercase">{friend.username?.[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#13151a] ${online ? 'bg-green-500' : 'bg-gray-700'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white uppercase tracking-tight">{friend.full_name}</p>
                                                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{online ? 'Online' : 'Offline'}</p>
                                                    </div>
                                                </div>

                                                {inRoom ? (
                                                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest px-3 py-1.5 bg-purple-400/10 rounded-xl">In Room</span>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleInviteFriend(friend.id)}
                                                        disabled={!online || inviting === friend.id}
                                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        {inviting === friend.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                                        Invite
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="p-6 bg-black/20 border-t border-white/5">
                                <button 
                                    onClick={() => router.push("/dashboard/friends")}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all"
                                >
                                    Manage Friend List
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                    {/* Pending Approval Overlay */}
                    {isPending && (
                        <div className="absolute inset-0 z-[100] bg-[#0d0f14]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-8 animate-pulse">
                                <Clock className="w-10 h-10 text-amber-500" />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-4">Awaiting Entry</h2>
                            <p className="text-gray-500 font-bold text-xs max-w-sm uppercase tracking-[0.2em] leading-relaxed mb-10">The host has been notified of your request to join <span className="text-purple-400">{room.name}</span>. Please wait for approval.</p>
                            <button 
                                onClick={handleLeaveRoom}
                                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                            >
                                Cancel Request
                            </button>
                        </div>
                    )}

                    <main className="flex-1 overflow-y-auto no-scrollbar">
                        {/* Header */}
                        <header className="pt-16 pb-12 px-8 md:px-12 border-b border-white/5">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-6">
                                            <button 
                                                onClick={() => router.push("/dashboard/gameroom")}
                                                className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                                            >
                                                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
                                            </button>
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Live Lobby</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 mb-8">
                                            <div className="w-24 h-24 rounded-[32px] bg-purple-500/10 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-2xl">
                                                {room.game?.thumbnail_url ? (
                                                    <Image src={room.game.thumbnail_url} alt="Game" fill className="object-cover" />
                                                ) : (
                                                    <Gamepad2 className="w-10 h-10 text-purple-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="px-3 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">{room.mode.replace('_', ' ')}</span>
                                                    <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">{room.game?.title}</span>
                                                </div>
                                                <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tight">{room.name}</h1>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Room Code</span>
                                                <span className="text-md font-mono font-black text-white tracking-widest">{room.join_code}</span>
                                                <button onClick={copyJoinCode} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-white">
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            
                                            <button 
                                                onClick={() => setShowInviteModal(true)}
                                                className="px-6 py-3 bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-2xl flex items-center gap-3 transition-all active:scale-95 group shadow-lg shadow-purple-600/5"
                                            >
                                                <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Invite Friends</span>
                                            </button>

                                            {room.stake_amount > 0 && (
                                                <div className="px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                                                    <Wallet className="w-4 h-4 text-amber-500" />
                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Stakes: {room.stake_amount}</span>
                                                </div>
                                            )}
                                            <div className="px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                                                <Users2 className="w-4 h-4 text-blue-400" />
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{players.length} / {room.max_players} Players</span>
                                            </div>

                                            {/* Character Selection */}
                                            {availableCharacters.length > 0 && (
                                                <div className="w-full mt-10">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-8 h-0.5 bg-purple-500 rounded-full" />
                                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Pick Your Character</h3>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4">
                                                        {availableCharacters.map((char) => {
                                                            const takenBy = players.find(p => p.character_id === char.id);
                                                            const isMySelection = takenBy?.user_id === user?.id;
                                                            const isTakenByOther = takenBy && !isMySelection;

                                                            return (
                                                                <button
                                                                    key={char.id}
                                                                    onClick={() => !isTakenByOther && handleSelectCharacter(char.id)}
                                                                    disabled={isTakenByOther || selectingCharacter === char.id}
                                                                    className={`group relative w-20 h-20 rounded-2xl border-2 transition-all overflow-hidden ${
                                                                        isMySelection 
                                                                        ? "border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-110 z-10" 
                                                                        : isTakenByOther 
                                                                            ? "border-white/5 bg-white/5 opacity-40 grayscale cursor-not-allowed" 
                                                                            : "border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-white/10"
                                                                    }`}
                                                                >
                                                                    <Image src={char.image_url} alt={char.name} fill className="object-cover" />
                                                                    {isMySelection && (
                                                                        <div className="absolute inset-0 border-2 border-purple-500 rounded-2xl" />
                                                                    )}
                                                                    {isTakenByOther && (
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                                            <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden relative shadow-lg">
                                                                                {takenBy.profile?.avatar_url ? (
                                                                                    <Image src={takenBy.profile.avatar_url} alt="User" fill className="object-cover" />
                                                                                ) : (
                                                                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-[8px] font-black">{takenBy.profile?.username?.[0]}</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                                        <p className="text-[6px] font-black text-white uppercase tracking-tighter truncate">{char.name}</p>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 min-w-[240px]">
                                        {isHost ? (
                                            <button 
                                                onClick={handleStartGame}
                                                disabled={starting || players.length < 2 || !players.every(p => p.is_ready || p.user_id === user.id)}
                                                className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-[0_0_50px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95"
                                            >
                                                {starting ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                                                    <><Play className="w-4 h-4 fill-current" /> Start Match</>
                                                )}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={handleToggleReady}
                                                className={`w-full py-5 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 ${
                                                    myPlayer?.is_ready 
                                                    ? "bg-green-500 text-white hover:bg-green-400" 
                                                    : "bg-white text-black hover:bg-purple-100"
                                                }`}
                                            >
                                                {myPlayer?.is_ready ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                                {myPlayer?.is_ready ? "I'm Ready!" : "Mark Ready"}
                                            </button>
                                        )}
                                        <button 
                                            onClick={handleLeaveRoom}
                                            disabled={isLeaving}
                                            className="w-full py-5 bg-white/5 border border-white/5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3"
                                        >
                                            {isLeaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                                                <><LogOut className="w-4 h-4" /> {isHost ? "Dissolve Room" : "Leave Lobby"}</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Content */}
                        <div className="max-w-7xl mx-auto px-8 md:px-12 py-16">
                            {/* Entry Requests (Host Only) */}
                            {isHost && pendingRequests.length > 0 && (
                                <section className="mb-16">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                            <Users2 className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Entry Requests</h2>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Users waiting to join via room code</p>
                                        </div>
                                        <span className="ml-auto bg-amber-500 text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{pendingRequests.length} Pending</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {pendingRequests.map((req) => (
                                            <div key={req.user_id} className="bg-[#13151a] border border-amber-500/20 p-5 rounded-[32px] flex items-center gap-4 group">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/10 relative overflow-hidden flex-shrink-0">
                                                    {req.profile?.avatar_url ? (
                                                        <Image src={req.profile.avatar_url} alt="Avatar" fill className="object-cover" />
                                                    ) : (
                                                        <span className="text-lg font-black text-amber-500 uppercase">{req.profile?.username?.[0]}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-white uppercase tracking-tight truncate text-sm">{req.profile?.full_name}</p>
                                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest truncate">@{req.profile?.username}</p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button 
                                                        onClick={() => handleApproveRequest(req.user_id)}
                                                        className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDenyRequest(req.user_id)}
                                                        className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                {/* Players List */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                                            Players
                                            <span className="text-gray-600 font-mono text-sm">{players.length}</span>
                                        </h2>
                                        {!players.every(p => p.is_ready || p.user_id === room.host_id) && (
                                            <div className="flex items-center gap-2 text-[10px] text-amber-500 font-black uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Waiting for everyone to be ready
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {players.map((player) => (
                                            <div 
                                                key={player.user_id} 
                                                className={`p-6 rounded-[32px] border-2 transition-all flex items-center gap-5 ${
                                                    player.is_ready || player.user_id === room.host_id
                                                    ? "bg-green-500/5 border-green-500/20 shadow-[0_10px_30px_rgba(34,197,94,0.1)]" 
                                                    : "bg-white/[0.03] border-white/5"
                                                }`}
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center relative overflow-hidden shadow-inner border border-white/5">
                                                    {player.character ? (
                                                        <Image src={player.character.image_url} alt={player.character.name} fill className="object-cover" />
                                                    ) : player.profile?.avatar_url ? (
                                                        <Image src={player.profile.avatar_url} alt="Avatar" fill className="object-cover opacity-50" />
                                                    ) : (
                                                        <span className="text-xl font-black text-purple-400 opacity-50">{player.profile?.username?.[0]?.toUpperCase()}</span>
                                                    )}
                                                    {player.user_id === room.host_id && (
                                                        <div className="absolute top-1 right-1 z-10">
                                                            <Crown className="w-3.5 h-3.5 text-amber-500 drop-shadow-lg" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-black text-white uppercase tracking-tight truncate">{player.profile?.full_name}</p>
                                                        {player.character && <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">{player.character.name}</span>}
                                                        {player.user_id === user.id && <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">You</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {(player.is_ready || player.user_id === room.host_id) ? (
                                                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                                Ready
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                                                Thinking...
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {(player.is_ready || player.user_id === room.host_id) && (
                                                    <div className="p-2 bg-green-500/10 rounded-full border border-green-500/20">
                                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Empty Slots */}
                                        {Array.from({ length: Math.max(0, room.max_players - players.length) }).map((_, i) => (
                                            <div key={`empty-${i}`} className="p-6 rounded-[32px] border-2 border-white/[0.03] bg-white/[0.01] border-dashed flex items-center gap-5 opacity-40">
                                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                                                    <Users2 className="w-6 h-6 text-gray-800" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Waiting for player...</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sidebar / Settings */}
                                <div className="space-y-8">
                                    <div className="bg-[#13151a] border border-white/10 rounded-[40px] p-8">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                                            <Settings2 className="w-4 h-4 text-purple-400" />
                                            Room Settings
                                        </h3>
                                        
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Selected Game</p>
                                                <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-4 border border-white/5">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 relative overflow-hidden">
                                                        {room.game?.thumbnail_url && <Image src={room.game.thumbnail_url} alt="Game" fill className="object-cover" />}
                                                    </div>
                                                    <span className="text-xs font-black text-white uppercase tracking-widest">{room.game?.title}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Stakes & Mode</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <span className="text-[10px] font-black text-amber-500 block mb-1">STAKES</span>
                                                        <span className="text-sm font-black text-white">{room.stake_amount || 'Free'}</span>
                                                    </div>
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <span className="text-[10px] font-black text-purple-400 block mb-1">MODE</span>
                                                        <span className="text-sm font-black text-white truncate uppercase">{room.mode.split('_')[0]}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {room.stake_amount > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Payout Structure</p>
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{room.payout_type === 'winner_takes_all' ? 'Winner Takes All' : 'Split Pot'}</span>
                                                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            {Object.entries(room.payout_config || {}).sort().map(([rank, percent]) => (
                                                                <div key={rank} className="flex items-center justify-between">
                                                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{rank}{rank === '1' ? 'st' : rank === '2' ? 'nd' : 'rd'} Place</span>
                                                                    <span className="text-[10px] font-black text-white">{percent}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {isHost && (
                                                <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    Edit Settings
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-purple-600/10 border border-purple-500/20 rounded-[40px] p-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Share2 className="w-4 h-4 text-purple-400" />
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Direct Invite</h3>
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6 leading-relaxed">Share this join code with your friends to let them join directly.</p>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-4 font-mono font-black text-white tracking-widest text-center text-sm">
                                                {room.join_code}
                                            </div>
                                            <button onClick={copyJoinCode} className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition-all active:scale-95">
                                                <Copy className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
