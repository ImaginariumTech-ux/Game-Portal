-- MagicGames - Room Invites RLS Fix
-- Run this in the Supabase SQL Editor.

-- 1. Ensure RLS is enabled
ALTER TABLE public.room_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename, schemaname 
                FROM pg_policies 
                WHERE tablename = 'room_invites')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 3. Create NEW Policies

-- Allow users to see invites they sent or received
CREATE POLICY "Users can view their own room invites" 
ON public.room_invites FOR SELECT 
TO authenticated 
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Allow users to send invites
CREATE POLICY "Users can send room invites" 
ON public.room_invites FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = inviter_id);

-- Allow users to update invites they received (e.g., accept/decline)
CREATE POLICY "Users can update received invites" 
ON public.room_invites FOR UPDATE 
TO authenticated 
USING (auth.uid() = invitee_id)
WITH CHECK (auth.uid() = invitee_id);

-- Allow users to delete invites they sent (cancel invite)
CREATE POLICY "Users can delete sent invites" 
ON public.room_invites FOR DELETE 
TO authenticated 
USING (auth.uid() = inviter_id);

-- 4. Refresh PostgREST cache
NOTIFY pgrst, 'reload config';
