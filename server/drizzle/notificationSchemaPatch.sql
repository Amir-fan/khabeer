-- Add notifications table if missing
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  vendor_id integer REFERENCES vendors(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type varchar(50) DEFAULT 'general',
  status varchar(20) DEFAULT 'unread',
  created_at timestamp DEFAULT now() NOT NULL
);

