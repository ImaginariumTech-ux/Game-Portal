-- MagicGames - Diagnosis and Temporary Fix
-- 1. Try to DISABLE RLS on the problematic tables. 
-- If the error goes away after this, we know it's a policy issue.
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites DISABLE ROW LEVEL SECURITY;

-- 2. List all policies for these tables so you can see if any were missed
-- (Run this and check the output in Supabase)
SELECT tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('rooms', 'room_players', 'room_invites');

-- 3. If you want to RE-ENABLE RLS with a "Allow All" policy (unsafe but for testing):
/*
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow All Players" ON public.room_players;
CREATE POLICY "Allow All Rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow All Players" ON public.room_players FOR SELECT USING (true);
*/

-- 4. Refresh PostgREST cache
NOTIFY pgrst, 'reload config';
