-- MagicGames Portal - Database Schema
-- Run this in Supabase SQL Editor

-- 1. Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 2. Game Modes (e.g., 'Online Ranked', 'Friend Room', etc.)
create table if not exists game_modes (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references games(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  platform_fee numeric default 0, -- Cost to play (in coins)
  prize_distribution jsonb default '{}', -- Percentage splits by position, e.g., {"1": 60, "2": 30, "3": 10, "4": 0}
  min_players integer default 2, -- Minimum players required
  max_players integer default 4, -- Maximum players allowed
  affects_leaderboard boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Rooms (for 'Friend Room' mode)
create table if not exists rooms (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references games(id) on delete cascade,
  mode_id uuid references game_modes(id) on delete cascade,
  code text unique not null, -- e.g., "ABC123"
  host_user_id uuid references auth.users(id) on delete cascade,
  config jsonb default '{}', -- Game-specific settings (e.g., board size, time limits)
  stakes numeric default 0, -- Optional coin stakes per player
  prize_distribution jsonb default '{}', -- Player-configured prize splits, e.g., {"1": 70, "2": 30}
  status text default 'waiting', -- 'waiting', 'in_progress', 'completed', 'cancelled'
  max_players integer default 4,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  started_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- 4. Room Players
create table if not exists room_players (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('joined', 'ready', 'playing', 'left')) default 'joined',
  score numeric default 0,
  rank integer, -- Final position (1, 2, 3, etc.) for prize calculation
  is_winner boolean default false, -- kept for legacy/simple checks
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (room_id, user_id)
);

-- 5. Leaderboards
create table if not exists leaderboards (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references games(id) on delete cascade,
  mode_id uuid references game_modes(id),
  name text not null,
  period text check (period in ('all_time', 'weekly', 'monthly', 'daily')) default 'all_time',
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Leaderboard Entries
create table if not exists leaderboard_entries (
  leaderboard_id uuid references leaderboards(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  score numeric default 0,
  matches_played int default 0,
  wins int default 0,
  losses int default 0,
  rank int,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (leaderboard_id, user_id)
);

-- 7. User Wallet/Coins (if not already exists)
create table if not exists user_wallets (
  user_id uuid references auth.users(id) on delete cascade primary key,
  balance numeric default 100, -- Starting coins
  total_earned numeric default 0,
  total_spent numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Wallet Transactions
create table if not exists wallet_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric not null,
  type text check (type in ('game_entry', 'game_win', 'daily_bonus', 'purchase', 'refund')) not null,
  reference_id uuid, -- room_id or game_id
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Update Games Table (add config column)
alter table games add column if not exists config_schema jsonb default '{}'::jsonb;
alter table games add column if not exists has_leaderboard boolean default false;

-- 10. Create indexes for performance
create index if not exists idx_game_modes_game_id on game_modes(game_id);
create index if not exists idx_rooms_code on rooms(code);
create index if not exists idx_rooms_status on rooms(status);
create index if not exists idx_leaderboard_entries_score on leaderboard_entries(leaderboard_id, score desc);
create index if not exists idx_wallet_transactions_user on wallet_transactions(user_id, created_at desc);
