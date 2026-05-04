"use client";

import React from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const STEPS = [
    { id: 'mode', label: 'Mode', path: '/dashboard/gameroom/create/mode' },
    { id: 'game', label: 'Game', path: '/dashboard/gameroom/create/game' },
    { id: 'stakes', label: 'Stakes', path: '/dashboard/gameroom/create/stakes' },
    { id: 'invite', label: 'Invite', path: '/dashboard/gameroom/create/invite' },
];

export default function CreateRoomLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const currentStepIndex = STEPS.findIndex(step => pathname.includes(step.id));

    return (
        <div className="flex h-screen bg-[#0d0f14] text-white font-sans overflow-hidden">
            <Sidebar currentActiveId="gameroom" />

            <div className="flex-1 flex flex-col overflow-hidden bg-[#090b0f] relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />

                <main className="flex-1 overflow-y-auto relative z-10 no-scrollbar">
                    <div className="max-w-4xl mx-auto pt-20 pb-20 px-8">
                        {/* Stepper */}
                        <div className="flex items-center justify-between mb-16">
                            {STEPS.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center gap-3 group">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all border ${
                                            index <= currentStepIndex 
                                            ? "bg-purple-600 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" 
                                            : "bg-white/5 border-white/10 text-gray-500"
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                            index <= currentStepIndex ? "text-purple-400" : "text-gray-600"
                                        }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`flex-1 h-[2px] mx-4 -mt-6 transition-all ${
                                            index < currentStepIndex ? "bg-purple-600" : "bg-white/5"
                                        }`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
