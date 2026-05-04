-- Graviton Game Room System - Migration Script
-- Compliant with Specification v1.0

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE room_mode AS ENUM ('friend_room', 'online_ranked', 'practice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM ('forming', 'open', 'live', 'dissolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('escrow', 'release_win', 'release_cancel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1.5 Update games table with missing columns if needed
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 4;

-- 2. Create game_rooms table
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    mode room_mode NOT NULL,
    status room_status NOT NULL DEFAULT 'forming',
    stake_amount INTEGER NOT NULL DEFAULT 0,
    join_code TEXT UNIQUE NOT NULL,
    max_players INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dissolved_at TIMESTAMPTZ
);

-- 3. Create room_players table
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(room_id, user_id)
);

-- 4. Create room_invites table
CREATE TABLE IF NOT EXISTS public.room_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status invite_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create coin_transactions table
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for game_rooms
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read relevant rooms" ON public.game_rooms;
    CREATE POLICY "Users can read relevant rooms" ON public.game_rooms
        FOR SELECT TO authenticated
        USING (
            host_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.room_invites WHERE room_id = game_rooms.id AND invitee_id = auth.uid())
        );

    DROP POLICY IF EXISTS "Users can insert their own rooms" ON public.game_rooms;
    CREATE POLICY "Users can insert their own rooms" ON public.game_rooms
        FOR INSERT TO authenticated
        WITH CHECK (host_id = auth.uid());

    DROP POLICY IF EXISTS "Hosts can update their own rooms" ON public.game_rooms;
    CREATE POLICY "Hosts can update their own rooms" ON public.game_rooms
        FOR UPDATE TO authenticated
        USING (host_id = auth.uid());
END $$;

-- 8. RLS Policies for room_players
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read relevant players" ON public.room_players;
    CREATE POLICY "Users can read relevant players" ON public.room_players
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid() OR -- Everyone can see themselves
            EXISTS (SELECT 1 FROM public.game_rooms WHERE id = room_id AND host_id = auth.uid()) OR -- Host can see everyone
            EXISTS (SELECT 1 FROM public.room_invites WHERE room_id = room_id AND invitee_id = auth.uid()) -- Invited users can see players
        );

    DROP POLICY IF EXISTS "Users can join rooms" ON public.room_players;
    CREATE POLICY "Users can join rooms" ON public.room_players
        FOR INSERT TO authenticated
        WITH CHECK (
            user_id = auth.uid() AND (
                EXISTS (SELECT 1 FROM public.game_rooms WHERE id = room_id AND (host_id = auth.uid() OR status = 'open'))
            )
        );

    DROP POLICY IF EXISTS "Users/Hosts can update player status" ON public.room_players;
    CREATE POLICY "Users/Hosts can update player status" ON public.room_players
        FOR UPDATE TO authenticated
        USING (
            user_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.game_rooms WHERE id = room_players.room_id AND host_id = auth.uid())
        );
END $$;

-- 9. RLS Policies for room_invites
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read their invites" ON public.room_invites;
    CREATE POLICY "Users can read their invites" ON public.room_invites
        FOR SELECT TO authenticated
        USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

    DROP POLICY IF EXISTS "Hosts can insert invites" ON public.room_invites;
    CREATE POLICY "Hosts can insert invites" ON public.room_invites
        FOR INSERT TO authenticated
        WITH CHECK (inviter_id = auth.uid());

    DROP POLICY IF EXISTS "Invitees can update status" ON public.room_invites;
    CREATE POLICY "Invitees can update status" ON public.room_invites
        FOR UPDATE TO authenticated
        USING (invitee_id = auth.uid())
        WITH CHECK (invitee_id = auth.uid());
END $$;

-- 10. RLS Policies for coin_transactions
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read their transactions" ON public.coin_transactions;
    CREATE POLICY "Users can read their transactions" ON public.coin_transactions
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
END $$;

-- 11. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_host_id ON public.game_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_join_code ON public.game_rooms(join_code);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_invites_invitee_id ON public.room_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON public.coin_transactions(user_id);
