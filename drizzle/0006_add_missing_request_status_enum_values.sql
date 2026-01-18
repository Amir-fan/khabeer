-- Add missing request_status enum values
-- Safe migration: only adds new enum values, does not remove or rename existing ones
-- Does not touch data rows

DO $$ 
BEGIN
  -- Add 'payment_reserved' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'payment_reserved' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'payment_reserved';
  END IF;

  -- Add 'completed' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'completed' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'completed';
  END IF;

  -- Add 'released' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'released' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'released';
  END IF;

  -- Add 'cancelled' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'cancelled' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'cancelled';
  END IF;
END $$;
