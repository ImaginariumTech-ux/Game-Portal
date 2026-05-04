"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// ─── Module-level singleton ────────────────────────────────────────────────────
// Shared across ALL usePresence hook instances in the same page so we only
// maintain ONE Realtime channel regardless of how many components call this hook.

type PresenceListener = (ids: Set<string>) => void;

let channel: ReturnType<typeof supabase.channel> | null = null;
let subscribers = 0;
let currentOnlineIds = new Set<string>();
const listeners = new Set<PresenceListener>();

function notifyListeners() {
    listeners.forEach((fn) => fn(new Set(currentOnlineIds)));
}

function syncState() {
    if (!channel) return;
    const state = channel.presenceState();
    const ids = new Set<string>();
    for (const presences of Object.values(state)) {
        for (const p of presences as Array<{ user_id?: string }>) {
            if (p.user_id) ids.add(p.user_id);
        }
    }
    currentOnlineIds = ids;
    notifyListeners();
}

function ensureChannel(userId: string) {
    if (channel) {
        // Channel already exists — just re-track in case this user wasn't tracked yet
        channel.track({ user_id: userId });
        return;
    }

    channel = supabase.channel("global-presence");
    channel
        .on("presence", { event: "sync" }, syncState)
        .on("presence", { event: "join" }, syncState)
        .on("presence", { event: "leave" }, syncState)
        .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && channel) {
                await channel.track({ user_id: userId });
            }
        });
}

function teardownChannel() {
    if (!channel) return;
    channel.untrack();
    supabase.removeChannel(channel);
    channel = null;
    currentOnlineIds = new Set();
    notifyListeners();
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Tracks the current user's presence in a shared Realtime channel.
 * All instances across components share ONE channel (singleton).
 *
 * @param userId - The authenticated user's ID (pass null/undefined until auth resolves)
 */
export function usePresence(userId: string | null | undefined) {
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(
        new Set(currentOnlineIds)
    );

    useEffect(() => {
        if (!userId) return;

        // Register this component as a subscriber
        subscribers++;
        listeners.add(setOnlineUserIds);

        // Provide the initial state immediately if the channel is already up
        setOnlineUserIds(new Set(currentOnlineIds));

        // Start or join the shared channel
        ensureChannel(userId);

        return () => {
            listeners.delete(setOnlineUserIds as PresenceListener);
            subscribers--;
            // Only fully teardown when the LAST subscriber unmounts
            if (subscribers <= 0) {
                subscribers = 0;
                teardownChannel();
            }
        };
    }, [userId]);

    return {
        onlineUserIds,
        onlineCount: onlineUserIds.size,
        /** Returns true if the given user ID is currently online */
        isOnline: (id: string) => onlineUserIds.has(id),
    };
}

