-- Add password_hash to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS password_hash varchar(255);

