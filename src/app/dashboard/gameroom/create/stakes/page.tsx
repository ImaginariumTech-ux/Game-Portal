"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Coins, Info, Trophy, LayoutGrid, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function StakesConfigurationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get("roomId");

    const [room, setRoom] = useState<any>(null);
    const [userBalance, setUserBalance] = useState(0);
    const [stakeAmount, setStakeAmount] = useState<number>(0);
    const [payoutType, setPayoutType] = useState<'winner_takes_all' | 'custom_split'>('winner_takes_all');
    const [payoutConfig, setPayoutConfig] = useState<Record<string, number>>({ "1": 100 });
    
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId) {
            router.push("/dashboard/gameroom/create/mode");
            return;
        }

        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch room details
            const { data: roomData } = await supabase
                .from("game_rooms")
                .select("*")
                .eq("id", roomId)
                .single();
            
            setRoom(roomData);
            if (roomData?.stake_amount) setStakeAmount(roomData.stake_amount);
            if (roomData?.payout_type) setPayoutType(roomData.payout_type);
            if (roomData?.payout_config) setPayoutConfig(roomData.payout_config);

            // Fetch user balance
            const { data: profile } = await supabase
                .from("profiles")
                .select("coins")
                .eq("id", user.id)
                .single();
            
            setUserBalance(profile?.coins || 0);
            setLoading(false);
        };

        fetchData();
    }, [roomId, router]);

    const handleNext = async () => {
        if (!roomId || updating) return;
        
        if (stakeAmount > userBalance) {
            setError("Insufficient coin balance to host this stake.");
            return;
        }

        // Validate Splitpot
        if (payoutType === 'custom_split') {
            const total = Object.values(payoutConfig).reduce((a, b) => a + b, 0);
            if (total !== 100) {
                setError(`Payout percentages must total 100%. Currently: ${total}%`);
                return;
            }
        }

        setUpdating(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("game_rooms")
                .update({ 
                    stake_amount: stakeAmount,
                    payout_type: payoutType,
                    payout_config: payoutType === 'winner_takes_all' ? { "1": 100 } : payoutConfig
                })
                .eq("id", roomId);

            if (updateError) throw updateError;

            router.push(`/dashboard/gameroom/create/invite?roomId=${roomId}`);
        } catch (err: any) {
            console.error("Error updating stakes:", err);
            setError("Failed to save stakes configuration.");
        } finally {
            setUpdating(false);
        }
    };

    const updateConfig = (rank: string, value: number) => {
        setPayoutConfig(prev => ({ ...prev, [rank]: value }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Calculating stakes...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="mb-12 text-center">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight mb-3">Room Economics</h2>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Define stakes and payout distribution</p>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Stake Input */}
            <div className="bg-white/[0.03] border border-white/5 rounded-[40px] p-10 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Coins className="w-32 h-32" />
                </div>

                <div className="space-y-6 relative z-10">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">Entry Fee (Per Player)</label>
                    <div className="relative group">
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <Coins className="w-6 h-6 text-black" />
                            </div>
                        </div>
                        <input 
                            type="number" 
                            min="0"
                            step="10"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-black/50 border-2 border-white/5 rounded-[32px] pl-24 pr-10 py-8 text-4xl font-black text-white outline-none focus:border-amber-500 transition-all placeholder:text-gray-800"
                        />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2">
                            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Coins</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <Info className="w-3.5 h-3.5 text-gray-600" />
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">Total Pot: <span className="text-white">{(stakeAmount * (room?.max_players || 4)) * 0.95}</span> (After 5% fee)</p>
                    </div>
                </div>
            </div>

            {/* Payout Structure */}
            <div className={`bg-white/[0.03] border border-white/5 rounded-[40px] p-10 mb-12 transition-all ${stakeAmount === 0 ? 'opacity-40 grayscale' : ''}`}>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block mb-6">Payout Distribution</label>
                
                {stakeAmount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Info className="w-8 h-8 text-gray-600 mb-4" />
                        <h4 className="text-sm font-black text-white uppercase italic mb-1">Friendly Match</h4>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">No coins staked. Payout rules are disabled for free games.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <button 
                                onClick={() => setPayoutType('winner_takes_all')}
                                className={`p-6 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${payoutType === 'winner_takes_all' ? 'bg-purple-600/10 border-purple-500' : 'bg-white/5 border-white/5 opacity-50 hover:opacity-80'}`}
                            >
                                <Trophy className={`w-8 h-8 mb-4 ${payoutType === 'winner_takes_all' ? 'text-purple-500' : 'text-gray-600'}`} />
                                <h4 className="text-sm font-black text-white uppercase italic mb-1">Winner Takes All</h4>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">1st Place gets 100% of the pot</p>
                                {payoutType === 'winner_takes_all' && <Check className="absolute top-4 right-4 w-5 h-5 text-purple-500" />}
                            </button>

                            <button 
                                onClick={() => setPayoutType('custom_split')}
                                className={`p-6 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${payoutType === 'custom_split' ? 'bg-purple-600/10 border-purple-500' : 'bg-white/5 border-white/5 opacity-50 hover:opacity-80'}`}
                            >
                                <LayoutGrid className={`w-8 h-8 mb-4 ${payoutType === 'custom_split' ? 'text-purple-500' : 'text-gray-600'}`} />
                                <h4 className="text-sm font-black text-white uppercase italic mb-1">Split Pot</h4>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Custom distribution per rank</p>
                                {payoutType === 'custom_split' && <Check className="absolute top-4 right-4 w-5 h-5 text-purple-500" />}
                            </button>
                        </div>

                        {payoutType === 'custom_split' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                {[
                                    { rank: "1", label: "🥇 1st Place", color: "text-amber-500" },
                                    { rank: "2", label: "🥈 2nd Place", color: "text-gray-400" },
                                    { rank: "3", label: "🥉 3rd Place", color: "text-amber-700" }
                                ].map((pos) => (
                                    <div key={pos.rank} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${pos.color}`}>{pos.label}</span>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={payoutConfig[pos.rank] || 0}
                                                onChange={(e) => updateConfig(pos.rank, parseInt(e.target.value) || 0)}
                                                className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-right text-sm font-black text-white outline-none focus:border-purple-500"
                                            />
                                            <span className="text-[10px] font-black text-gray-600">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
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
                    onClick={handleNext}
                    disabled={updating}
                    className="flex-1 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-purple-100 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {updating ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                        <>
                            Finalize & Invite
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
