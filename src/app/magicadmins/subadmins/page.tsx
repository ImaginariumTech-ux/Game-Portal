"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Search, ShieldAlert, MoreHorizontal, Mail, Calendar, Plus, X, User, Trash2, Edit2, Loader2 } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { supabase } from "@/lib/supabase/client";

interface Profile {
    id: string;
    email: string;
    username: string;
    full_name: string;
    avatar_url: string;
    role: string;
    created_at: string;
}

export default function SubadminsPage() {
    const [admins, setAdmins] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Add Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [newAdminName, setNewAdminName] = useState("");

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");

    // Action State
    const [creating, setCreating] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Dropdown State
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAdmins();

        // Click outside to close dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchAdmins = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'admin')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAdmins(data || []);
        } catch (err) {
            console.error("Error fetching admins:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch('/api/admin/create-subadmin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newAdminEmail,
                    password: newAdminPassword || 'TemporaryPass123!',
                    fullName: newAdminName
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create admin');

            setSuccess("Admin created successfully!");
            setNewAdminEmail("");
            setNewAdminName("");
            setNewAdminPassword("");
            fetchAdmins();

            setTimeout(() => {
                setShowAddModal(false);
                setSuccess("");
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setProcessing(true);
        setError("");

        try {
            const response = await fetch('/api/admin/update-subadmin', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: editingUser.id,
                    email: editEmail,
                    fullName: editName
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update admin');

            fetchAdmins();
            setShowEditModal(false);
            setEditingUser(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteAdmin = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this admin? This action cannot be undone.")) return;

        setProcessing(true);
        try {
            const response = await fetch('/api/admin/delete-subadmin', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete admin');

            fetchAdmins();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setProcessing(false);
            setActiveDropdown(null);
        }
    };

    const openEditModal = (user: Profile) => {
        setEditingUser(user);
        setEditName(user.full_name || "");
        setEditEmail(user.email || "");
        setShowEditModal(true);
        setActiveDropdown(null);
        setError("");
    };

    const filteredAdmins = admins.filter(admin =>
        (admin.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (admin.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden selection:bg-purple-500/30">
            <AdminSidebar activeItem="subadmins" />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">Subadmins & Moderators</h1>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-xs text-purple-400 font-mono border border-purple-500/30">
                            {admins.length} Admins
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search admins..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-all shadow-lg shadow-white/10 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add New Admin
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {/* Admins Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {loading ? (
                            <div className="col-span-full flex justify-center py-20">
                                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                            </div>
                        ) : filteredAdmins.length === 0 ? (
                            <div className="col-span-full text-center text-gray-500 py-20">No admins found matching your search.</div>
                        ) : (
                            filteredAdmins.map((admin) => (
                                <div key={admin.id} className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-start gap-4 hover:bg-white/10 transition-colors group relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-0.5 shrink-0">
                                        <div className="w-full h-full rounded-full bg-[#1a0b2e] overflow-hidden relative">
                                            {admin.avatar_url ? (
                                                <Image src={admin.avatar_url} alt={admin.username} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-white">
                                                    {(admin.full_name?.[0] || "A").toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold truncate pr-2">{admin.full_name}</h3>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                                                {admin.role}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 truncate">
                                            <Mail className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{admin.email}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                                            <Calendar className="w-3 h-3 shrink-0" />
                                            Joined {new Date(admin.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveDropdown(activeDropdown === admin.id ? null : admin.id);
                                            }}
                                            className="text-gray-500 hover:text-white transition-colors p-1"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeDropdown === admin.id && (
                                            <div ref={dropdownRef} className="absolute right-0 top-8 w-32 bg-[#2a1b3e] border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(admin); }}
                                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-gray-300 hover:text-white"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteAdmin(admin.id); }}
                                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-500/10 flex items-center gap-2 text-red-400 hover:text-red-300 border-t border-white/5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Add/Edit Modal Wrapper */}
                {(showAddModal || showEditModal) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a0b2e] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
                            <button
                                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-2xl font-bold mb-2">
                                {showEditModal ? "Edit Admin Details" : "Add New Admin"}
                            </h2>
                            <p className="text-sm text-gray-400 mb-6">
                                {showEditModal ? "Update the administrator's account information." : "Create a new administrator account with full privileges."}
                            </p>

                            <form onSubmit={showEditModal ? handleUpdateAdmin : handleCreateAdmin} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={showEditModal ? editName : newAdminName}
                                            onChange={(e) => showEditModal ? setEditName(e.target.value) : setNewAdminName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="email"
                                            value={showEditModal ? editEmail : newAdminEmail}
                                            onChange={(e) => showEditModal ? setEditEmail(e.target.value) : setNewAdminEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                            placeholder="admin@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-200 flex gap-2">
                                        <ShieldAlert className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-xs text-green-200 flex gap-2">
                                        <div className="w-4 h-4 shrink-0 rounded-full bg-green-500" />
                                        {success}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={creating || processing}
                                        className="w-full py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-all shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {(creating || processing) && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {showEditModal
                                            ? (processing ? "Updating..." : "Save Changes")
                                            : (creating ? "Creating..." : "Create Admin Account")
                                        }
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
