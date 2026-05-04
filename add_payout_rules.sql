-- Add Payout Rules to Game Rooms
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'winner_takes_all',
ADD COLUMN IF NOT EXISTS payout_config JSONB DEFAULT '{"1": 100}';

-- Add a comment to describe the structure
COMMENT ON COLUMN public.game_rooms.payout_config IS 'JSON object mapping rank to percentage. E.g., {"1": 70, "2": 30}';

-- Update existing rooms to have the default config
UPDATE public.game_rooms SET payout_config = '{"1": 100}' WHERE payout_config IS NULL;
UPDATE public.game_rooms SET payout_type = 'winner_takes_all' WHERE payout_type IS NULL;
