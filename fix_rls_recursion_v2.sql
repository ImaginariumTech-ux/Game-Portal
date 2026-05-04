-- MagicGames - Robust RLS Recursion Fix
-- This uses SECURITY DEFINER functions to break the recursion chain.
-- Run this in the Supabase SQL Editor.

-- 1. Create a helper function to check membership WITHOUT triggering RLS recursion
-- SECURITY DEFINER means it runs with the privileges of the creator (usually postgres), bypassing RLS on room_players.
CREATE OR REPLACE FUNCTION public.check_room_membership(room_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_players 
    WHERE room_id = room_id_param 
    AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Disable RLS temporarily to reset policies
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players DISABLE ROW LEVEL SECURITY;

-- 3. Drop all potentially conflicting policies
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Hosts can see their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Players can see rooms they joined" ON public.rooms;
DROP POLICY IF EXISTS "Users can view rooms they are in" ON public.rooms;

DROP POLICY IF EXISTS "Access to room players for authenticated users" ON public.room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users can update their own status" ON public.room_players;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users can see their own player record" ON public.room_players;
DROP POLICY IF EXISTS "Anyone can see players in public rooms" ON public.room_players;
DROP POLICY IF EXISTS "Players can see others in same room" ON public.room_players;
DROP POLICY IF EXISTS "Users can view players in their rooms" ON public.room_players;
DROP POLICY IF EXISTS "Authenticated users can view room players" ON public.room_players;

-- 4. Re-enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- 5. Create CLEAN Policies for ROOMS using the helper function
CREATE POLICY "Public rooms are viewable by everyone" 
ON public.rooms FOR SELECT 
USING (is_public = true);

CREATE POLICY "Hosts can see their own rooms" 
ON public.rooms FOR SELECT 
USING (auth.uid() = host_user_id);

CREATE POLICY "Players can see rooms they joined" 
ON public.rooms FOR SELECT 
USING (public.check_room_membership(id, auth.uid()));

-- 6. Create CLEAN Policies for ROOM_PLAYERS
-- Grant access to see who is in a room (Uses the same helper function logic)
CREATE POLICY "Users can see players in rooms they can see" 
ON public.room_players FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR 
  public.check_room_membership(room_id, auth.uid()) OR
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND is_public = true)
);

-- Note: Inserting into rooms uses the same functions
CREATE POLICY "Users can join rooms" 
ON public.room_players FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status" 
ON public.room_players FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" 
ON public.room_players FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 7. Refresh PostgREST cache
NOTIFY pgrst, 'reload config';
