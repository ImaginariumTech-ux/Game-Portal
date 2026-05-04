"use client";

import React, { useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { FileDown, Terminal } from 'lucide-react';

export default function AdminApiDocsPage() {
    useEffect(() => {
        // Dynamically load Swagger UI CSS and JS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
        script.async = true;
        script.onload = () => {
            // @ts-ignore
            window.SwaggerUIBundle({
                url: '/swagger.yaml',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    // @ts-ignore
                    window.SwaggerUIBundle.presets.apis,
                    // @ts-ignore
                    window.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
            });
        };
        document.body.appendChild(script);

        return () => {
            // Clean up when unmounting
            if (document.head.contains(link)) document.head.removeChild(link);
            if (document.body.contains(script)) document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="flex h-screen bg-[#1a0b2e] text-white font-sans overflow-hidden">
            <AdminSidebar activeItem="api-docs" />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-900/10 blur-[120px] rounded-full pointer-events-none" />

                <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 md:px-12 border-b border-white/5 bg-[#1a0b2e]/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                            <Terminal className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white uppercase italic tracking-tight">API Documentation</h1>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Developer Integration Guide</p>
                        </div>
                    </div>

                    <a 
                        href="/swagger.yaml" 
                        download 
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all shadow-lg"
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        Download YAML
                    </a>
                </header>

                <main className="flex-1 overflow-y-auto relative z-10 bg-white no-scrollbar">
                    <div id="swagger-ui" className="min-h-full">
                        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                            <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.2em]">Booting Swagger Engine...</p>
                        </div>
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .swagger-ui .topbar { display: none; }
                .swagger-ui .info { margin: 30px 0; padding: 0 20px; }
                .swagger-ui .scheme-container { background: transparent; box-shadow: none; padding: 20px; border-bottom: 1px solid #eee; }
                .swagger-ui .opblock-tag-section { padding: 0 20px; }
                .swagger-ui .info .title { color: #1a0b2e; font-family: inherit; font-weight: 900; text-transform: uppercase; font-style: italic; }
                .swagger-ui .info p, .swagger-ui .info li { color: #4a5568; font-size: 14px; }
                .swagger-ui .opblock .opblock-summary-path { font-family: monospace; font-weight: 700; }
                
                #swagger-ui::-webkit-scrollbar {
                    width: 6px;
                }
                #swagger-ui::-webkit-scrollbar-track {
                    background: #f7fafc;
                }
                #swagger-ui::-webkit-scrollbar-thumb {
                    background: #cbd5e0;
                    border-radius: 10px;
                }
                #swagger-ui::-webkit-scrollbar-thumb:hover {
                    background: #a0aec0;
                }
            `}</style>
        </div>
    );
}
