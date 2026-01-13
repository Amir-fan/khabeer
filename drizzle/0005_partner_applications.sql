-- Partner applications tables (missing in some DBs)
-- Safe migration: creates only missing enum/tables/indexes. Does not modify existing tables.

DO $$ BEGIN
  CREATE TYPE partner_application_status AS ENUM ('pending_review','approved','rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS partner_applications (
  id serial PRIMARY KEY,
  full_name text NOT NULL,
  email varchar(320) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  phone varchar(50),
  title text,
  specialization text,
  years_experience integer,
  bio text,
  status partner_application_status NOT NULL DEFAULT 'pending_review',
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  advisor_id integer REFERENCES consultants(id) ON DELETE SET NULL,
  approved_at timestamp,
  rejected_at timestamp,
  reviewer_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_application_files (
  id serial PRIMARY KEY,
  application_id integer NOT NULL REFERENCES partner_applications(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type varchar(150),
  size integer,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Notifications table is required for admin notification on partner signup.
-- Some DBs are missing it; create safely without altering existing tables.
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  vendor_id integer REFERENCES vendors(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type varchar(50) NOT NULL DEFAULT 'general',
  status varchar(20) NOT NULL DEFAULT 'unread',
  read_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at ON partner_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_application_files_application_id ON partner_application_files(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_vendor_id ON notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

