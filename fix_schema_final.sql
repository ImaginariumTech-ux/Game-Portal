-- MagicGames - Schema & RLS Fix
-- Run this in the Supabase SQL Editor to fix room creation and lobby access issues.

-- 1. FIX ROOM_INVITES FOREIGN KEYS
-- Ensure room_invites points to game_rooms(id)
ALTER TABLE public.room_invites 
DROP CONSTRAINT IF EXISTS room_invites_room_id_fkey;

-- Cleanup: Delete existing invites that don't point to a valid game_room
DELETE FROM public.room_invites 
WHERE room_id NOT IN (SELECT id FROM public.game_rooms);

ALTER TABLE public.room_invites
ADD CONSTRAINT room_invites_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;

-- Ensure inviter and invitee point to profiles for easier joining
ALTER TABLE public.room_invites 
DROP CONSTRAINT IF EXISTS room_invites_inviter_id_fkey,
DROP CONSTRAINT IF EXISTS room_invites_invitee_id_fkey;

DELETE FROM public.room_invites WHERE inviter_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.room_invites WHERE invitee_id NOT IN (SELECT id FROM public.profiles);

ALTER TABLE public.room_invites
ADD CONSTRAINT room_invites_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT room_invites_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- 2. FIX ROOM_PLAYERS FOREIGN KEYS & COLUMNS
-- Ensure room_players has all required columns from the spec
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS is_ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'joined'; 
ALTER TABLE public.room_players DROP CONSTRAINT IF EXISTS room_players_status_check;
ALTER TABLE public.room_players ADD CONSTRAINT room_players_status_check CHECK (status IN ('joined', 'pending', 'denied'));

-- Ensure room_players points to game_rooms(id)
ALTER TABLE public.room_players 
DROP CONSTRAINT IF EXISTS room_players_room_id_fkey;

-- Cleanup: Delete existing players that don't point to a valid game_room
DELETE FROM public.room_players 
WHERE room_id NOT IN (SELECT id FROM public.game_rooms);

ALTER TABLE public.room_players
ADD CONSTRAINT room_players_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.game_rooms(id) ON DELETE CASCADE;

-- Ensure user_id points to profiles
ALTER TABLE public.room_players 
DROP CONSTRAINT IF EXISTS room_players_user_id_fkey;

DELETE FROM public.room_players WHERE user_id NOT IN (SELECT id FROM public.profiles);

ALTER TABLE public.room_players
ADD CONSTRAINT room_players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- 3. FIX GAME_ROOMS FOREIGN KEYS
-- Ensure host_id points to profiles for Supabase shorthand joins
ALTER TABLE public.game_rooms
DROP CONSTRAINT IF EXISTS game_rooms_host_id_fkey;

DELETE FROM public.game_rooms WHERE host_id NOT IN (SELECT id FROM public.profiles);

ALTER TABLE public.game_rooms
ADD CONSTRAINT game_rooms_host_id_fkey 
FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- 4. FIX RLS POLICIES (Breaking recursion and ensuring visibility)

-- Game Rooms
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read relevant rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can insert their own rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Hosts can update their own rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Game Rooms Select" ON public.game_rooms;
DROP POLICY IF EXISTS "Game Rooms Insert" ON public.game_rooms;
DROP POLICY IF EXISTS "Game Rooms Update" ON public.game_rooms;

CREATE POLICY "Game Rooms Select" ON public.game_rooms
    FOR SELECT TO authenticated
    USING (
        host_id = auth.uid() OR 
        id IN (SELECT room_id FROM public.room_players WHERE user_id = auth.uid()) OR
        id IN (SELECT room_id FROM public.room_invites WHERE invitee_id = auth.uid()) OR
        (join_code IS NOT NULL AND status != 'dissolved')
    );

CREATE POLICY "Game Rooms Insert" ON public.game_rooms
    FOR INSERT TO authenticated
    WITH CHECK (host_id = auth.uid());

CREATE POLICY "Game Rooms Update" ON public.game_rooms
    FOR UPDATE TO authenticated
    USING (host_id = auth.uid());


-- Room Players (Break recursion)
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read relevant players" ON public.room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users/Hosts can update player status" ON public.room_players;
DROP POLICY IF EXISTS "Room Players Select" ON public.room_players;
DROP POLICY IF EXISTS "Room Players Insert" ON public.room_players;
DROP POLICY IF EXISTS "Room Players Update" ON public.room_players;

CREATE POLICY "Room Players Select" ON public.room_players
    FOR SELECT TO authenticated
    USING (true); -- Visibility is handled by the parent game_rooms table

-- Allow users to join directly if it's a public room, or request to join if it's a code-entry
CREATE POLICY "Room Players Insert" ON public.room_players
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND (
            -- Can only insert as 'pending' if not the host, or 'joined' if authorized
            (status = 'pending') OR
            (EXISTS (SELECT 1 FROM public.game_rooms WHERE id = room_id AND host_id = auth.uid()))
        )
    );

CREATE POLICY "Room Players Update" ON public.room_players
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.game_rooms WHERE id = room_players.room_id AND host_id = auth.uid())
    );


-- Room Invites
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their invites" ON public.room_invites;
DROP POLICY IF EXISTS "Hosts can insert invites" ON public.room_invites;
DROP POLICY IF EXISTS "Invitees can update status" ON public.room_invites;
DROP POLICY IF EXISTS "Room Invites Select" ON public.room_invites;
DROP POLICY IF EXISTS "Room Invites Insert" ON public.room_invites;
DROP POLICY IF EXISTS "Room Invites Update" ON public.room_invites;

CREATE POLICY "Room Invites Select" ON public.room_invites
    FOR SELECT TO authenticated
    USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- Allow anyone ALREADY in the room to invite others
CREATE POLICY "Room Invites Insert" ON public.room_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        inviter_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.room_players WHERE room_id = room_invites.room_id AND user_id = auth.uid() AND status = 'joined')
    );

CREATE POLICY "Room Invites Update" ON public.room_invites
    FOR UPDATE TO authenticated
    USING (invitee_id = auth.uid());

-- 5. Enable Realtime for relevant tables
-- Note: If these errors say "already exists", you can safely ignore them.
DO $$
BEGIN
    -- Add game_rooms if not present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'game_rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
    END IF;

    -- Add room_players if not present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'room_players'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
    END IF;
END $$;

-- 6. Refresh PostgREST cache
NOTIFY pgrst, 'reload config';
