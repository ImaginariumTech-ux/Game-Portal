-- Add missing timing columns to game_rooms
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Also ensure dissolved_at exists (it should, but just in case)
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS dissolved_at TIMESTAMP WITH TIME ZONE;
