-- Create game_characters table
CREATE TABLE IF NOT EXISTS game_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add character_id to room_players
-- Note: room_players is often defined in the schema, we add this column to store the selection
ALTER TABLE room_players ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES game_characters(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE game_characters ENABLE ROW LEVEL SECURITY;

-- Policies for game_characters
DROP POLICY IF EXISTS "Allow public read for game_characters" ON game_characters;
CREATE POLICY "Allow public read for game_characters" ON game_characters
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin all for game_characters" ON game_characters;
CREATE POLICY "Allow admin all for game_characters" ON game_characters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
