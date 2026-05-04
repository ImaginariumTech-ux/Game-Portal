-- 1. Fix missing ON DELETE CASCADE for game_ratings.user_id
ALTER TABLE public.game_ratings
DROP CONSTRAINT IF EXISTS game_ratings_user_id_fkey,
ADD CONSTRAINT game_ratings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Fix missing ON DELETE CASCADE for game_ratings.game_id
ALTER TABLE public.game_ratings
DROP CONSTRAINT IF EXISTS game_ratings_game_id_fkey,
ADD CONSTRAINT game_ratings_game_id_fkey
FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

-- 3. Fix missing ON DELETE CASCADE for leaderboards.mode_id
ALTER TABLE public.leaderboards
DROP CONSTRAINT IF EXISTS leaderboards_mode_id_fkey,
ADD CONSTRAINT leaderboards_mode_id_fkey
FOREIGN KEY (mode_id) REFERENCES public.game_modes(id) ON DELETE CASCADE;

-- 4. Fix missing ON DELETE CASCADE for games.author_id
ALTER TABLE public.games
DROP CONSTRAINT IF EXISTS games_author_id_fkey,
ADD CONSTRAINT games_author_id_fkey
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
