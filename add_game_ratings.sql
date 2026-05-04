-- Create game_ratings table
create table if not exists public.game_ratings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  game_id uuid references public.games not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  unique(user_id, game_id)
);

-- Enable RLS
alter table public.game_ratings enable row level security;

-- Policies
create policy "Ratings are viewable by everyone"
  on public.game_ratings for select
  using ( true );

create policy "Users can insert their own ratings"
  on public.game_ratings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own ratings"
  on public.game_ratings for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Users can delete their own ratings"
  on public.game_ratings for delete
  using ( auth.uid() = user_id );
