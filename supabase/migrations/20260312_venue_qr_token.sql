-- Add fixed QR token to venues for printable check-in codes
ALTER TABLE venues ADD COLUMN IF NOT EXISTS qr_token text UNIQUE;

-- Generate initial tokens for existing venues
UPDATE venues SET qr_token = encode(gen_random_bytes(16), 'hex') WHERE qr_token IS NULL;

-- Make it NOT NULL going forward
ALTER TABLE venues ALTER COLUMN qr_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- Index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_qr_token ON venues(qr_token);
