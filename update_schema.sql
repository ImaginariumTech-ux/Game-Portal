-- Run this in Supabase SQL Editor to update existing tables

-- 1. Update game_modes table
alter table game_modes 
add column if not exists prize_distribution jsonb default '{}',
add column if not exists min_players integer default 2,
add column if not exists max_players integer default 4,
drop column if exists reward_pool;

-- 2. Update rooms table
alter table rooms 
add column if not exists prize_distribution jsonb default '{}',
add column if not exists stakes numeric default 0,
add column if not exists max_players integer default 4;

-- 3. Update room_players table
alter table room_players
add column if not exists rank integer;

-- 4. Reload schema cache (optional, strictly for Supabase internals)
notify pgrst, 'reload config';

-- 5. Update profiles table (Add new user fields)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table profiles
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists phone text,
add column if not exists location text,
add column if not exists full_name text; -- Ensure full_name exists if not already
