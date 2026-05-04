"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Check if user has admin role
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
            if (profile?.role !== 'admin') {
                await supabase.auth.signOut();
                throw new Error("Unauthorized: Top level admin access only");
            }

            // Show success toast
            toast.success("Login successful! Redirecting...", {
                duration: 2000,
                position: "top-center",
                style: {
                    background: "#10b981",
                    color: "#fff",
                    fontWeight: "bold",
                },
            });

            // Use window.location for hard navigation to ensure middleware runs with fresh session
            setTimeout(() => {
                window.location.href = "/magicadmins/dashboard";
            }, 800);
        } catch (err: any) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black font-sans py-12">
            {/* Toast Notifications */}
            <Toaster />

            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/original-1f692d0c07a45adcd2bf52917238fb46.png"
                    alt="Admin Background"
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-lg p-4 sm:p-8">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 transform transition-all hover:scale-[1.01] duration-500">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-16 h-16 relative mb-4 rounded-xl overflow-hidden">
                            <Image
                                src="/magic-logo-white.png"
                                alt="Magic Admin Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-2 drop-shadow-md">
                            Magic Admin
                        </h1>
                        <p className="text-gray-300 text-sm tracking-wide uppercase font-medium">
                            Secure Access Portal
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-gray-500 transition-all duration-300"
                                    placeholder="admin@magicgames.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-gray-500 transition-all duration-300"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-sm text-red-200 animate-fadeIn">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group relative flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-blue-500/25 mt-8 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <span className="relative z-10 flex items-center gap-2">
                                        Sign In <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-2">
                        <p className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer">
                            Forgot your credentials? Contact IT Support.
                        </p>
                        <a href="/magicadmins/seed" className="text-xs text-purple-400 hover:text-purple-300 hover:underline flex items-center justify-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                            <KeyRound className="w-3 h-3" />
                            First-time Setup?
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
