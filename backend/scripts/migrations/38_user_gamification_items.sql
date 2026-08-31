-- Migration: Add User PrepCoins and Shop Inventory columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS prep_coins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_avatar_frame VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS owned_cosmetics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_xp_booster_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freezes_available INTEGER DEFAULT 0; -- Support for tests using streakFreezesAvailable property
