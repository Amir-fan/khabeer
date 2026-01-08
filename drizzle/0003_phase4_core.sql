-- Phase 4 core business logic schema

-- Enums
DO $$ BEGIN
  CREATE TYPE contract_access_level AS ENUM ('locked','partial','full');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('draft','submitted','pending_advisor','accepted','rejected','in_progress','awaiting_payment','paid','closed','rated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE request_assignment_status AS ENUM ('offered','accepted','declined','expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE consultation_message_role AS ENUM ('user','advisor','system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tier limits
CREATE TABLE IF NOT EXISTS tier_limits (
  id serial PRIMARY KEY,
  tier user_tier NOT NULL UNIQUE,
  ai_daily_limit integer,
  advisor_chat_daily_limit integer,
  contract_access_level contract_access_level NOT NULL DEFAULT 'locked',
  discount_rate_bps integer NOT NULL DEFAULT 0,
  priority_weight integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Usage counters
CREATE TABLE IF NOT EXISTS usage_counters (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  ai_used integer NOT NULL DEFAULT 0,
  advisor_chat_used integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Consultation requests
CREATE TABLE IF NOT EXISTS consultation_requests (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  advisor_id integer REFERENCES consultants(id) ON DELETE SET NULL,
  user_tier_snapshot user_tier NOT NULL DEFAULT 'free',
  status request_status NOT NULL DEFAULT 'submitted',
  priority_weight integer NOT NULL DEFAULT 0,
  discount_rate_bps integer NOT NULL DEFAULT 0,
  gross_amount_kwd integer,
  discount_amount_kwd integer,
  net_amount_kwd integer,
  currency varchar(10) NOT NULL DEFAULT 'KWD',
  summary text,
  files json,
  awaiting_payment_at timestamp,
  paid_at timestamp,
  closed_at timestamp,
  rated_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Request assignments
CREATE TABLE IF NOT EXISTS request_assignments (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES consultation_requests(id) ON DELETE CASCADE,
  advisor_id integer NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  status request_assignment_status NOT NULL DEFAULT 'offered',
  responded_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Request transitions (audit)
CREATE TABLE IF NOT EXISTS request_transitions (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES consultation_requests(id) ON DELETE CASCADE,
  from_status request_status,
  to_status request_status NOT NULL,
  actor_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Consultation messages (advisor/user)
CREATE TABLE IF NOT EXISTS consultation_messages (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES consultation_requests(id) ON DELETE CASCADE,
  sender_role consultation_message_role NOT NULL,
  sender_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  sender_advisor_id integer REFERENCES consultants(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Advisor ratings
CREATE TABLE IF NOT EXISTS advisor_ratings (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES consultation_requests(id) ON DELETE CASCADE,
  advisor_id integer NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score integer NOT NULL,
  comment text,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Extend consultants with filters/metrics
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS specialties json;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS languages json;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS geo json;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS availability json;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS skills json;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS experience_years integer;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS rating_avg integer DEFAULT 0;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0;

-- Extend orders for consultation commerce
ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_id integer REFERENCES consultation_requests(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gross_amount_kwd integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount_kwd integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS net_amount_kwd integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency varchar(10) NOT NULL DEFAULT 'KWD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tier_snapshot user_tier NOT NULL DEFAULT 'free';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON consultation_requests(status);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_priority ON consultation_requests(priority_weight);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
-- GIN index for specialties (if jsonb)
DO $$ BEGIN
  IF to_regtype('jsonb') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_consultants_specialties ON consultants USING GIN((specialties::jsonb));
  END IF;
END $$;

