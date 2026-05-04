-- MagicGames - Fix RLS Recursion Error (Idempotent)
-- Run this in the Supabase SQL Editor

-- 1. Disable RLS temporarily to reset
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players DISABLE ROW LEVEL SECURITY;

-- 2. Drop all potentially conflicting policies
-- For ROOMS
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Hosts can see their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Players can see rooms they joined" ON public.rooms;
DROP POLICY IF EXISTS "Users can view rooms they are in" ON public.rooms;

-- For ROOM_PLAYERS
DROP POLICY IF EXISTS "Access to room players for authenticated users" ON public.room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users can update their own status" ON public.room_players;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users can see their own player record" ON public.room_players;
DROP POLICY IF EXISTS "Anyone can see players in public rooms" ON public.room_players;
DROP POLICY IF EXISTS "Players can see others in same room" ON public.room_players;
DROP POLICY IF EXISTS "Users can view players in their rooms" ON public.room_players;
DROP POLICY IF EXISTS "Authenticated users can view room players" ON public.room_players;

-- 3. Re-enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- 4. Create CLEAN, NON-RECURSIVE Policies for ROOMS
CREATE POLICY "Public rooms are viewable by everyone" 
ON public.rooms FOR SELECT 
USING (is_public = true);

CREATE POLICY "Hosts can see their own rooms" 
ON public.rooms FOR SELECT 
USING (auth.uid() = host_user_id);

CREATE POLICY "Players can see rooms they joined" 
ON public.rooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_players 
    WHERE public.room_players.room_id = public.rooms.id 
    AND public.room_players.user_id = auth.uid()
  )
);

-- 5. Create CLEAN, NON-RECURSIVE Policies for ROOM_PLAYERS
-- Grant access to see who is in a room
CREATE POLICY "Access to room players for authenticated users" 
ON public.room_players FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to join rooms
CREATE POLICY "Users can join rooms" 
ON public.room_players FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own status
CREATE POLICY "Users can update their own status" 
ON public.room_players FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow users to leave rooms
CREATE POLICY "Users can leave rooms" 
ON public.room_players FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 6. Refresh PostgREST cache
NOTIFY pgrst, 'reload config';
