import React from "react";

export default function DashboardSkeleton() {
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {/* Sidebar Skeleton (Visible on Desktop) */}
            <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                    <div className="ml-3 w-28 h-5 bg-slate-200 rounded animate-pulse" />
                </div>
                {/* Nav Items */}
                <div className="flex-grow p-4 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                            <div className="w-5 h-5 rounded bg-slate-200 animate-pulse shrink-0" />
                            <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
                {/* Footer User Profile */}
                <div className="p-4 border-t border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="w-20 h-3.5 bg-slate-200 rounded animate-pulse" />
                        <div className="w-28 h-2.5 bg-slate-200 rounded animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Main Content Area Skeleton */}
            <div className="flex-grow flex flex-col overflow-hidden relative">
                {/* Top header line */}
                <div className="h-12 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 justify-between">
                    <div className="w-4 h-4 bg-slate-200 rounded animate-pulse md:hidden" />
                    <div className="w-20 h-4 bg-slate-200 rounded animate-pulse ml-auto" />
                </div>

                {/* Hero / Page Content Skeleton */}
                <div className="flex-grow overflow-y-auto p-6 md:p-10 space-y-8">
                    {/* Header bar placeholder */}
                    <div className="max-w-6xl mx-auto space-y-3">
                        <div className="w-40 h-8 bg-slate-200 rounded-xl animate-pulse" />
                        <div className="w-72 h-4 bg-slate-200 rounded-md animate-pulse" />
                    </div>

                    {/* Big banner placeholder */}
                    <div className="max-w-6xl mx-auto h-48 md:h-56 bg-slate-200/60 rounded-3xl animate-pulse" />

                    {/* Columns grid placeholder */}
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white border border-slate-200/60 rounded-3xl p-5 space-y-4 shadow-sm">
                                <div className="aspect-video bg-slate-100 rounded-2xl animate-pulse" />
                                <div className="space-y-2">
                                    <div className="w-3/4 h-5 bg-slate-200 rounded animate-pulse" />
                                    <div className="w-1/2 h-3.5 bg-slate-200 rounded animate-pulse" />
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
                                    <div className="w-12 h-3 bg-slate-200 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
