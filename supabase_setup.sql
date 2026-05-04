
-- 1. Create Profiles Table (extends auth.users)
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  username text,
  full_name text,
  avatar_url text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- 2. Create Games Table
create table public.games (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text,
  version text,
  status text default 'draft', -- draft, published, archived
  thumbnail_url text,
  cover_url text,
  author_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Storage Bucket for Games
insert into storage.buckets (id, name, public)
values ('web-games', 'web-games', true);

-- 4. Storage Policies (Allow public read, authenticated upload)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'web-games' );

create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'web-games' and auth.role() = 'authenticated' );

-- 5. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.games enable row level security;

-- 6. RLS Policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Public games are viewable by everyone"
  on public.games for select
  using ( true );

create policy "Admins can insert games"
  on public.games for insert
  with check ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );
