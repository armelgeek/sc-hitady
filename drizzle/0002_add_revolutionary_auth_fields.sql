-- Migration: Add revolutionary authentication fields
-- Add username and revolutionary auth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_word TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connection_words TEXT;

-- Add identity verification fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS cin_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cin_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- Add location fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;

-- Add professional profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_category TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gps_coordinates TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_numbers JSONB;

-- Add portfolio fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_photos JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_videos JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS certificates JSONB;

-- Add real-time status fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_status BOOLEAN DEFAULT TRUE NOT NULL;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_professional ON users(is_professional);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
