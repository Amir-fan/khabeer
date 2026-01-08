-- System Hardening Patch: Withdrawals, Password Reset, Payment Gateway Fields
-- Run this after existing migrations

-- Add payment gateway fields to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS gateway varchar(50),
  ADD COLUMN IF NOT EXISTS gateway_reference varchar(255),
  ADD COLUMN IF NOT EXISTS gateway_payment_id varchar(255);

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id serial PRIMARY KEY,
  advisor_id integer NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  amount_kwd integer NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  bank_details json,
  notes text,
  approved_by integer REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamp,
  rejected_at timestamp,
  rejection_reason text,
  completed_at timestamp,
  gateway_reference varchar(255),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Create withdrawal_status enum
DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Create index on token_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_advisor_id ON withdrawal_requests(advisor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

