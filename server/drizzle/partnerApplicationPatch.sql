-- Partner applications (advisor signup) and documents
CREATE TYPE IF NOT EXISTS partner_application_status AS ENUM('pending_review','approved','rejected');

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

