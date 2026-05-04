"use client";

import React from "react";
import Image from "next/image";
import {
    LayoutGrid,
    Gamepad2,
    Users,
    Shield,
    LogOut,
    Key,
    FileCode,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface AdminSidebarProps {
    activeItem?: string;
}

export default function AdminSidebar({ activeItem = "dashboard" }: AdminSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAdminAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (pathname !== '/magicadmins') {
                    router.replace('/magicadmins');
                }
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                // If they are a verified gamer, kick them to the gamer dashboard instead of the admin login
                router.replace('/dashboard');
            }
        };

        checkAdminAccess();
    }, [pathname, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/magicadmins');
    };

    return (
        <aside className="w-64 flex flex-col p-6 gap-8 border-r border-white/5 bg-[#1a0b2e]/50 backdrop-blur-xl shrink-0 h-screen">
            <div className="flex items-center gap-2 px-2">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                    <Image
                        src="/magic-logo-white.png"
                        alt="Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <span className="font-bold text-lg tracking-tight">Magic Admin</span>
            </div>

            <nav className="flex-1 space-y-2">
                <NavItem
                    icon={LayoutGrid}
                    label="Dashboard"
                    href="/magicadmins/dashboard"
                    active={activeItem === "dashboard"}
                />
                <NavItem
                    icon={Gamepad2}
                    label="Games"
                    href="/magicadmins/games"
                    active={activeItem === "games"}
                />
                <NavItem
                    icon={LayoutGrid} // Using LayoutGrid as a placeholder, can be changed to something more appropriate like 'Library' or 'Folder' if available in lucide-react imports
                    label="Collections"
                    href="/magicadmins/collections"
                    active={activeItem === "collections"}
                />
                <NavItem
                    icon={Shield}
                    label="Subadmins"
                    href="/magicadmins/subadmins"
                    active={activeItem === "subadmins"}
                />
                <NavItem
                    icon={Users}
                    label="Users"
                    href="/magicadmins/users"
                    active={activeItem === "users"}
                />
                <NavItem
                    icon={Key}
                    label="API Keys"
                    href="/magicadmins/api-keys"
                    active={activeItem === "api-keys"}
                />
                <NavItem
                    icon={FileCode}
                    label="API Docs"
                    href="/magicadmins/api-docs"
                    active={activeItem === "api-docs"}
                />
            </nav>


            <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-gray-400 hover:text-white mt-auto"
            >
                <LogOut className="w-4 h-4" />
                Log Out
            </button>
        </aside>
    );
}

// Subcomponents

function NavItem({ icon: Icon, label, active = false, href }: { icon: any; label: string; active?: boolean, href: string }) {
    return (
        <Link href={href} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all cursor-pointer group ${active ? 'bg-gradient-to-r from-red-900/40 to-red-800/10 border-l-4 border-red-500' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
            <Icon className={`w-5 h-5 ${active ? 'text-red-400' : 'text-gray-400 group-hover:text-white transition-colors'}`} />
            <span className={`text-sm font-medium ${active ? 'text-white' : ''}`}>{label}</span>
        </Link>
    )
}

function OnlinePlayer({ name, image }: { name: string, image: string }) {
    return (
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                {/* <Image src={image} ... /> */}
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800" />
            </div>
            <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{name}</span>
        </div>
    )
}
