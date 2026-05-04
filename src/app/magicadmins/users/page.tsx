"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Mail, Phone, Calendar, ChevronLeft, ChevronRight, Users, Loader2 } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

type Gamer = {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    status: string | null;
    created_at: string;
    role: string | null;
};

export default function UsersPage() {
    const [gamers, setGamers] = useState<Gamer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 24;

    useEffect(() => {
        const fetchGamers = async () => {
            try {
                const res = await fetch("/api/admin/gamers");
                const json = await res.json();
                if (json.error) throw new Error(json.error);
                setGamers(json.gamers || []);
            } catch (err) {
                console.error("Failed to fetch gamers:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGamers();
    }, []);

    const displayName = (g: Gamer) =>
        g.full_name || [g.first_name, g.last_name].filter(Boolean).join(" ") || g.email?.split("@")[0] || "Unknown";

    const filteredGamers = gamers.filter(g => {
        const name = displayName(g).toLowerCase();
        const matchesSearch =
            name.includes(searchQuery.toLowerCase()) ||
            (g.email || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || (g.status || "active") === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredGamers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedGamers = filteredGamers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

    const activeCount = gamers.filter(g => (g.status || "active") === "active").length;
    const revokedCount = gamers.filter(g => g.status === "revoked").length;

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="users" />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold leading-none">Gamers</h1>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {loading ? "Loading..." : `${gamers.length} total · ${activeCount} active · ${revokedCount} revoked`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
                            {(['all', 'active', 'revoked'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${statusFilter === status
                                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search gamers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                            />
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide flex flex-col">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                                <p className="text-sm">Loading gamers...</p>
                            </div>
                        </div>
                    ) : paginatedGamers.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <Users className="w-12 h-12 mb-4 opacity-30" />
                            <p className="text-lg">
                                {gamers.length === 0 ? "No gamers have signed up yet." : "No gamers match your search."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                {paginatedGamers.map((gamer) => {
                                    const name = displayName(gamer);
                                    const status = gamer.status || "active";
                                    return (
                                        <Link
                                            href={`/magicadmins/users/${gamer.id}`}
                                            key={gamer.id}
                                            className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden block hover:border-purple-500/20"
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold shrink-0">
                                                    {name[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold truncate text-base group-hover:text-purple-400 transition-colors">{name}</h3>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-0.5 ${status === 'active'
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {status}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate text-xs">{gamer.email || "—"}</span>
                                                </div>
                                                {gamer.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="text-xs">{gamer.phone}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="text-xs">Joined {new Date(gamer.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-auto flex justify-center pb-4">
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-full p-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <span className="text-sm font-bold px-4 text-gray-400">
                                            Page <span className="text-white">{currentPage}</span> of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
