-- Fix rooms foreign key
ALTER TABLE public.rooms
DROP CONSTRAINT IF EXISTS rooms_host_user_id_fkey,
ADD CONSTRAINT rooms_host_user_id_fkey
FOREIGN KEY (host_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix room_players foreign key
ALTER TABLE public.room_players
DROP CONSTRAINT IF EXISTS room_players_user_id_fkey,
ADD CONSTRAINT room_players_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix room_invites foreign keys (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_invites') THEN
        -- Fix inviter_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_invites' AND column_name = 'inviter_id') THEN
            ALTER TABLE public.room_invites
            DROP CONSTRAINT IF EXISTS room_invites_inviter_id_fkey,
            ADD CONSTRAINT room_invites_inviter_id_fkey
            FOREIGN KEY (inviter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;

        -- Fix invitee_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_invites' AND column_name = 'invitee_id') THEN
            ALTER TABLE public.room_invites
            DROP CONSTRAINT IF EXISTS room_invites_invitee_id_fkey,
            ADD CONSTRAINT room_invites_invitee_id_fkey
            FOREIGN KEY (invitee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;
