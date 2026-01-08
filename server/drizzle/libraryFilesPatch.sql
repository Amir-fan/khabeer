-- Library files table for admin broadcasts and advisor→user delivery
CREATE TYPE IF NOT EXISTS library_creator_role AS ENUM('admin','advisor');

CREATE TABLE IF NOT EXISTS library_files (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size integer,
  mime_type varchar(150),
  created_at timestamp DEFAULT now() NOT NULL,
  created_by_role library_creator_role NOT NULL,
  created_by_id integer REFERENCES users(id) ON DELETE SET NULL,
  target_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  consultation_id integer REFERENCES consultation_requests(id) ON DELETE SET NULL,
  is_public boolean DEFAULT false NOT NULL
);


