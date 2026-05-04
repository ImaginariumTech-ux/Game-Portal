"use client";

import React, { useState } from "react";
import { KeyRound, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function SeedAdminPage() {
    const [email, setEmail] = useState("admin@magic.com");
    const [password, setPassword] = useState("password123");
    const [fullName, setFullName] = useState("Super Admin");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const response = await fetch('/api/admin/seed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    fullName,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create admin user');
            }

            setStatus({ type: 'success', message: data.message });

        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0518] flex items-center justify-center p-4 text-white font-sans">
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-4 text-purple-400">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold">Admin Seeder</h1>
                    <p className="text-gray-400 text-sm text-center mt-2">Create your first admin account to access the dashboard.</p>
                </div>

                <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                        <input
                            type="text"
                            value={fullName} onChange={e => setFullName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 mt-1 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                        <input
                            type="email"
                            value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 mt-1 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                        <input
                            type="text"
                            value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 mt-1 focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl text-sm flex items-start gap-3 ${status.type === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                            {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                            <div>{status.message}</div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Admin User"}
                    </button>

                    {status?.type === 'success' && (
                        <a href="/magicadmins" className="block text-center text-sm text-gray-400 hover:text-white mt-4">
                            Back to Login
                        </a>
                    )}
                </form>

                <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-xs text-gray-500 leading-relaxed">
                        <strong className="text-gray-300">Note:</strong> This form uses public signup. If Row Level Security (RLS) policies prevent setting the 'admin' role, you may still need to manually check the "role" column in the <code>profiles</code> table in your Supabase Dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
}
