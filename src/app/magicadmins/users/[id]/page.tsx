"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Mail, Phone, Calendar, Ban, Trash2,
    Gamepad2, Shield, Activity, Clock, MapPin, Loader2, Users
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import ActionModal from "@/components/ActionModal";

type Gamer = {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    status: string | null;
    created_at: string;
    role: string | null;
    last_sign_in_at?: string | null;
};

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [gamer, setGamer] = useState<Gamer | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: "danger" | "warning" | "success";
        title: string;
        description: string;
        confirmText: string;
        action: () => void;
    }>({
        isOpen: false,
        type: "warning",
        title: "",
        description: "",
        confirmText: "",
        action: () => { }
    });

    useEffect(() => {
        const fetchGamer = async () => {
            try {
                const res = await fetch(`/api/admin/gamers/${userId}`);
                const json = await res.json();
                if (!res.ok || json.error) {
                    setNotFound(true);
                } else {
                    setGamer(json.gamer);
                }
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchGamer();
    }, [userId]);

    const displayName = (g: Gamer) =>
        g.full_name || [g.first_name, g.last_name].filter(Boolean).join(" ") || g.email?.split("@")[0] || "Unknown";

    const openKickModal = () => {
        setActionModal({
            isOpen: true,
            type: "danger",
            title: "Kick Gamer?",
            description: "Are you sure you want to kick this gamer? This will permanently delete all their data and game progress. This action cannot be undone.",
            confirmText: "Yes, Kick Gamer",
            action: async () => {
                setActionLoading(true);
                try {
                    await fetch(`/api/admin/gamers/${userId}`, { method: "DELETE" });
                    router.push("/magicadmins/users");
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const openSuspendModal = () => {
        if (!gamer) return;
        const isSuspending = (gamer.status || "active") === "active";
        setActionModal({
            isOpen: true,
            type: isSuspending ? "warning" : "success",
            title: isSuspending ? "Revoke Access?" : "Restore Access?",
            description: isSuspending
                ? "This will revoke the gamer's access to the platform. They will not be able to log in until access is restored."
                : "This will restore the gamer's access to the platform. They will be able to log in immediately.",
            confirmText: isSuspending ? "Revoke Access" : "Restore Access",
            action: async () => {
                const newStatus = isSuspending ? "revoked" : "active";
                setActionLoading(true);
                try {
                    const res = await fetch(`/api/admin/gamers/${userId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: newStatus }),
                    });
                    if (res.ok) setGamer(prev => prev ? { ...prev, status: newStatus } : prev);
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#1a0b2e] text-white items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    <p className="text-sm">Loading gamer profile...</p>
                </div>
            </div>
        );
    }

    if (notFound || !gamer) {
        return (
            <div className="flex h-screen bg-[#1a0b2e] text-white items-center justify-center flex-col gap-4">
                <Users className="w-12 h-12 text-gray-600" />
                <p className="text-gray-400 text-lg">Gamer not found</p>
                <Link href="/magicadmins/users" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Gamers
                </Link>
            </div>
        );
    }

    const name = displayName(gamer);
    const status = gamer.status || "active";
    const joinedDate = new Date(gamer.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="users" />

            <main className="flex-1 flex flex-col overflow-y-auto">

                {/* Header Banner */}
                <div className="relative h-48 shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 to-blue-900/40" />
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
                    <div className="absolute top-8 left-8">
                        <Link href="/magicadmins/users" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm text-sm">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Gamers
                        </Link>
                    </div>
                </div>

                <div className="px-8 pb-12 -mt-16 relative">
                    <div className="flex flex-col md:flex-row gap-8 items-start">

                        {/* Left Column */}
                        <div className="w-full md:w-80 space-y-6">
                            {/* Profile Card */}
                            <div className="bg-[#2a1b3e] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-1 mb-4 shadow-lg shadow-purple-500/20">
                                        <div className="w-full h-full rounded-full bg-[#1a0b2e] flex items-center justify-center text-4xl font-bold">
                                            {name[0]?.toUpperCase()}
                                        </div>
                                    </div>
                                    <h1 className="text-2xl font-bold mb-1">{name}</h1>
                                    <p className="text-gray-400 text-sm mb-4">{gamer.email || "—"}</p>

                                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-6 ${status === 'active'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {status === 'active' ? '● Active Account' : '● Access Revoked'}
                                    </div>

                                    <div className="w-full space-y-3">
                                        {gamer.phone && (
                                            <div className="flex items-center gap-3 text-sm text-gray-300 p-3 bg-white/5 rounded-xl">
                                                <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                                                <span className="truncate">{gamer.phone}</span>
                                            </div>
                                        )}
                                        {gamer.location && (
                                            <div className="flex items-center gap-3 text-sm text-gray-300 p-3 bg-white/5 rounded-xl">
                                                <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                                                <span>{gamer.location}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-sm text-gray-300 p-3 bg-white/5 rounded-xl">
                                            <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                                            <span>Joined {joinedDate}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-300 p-3 bg-white/5 rounded-xl">
                                            <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                                            <span className="truncate">{gamer.email || "—"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Card */}
                            <div className="bg-[#2a1b3e] border border-white/10 rounded-3xl p-6 shadow-lg">
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Account Actions
                                </h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={openSuspendModal}
                                        disabled={actionLoading}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 text-white disabled:opacity-50"
                                    >
                                        <Ban className="w-4 h-4" />
                                        {status === 'active' ? 'Revoke Access' : 'Grant Access'}
                                    </button>
                                    <button
                                        onClick={openKickModal}
                                        disabled={actionLoading}
                                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Kick Gamer
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="flex-1 space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#2a1b3e] border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-2 text-gray-400">
                                        <Clock className="w-5 h-5 text-purple-400" />
                                        <span className="text-sm font-medium">Member Since</span>
                                    </div>
                                    <p className="text-2xl font-bold">{new Date(gamer.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                                </div>
                                <div className="bg-[#2a1b3e] border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-2 text-gray-400">
                                        <Activity className="w-5 h-5 text-green-400" />
                                        <span className="text-sm font-medium">Account Status</span>
                                    </div>
                                    <p className={`text-2xl font-bold capitalize ${status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                        {status}
                                    </p>
                                </div>
                            </div>

                            {/* Account Info */}
                            <div className="bg-[#2a1b3e] border border-white/10 rounded-3xl p-8">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Gamepad2 className="w-5 h-5 text-purple-400" />
                                    Account Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">User ID</span>
                                        <span className="text-xs font-mono text-gray-300 bg-white/5 px-3 py-1 rounded-lg truncate max-w-xs">{gamer.id}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">Display Name</span>
                                        <span className="font-bold">{name}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">Username</span>
                                        <span className="font-bold text-purple-300">{gamer.username ? `@${gamer.username}` : "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">Email</span>
                                        <span className="font-bold">{gamer.email || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">Phone</span>
                                        <span className="font-bold">{gamer.phone || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                                        <span className="text-gray-400 text-sm">Location</span>
                                        <span className="font-bold">{gamer.location || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-gray-400 text-sm">Role</span>
                                        <span className="font-bold capitalize">{gamer.role || "gamer"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ActionModal
                    isOpen={actionModal.isOpen}
                    onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                    onConfirm={actionModal.action}
                    title={actionModal.title}
                    description={actionModal.description}
                    confirmText={actionModal.confirmText}
                    type={actionModal.type}
                />
            </main>
        </div>
    );
}
