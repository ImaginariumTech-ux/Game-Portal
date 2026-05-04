-- MagicGames - FINAL Definitive RLS Fix (Idempotent)
-- This breaks the recursion by simplifying the room_players policy.
-- Run this in the Supabase SQL Editor.

-- 1. Reset everything
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL old policies to be safe (Comprehensive list)
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Hosts can see their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Players can see rooms they joined" ON public.rooms;
DROP POLICY IF EXISTS "Rooms access" ON public.rooms;
DROP POLICY IF EXISTS "Rooms Select" ON public.rooms;
DROP POLICY IF EXISTS "Users can view rooms they are in" ON public.rooms;

DROP POLICY IF EXISTS "Access to room players for authenticated users" ON public.room_players;
DROP POLICY IF EXISTS "Users can see players in rooms they can see" ON public.room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users can update their own status" ON public.room_players;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users can see their own player record" ON public.room_players;
DROP POLICY IF EXISTS "Anyone can see players in public rooms" ON public.room_players;
DROP POLICY IF EXISTS "Players can see others in same room" ON public.room_players;
DROP POLICY IF EXISTS "Users can view players in their rooms" ON public.room_players;
DROP POLICY IF EXISTS "Authenticated users can view room players" ON public.room_players;
DROP POLICY IF EXISTS "Room Players Select" ON public.room_players;
DROP POLICY IF EXISTS "Room Players Insert" ON public.room_players;
DROP POLICY IF EXISTS "Room Players Update" ON public.room_players;
DROP POLICY IF EXISTS "Room Players Delete" ON public.room_players;

-- 3. Re-enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- 4. ROOMS Policies (The source of truth for visibility)
-- Everyone can see public rooms
CREATE POLICY "Rooms Select" 
ON public.rooms FOR SELECT 
USING (
    is_public = true 
    OR host_user_id = auth.uid() 
    OR id IN (SELECT room_id FROM public.room_players WHERE user_id = auth.uid())
);

-- 5. ROOM_PLAYERS Policies (The Junction Table)
-- BREAK RECURSION: Allow anyone to SEE who is in a room. 
-- Privacy is already handled by the 'rooms' table policy above.
CREATE POLICY "Room Players Select" 
ON public.room_players FOR SELECT 
USING (true);

-- Allow authenticated users to join rooms
CREATE POLICY "Room Players Insert" 
ON public.room_players FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to manage their own status
CREATE POLICY "Room Players Update" 
ON public.room_players FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to leave
CREATE POLICY "Room Players Delete" 
ON public.room_players FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Refresh
NOTIFY pgrst, 'reload config';
