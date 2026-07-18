"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Copy, Printer, FileDown, FileText, ChevronDown, ChevronUp, Terminal, Key, Shield, Info, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function SwaggerDocContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const autoprint = searchParams.get("autoprint") === "true";

    const [game, setGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedSec, setCopiedSec] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState(false);
    const [baseUrl, setBaseUrl] = useState("");

    // Collapsed panels state
    const [initOpen, setInitOpen] = useState(true);
    const [completeOpen, setCompleteOpen] = useState(true);
    const [hmacOpen, setHmacOpen] = useState(true);
    const [iframeOpen, setIframeOpen] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setBaseUrl(`${window.location.protocol}//${window.location.host}/api/game`);
        }
        fetchGameDetails();
    }, [id]);

    const fetchGameDetails = async () => {
        try {
            const { data, error } = await supabase
                .from("games")
                .select("title, slug, webhook_secret")
                .eq("id", id)
                .single();
            if (error) throw error;
            setGame(data);
            setLoading(false);

            // Auto-print fallback trigger if query parameter matches
            if (autoprint) {
                setTimeout(() => {
                    window.print();
                }, 1000);
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleCopy = (text: string, setter: (val: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#1a0b2e] items-center justify-center flex-col gap-3 text-white">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                <p className="text-gray-400 font-semibold animate-pulse">Compiling API documentation...</p>
            </div>
        );
    }

    if (error || !game) {
        return (
            <div className="flex h-screen bg-[#1a0b2e] items-center justify-center flex-col gap-4 text-white">
                <Shield className="w-12 h-12 text-red-500" />
                <p className="text-red-400 font-bold">Error loading integration data: {error}</p>
                <button onClick={() => router.back()} className="text-purple-400 hover:underline text-sm flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0e0717] text-gray-200 font-sans selection:bg-purple-500/30">
            {/* ─── PRINT CSS ─── */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        color: #0f172a !important;
                    }
                    /* Hide web-only interactive navigation */
                    .no-print {
                        display: none !important;
                    }
                    /* Force all panels to expand during print */
                    .printable-expand {
                        display: block !important;
                        max-height: none !important;
                        opacity: 1 !important;
                    }
                    .printable-card {
                        background-color: #f8fafc !important;
                        border: 1px solid #e2e8f0 !important;
                        color: #0f172a !important;
                    }
                    pre, code {
                        background-color: #f1f5f9 !important;
                        border: 1px solid #cbd5e1 !important;
                        color: #334155 !important;
                    }
                    /* Color headers nicely */
                    h1 { color: #5B21B6 !important; }
                    h2 { color: #4338CA !important; }
                    h3 { color: #1e293b !important; }
                }
            `}</style>

            {/* ─── TOP ACTION HEADER BAR (NO-PRINT) ─── */}
            <header className="no-print sticky top-0 z-50 h-20 bg-[#160d24]/80 backdrop-blur-md border-b border-white/5 flex items-center px-8 justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5"
                    >
                        <ArrowLeft className="w-4 h-4 text-white" />
                    </button>
                    <div>
                        <h1 className="text-sm font-bold text-white leading-none">Integration Guide</h1>
                        <span className="text-[10px] text-purple-400 font-semibold font-mono">Game: {game.title}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* PDF Trigger */}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 text-xs transition-all transform hover:scale-103 cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        Download PDF
                    </button>
                    {/* Word Trigger */}
                    <a
                        href={`/api/game/doc?gameId=${id}&format=word`}
                        className="flex items-center gap-2 px-4.5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    >
                        <FileDown className="w-4 h-4" />
                        Download Word
                    </a>
                    {/* Markdown Trigger */}
                    <a
                        href={`/api/game/doc?gameId=${id}&format=markdown`}
                        className="flex items-center gap-2 px-4.5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    >
                        <FileText className="w-4 h-4" />
                        Download Markdown
                    </a>
                </div>
            </header>

            {/* ─── DOCUMENT WORKSPACE ─── */}
            <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
                {/* 1. Header Spec Stamp */}
                <section className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 printable-card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">{game.title}</h2>
                            <p className="text-sm text-gray-400 mt-1">API Documentation for secure platform integration</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 font-extrabold rounded-full text-[10px] uppercase border border-purple-500/20 select-none">
                                API Version: 1.0.0
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">Spec version: 1.0</span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed">
                        The MagicGames portal maintains absolute authority over all user identities, coin balances, scoring histories, and leaderboards. Your HTML5 game handles strictly the visual runtime inside our client iframe.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                        {/* Game Slug */}
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-2 block">Game Slug</label>
                            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5">
                                <code className="flex-1 font-mono text-xs text-gray-300 truncate select-all">{game.slug || "—"}</code>
                                <button
                                    onClick={() => handleCopy(game.slug || "", setCopiedSlug)}
                                    className="no-print text-[10px] font-bold text-purple-400 hover:text-purple-300"
                                >
                                    {copiedSlug ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* Private Webhook Secret */}
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-2 block">Private Webhook Secret</label>
                            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5">
                                <Key className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <code className="flex-1 font-mono text-xs text-purple-300 truncate select-all">{game.webhook_secret || "Not Configured"}</code>
                                <button
                                    onClick={() => handleCopy(game.webhook_secret || "", setCopiedSec)}
                                    className="no-print text-[10px] font-bold text-purple-400 hover:text-purple-300"
                                >
                                    {copiedSec ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* Game UUID */}
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mb-2 block">Game Identifier (UUID)</label>
                            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5">
                                <code className="flex-1 font-mono text-xs text-gray-300 truncate select-all">{id}</code>
                                <button
                                    onClick={() => handleCopy(id, setCopiedId)}
                                    className="no-print text-[10px] font-bold text-purple-400 hover:text-purple-300"
                                >
                                    {copiedId ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Base Server Info */}
                <section className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 printable-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">Target API Endpoint</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Base routing URL configured for this portal instance</p>
                        </div>
                    </div>
                    <code className="bg-black/30 border border-white/5 px-4 py-2.5 rounded-xl text-xs font-mono text-gray-300 select-all font-bold">
                        {baseUrl}
                    </code>
                </section>

                {/* 3. SWAGGER ENDPOINTS LIST */}
                <h3 className="text-lg font-bold text-gray-300 tracking-tight border-b border-white/5 pb-2">REST API Resources</h3>

                {/* ── Endpoint 1: GET /game/init ── */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden printable-card">
                    {/* Collapsible Header */}
                    <div 
                        onClick={() => setInitOpen(!initOpen)}
                        className={`flex items-center justify-between p-5 cursor-pointer select-none no-print ${
                            initOpen ? "bg-[#181126]/40" : ""
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 font-extrabold rounded-full text-[10px] uppercase border border-blue-500/20">
                                GET
                            </span>
                            <span className="font-mono text-sm font-bold text-white">/game/init</span>
                            <span className="text-xs text-gray-500 font-medium hidden md:inline">Initialize Game Session</span>
                        </div>
                        {initOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>

                    <div className="p-5 border-t border-white/5 bg-[#181126]/20 font-bold hidden md:flex items-center gap-2 text-xs text-blue-400 border-b border-white/5">
                        GET {baseUrl}/init
                    </div>

                    {/* Printable Header */}
                    <div className="hidden print:block p-5 border-b border-white/5 bg-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 font-mono">GET /game/init</h2>
                        <p className="text-xs text-slate-500 mt-1">Initialize Game Session parameters</p>
                    </div>

                    {/* Panel Body */}
                    {(initOpen || autoprint) && (
                        <div className="p-6 space-y-6 printable-expand">
                            <div>
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-3">Parameters (Query)</h4>
                                <table className="w-full text-sm border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-xs text-gray-500">
                                            <th className="py-2.5 font-semibold w-1/4">Name</th>
                                            <th className="py-2.5 font-semibold w-1/4">Type</th>
                                            <th className="py-2.5 font-semibold w-1/4">Required</th>
                                            <th className="py-2.5 font-semibold w-1/4">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        <tr>
                                            <td className="py-3.5 font-mono text-xs text-white">sessionId</td>
                                            <td className="py-3.5 text-xs font-mono text-purple-400">string (UUID)</td>
                                            <td className="py-3.5 text-xs text-red-400 font-bold">Yes</td>
                                            <td className="py-3.5 text-xs text-gray-400">The game session ID parsed from query string params.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <hr className="border-white/5" />

                            <div>
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-3">Response body (200 OK)</h4>
                                <pre className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-purple-300 overflow-x-auto font-mono select-all">
{JSON.stringify({
  success: true,
  session: {
    id: "4a71efc5-e51c-4df0-948f-3df1383bc123",
    mode: "tournament",
    status: "in_progress",
    game_title: game.title || "Game Title",
    game_slug: game.slug || "game-slug"
  },
  player: {
    id: "user-uuid-12345",
    name: "John Doe",
    username: "johndoe",
    avatar: "https://example.com/avatars/johndoe.png"
  }
}, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Endpoint 2: POST /game/match/complete ── */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden printable-card">
                    {/* Collapsible Header */}
                    <div 
                        onClick={() => setCompleteOpen(!completeOpen)}
                        className={`flex items-center justify-between p-5 cursor-pointer select-none no-print ${
                            completeOpen ? "bg-[#181126]/40" : ""
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-extrabold rounded-full text-[10px] uppercase border border-emerald-500/20">
                                POST
                            </span>
                            <span className="font-mono text-sm font-bold text-white">/game/match/complete</span>
                            <span className="text-xs text-gray-500 font-medium hidden md:inline">Submit Match Score</span>
                        </div>
                        {completeOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>

                    <div className="p-5 border-t border-white/5 bg-[#181126]/20 font-bold hidden md:flex items-center gap-2 text-xs text-emerald-400 border-b border-white/5">
                        POST {baseUrl}/match/complete
                    </div>

                    {/* Printable Header */}
                    <div className="hidden print:block p-5 border-b border-white/5 bg-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 font-mono">POST /game/match/complete</h2>
                        <p className="text-xs text-slate-500 mt-1">Submit Match Score parameters and security payload</p>
                    </div>

                    {/* Panel Body */}
                    {(completeOpen || autoprint) && (
                        <div className="p-6 space-y-6 printable-expand">
                            <div>
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-3">Headers</h4>
                                <table className="w-full text-sm border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-xs text-gray-500">
                                            <th className="py-2.5 font-semibold w-1/4">Name</th>
                                            <th className="py-2.5 font-semibold w-1/4">Type</th>
                                            <th className="py-2.5 font-semibold w-1/4">Required</th>
                                            <th className="py-2.5 font-semibold w-1/4">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        <tr>
                                            <td className="py-3.5 font-mono text-xs text-white">X-Portal-Signature</td>
                                            <td className="py-3.5 text-xs font-mono text-purple-400">string (Hex)</td>
                                            <td className="py-3.5 text-xs text-red-400 font-bold">Yes</td>
                                            <td className="py-3.5 text-xs text-gray-400">HMAC-SHA256 of the raw body signed with the webhook secret.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <hr className="border-white/5" />

                            <div>
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-3">Request Body</h4>
                                <pre className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-purple-300 overflow-x-auto font-mono select-all">
{JSON.stringify({
  sessionId: "4a71efc5-e51c-4df0-948f-3df1383bc123",
  score: 10500
}, null, 2)}
                                </pre>
                            </div>

                            <hr className="border-white/5" />

                            <div>
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-3">Response body (200 OK)</h4>
                                <pre className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-purple-300 overflow-x-auto font-mono select-all">
{JSON.stringify({
  success: true,
  message: "Score submitted successfully",
  is_personal_best: true,
  best_score: 10500
}, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. SIGNATURE CODE BLOCKS */}
                <h3 className="text-lg font-bold text-gray-300 tracking-tight border-b border-white/5 pb-2">HMAC Signature Implementations</h3>

                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden printable-card">
                    {/* Collapsible Header */}
                    <div 
                        onClick={() => setHmacOpen(!hmacOpen)}
                        className={`flex items-center justify-between p-5 cursor-pointer select-none no-print ${
                            hmacOpen ? "bg-[#181126]/40" : ""
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Terminal className="w-5 h-5 text-purple-400 shrink-0" />
                            <span className="font-bold text-white text-sm">HMAC-SHA256 Signature Code Examples</span>
                        </div>
                        {hmacOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>

                    <div className="hidden print:block p-5 border-b border-white/5 bg-slate-100 font-bold text-slate-800 text-sm">
                        HMAC-SHA256 Backend Signature Guides
                    </div>

                    {(hmacOpen || autoprint) && (
                        <div className="p-6 space-y-6 printable-expand">
                            <div>
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-3">Node.js JavaScript Code Sample</h4>
                                <pre className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto font-mono select-all">
{`const crypto = require('crypto');

const secret = "${game.webhook_secret || 'YOUR_WEBHOOK_SECRET'}";
const body = JSON.stringify({
  sessionId: "4a71efc5-e51c-4df0-948f-3df1383bc123",
  score: 10500
});

const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

// Set request headers: 
// headers['X-Portal-Signature'] = signature;`}
                                </pre>
                            </div>

                            <hr className="border-white/5" />

                            <div>
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mb-3">Python Code Sample</h4>
                                <pre className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs text-emerald-400 overflow-x-auto font-mono select-all">
{`import hmac
import hashlib
import json

secret = b"${game.webhook_secret || 'YOUR_WEBHOOK_SECRET'}"
payload = {
    "sessionId": "4a71efc5-e51c-4df0-948f-3df1383bc123",
    "score": 10500
}
body = json.dumps(payload, separators=(',', ':')).encode('utf-8')

signature = hmac.new(secret, body, hashlib.sha256).hexdigest()
# Pass in request headers: 
# {"X-Portal-Signature": signature}`}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. IFRAME CONTROLS */}
                <h3 className="text-lg font-bold text-gray-300 tracking-tight border-b border-white/5 pb-2">Iframe postMessage Bridge</h3>

                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden printable-card">
                    {/* Collapsible Header */}
                    <div 
                        onClick={() => setIframeOpen(!iframeOpen)}
                        className={`flex items-center justify-between p-5 cursor-pointer select-none no-print ${
                            iframeOpen ? "bg-[#181126]/40" : ""
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 text-purple-400 shrink-0" />
                            <span className="font-bold text-white text-sm">HTML5 postMessage Iframe Bridge Channels</span>
                        </div>
                        {iframeOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>

                    <div className="hidden print:block p-5 border-b border-white/5 bg-slate-100 font-bold text-slate-800 text-sm">
                        Iframe HTML5 Web messaging (postMessage) contract
                    </div>

                    {(iframeOpen || autoprint) && (
                        <div className="p-6 space-y-6 printable-expand">
                            <p className="text-xs text-gray-400 leading-relaxed">
                                The game runs inside a client-side iframe. You can post messages to the parent portal page window to trigger events in real time (e.g. updating the score counter overlay or performing seamless restarts).
                            </p>

                            <div className="space-y-4">
                                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                    <div className="font-bold text-sm text-white mb-2 font-mono">1. SCORE_UPDATE (Broadcast real-time score milestones)</div>
                                    <pre className="bg-black/30 border border-white/5 p-3 rounded-lg text-xs text-purple-300 font-mono">
{`window.parent.postMessage({
  type: "SCORE_UPDATE",
  score: 10500
}, "*");`}
                                    </pre>
                                </div>

                                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                    <div className="font-bold text-sm text-white mb-2 font-mono">2. MATCH_COMPLETE (Broadcast game over)</div>
                                    <pre className="bg-black/30 border border-white/5 p-3 rounded-lg text-xs text-purple-300 font-mono">
{`window.parent.postMessage({
  type: "MATCH_COMPLETE",
  score: 10500
}, "*");`}
                                    </pre>
                                </div>

                                <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                    <div className="font-bold text-sm text-white mb-2 font-mono">3. Replay Loop (REQUEST_RESTART / RESTART_GAME / RESTART_ACK)</div>
                                    <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                                        Post a message to ask for a new session. The portal will return a new `sessionId` in the `RESTART_GAME` event, which you must apply and acknowledge with `RESTART_ACK`.
                                    </p>
                                    <pre className="bg-black/30 border border-white/5 p-3 rounded-lg text-xs text-purple-300 font-mono">
{`// Ask portal to create new session
window.parent.postMessage({ type: "REQUEST_RESTART" }, "*");

// Listen for response from portal
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "RESTART_GAME") {
    const newSessionId = event.data.sessionId;
    // Apply newSessionId inside your game, then acknowledge:
    window.parent.postMessage({ type: "RESTART_ACK" }, "*");
  }
});`}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function SwaggerDocPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen bg-[#1a0b2e] items-center justify-center flex-col gap-3 text-white">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                <p className="text-gray-400 font-semibold animate-pulse">Loading Document...</p>
            </div>
        }>
            <SwaggerDocContent />
        </Suspense>
    );
}
