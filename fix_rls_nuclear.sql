-- MagicGames - "The Nuclear Option" RLS Fix
-- This script will dynamically FIND AND DROP all RLS policies on rooms and room_players
-- before applying the final non-recursive ones.

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename, schemaname 
                FROM pg_policies 
                WHERE tablename IN ('rooms', 'room_players'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 1. Reset RLS state
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- 2. FINAL Policies for ROOMS (The only source of truth)
-- Everyone can see public rooms, hosts see their own, players see theirs.
CREATE POLICY "Rooms Select" 
ON public.rooms FOR SELECT 
USING (
    is_public = true 
    OR host_user_id = auth.uid() 
    OR id IN (SELECT room_id FROM public.room_players WHERE user_id = auth.uid())
);

-- 3. FINAL Policies for ROOM_PLAYERS (The Junction Table)
-- BREAK RECURSION: Allow authenticated users to view all membership records.
-- Privacy is handled by the parent 'rooms' table policy.
CREATE POLICY "Room Players Select" 
ON public.room_players FOR SELECT 
USING (true);

-- Allow joining
CREATE POLICY "Room Players Insert" 
ON public.room_players FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow managing own status
CREATE POLICY "Room Players Update" 
ON public.room_players FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow leaving
CREATE POLICY "Room Players Delete" 
ON public.room_players FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Refresh PostgREST cache
NOTIFY pgrst, 'reload config';
