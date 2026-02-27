-- user_profiles: Extended profile for JJConnect users
-- Links to auth-worker D1 users by user_id (string)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- IMPORTANT: When copying, select from the C in CREATE to avoid "REATE" syntax error

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar_url TEXT,
  registered_date TIMESTAMPTZ DEFAULT now(),
  self_description TEXT,
  email TEXT,
  telephone TEXT,
  company_name TEXT,
  address TEXT,
  mail_code TEXT,
  user_category INTEGER DEFAULT 1,
  contribution_value TEXT DEFAULT '0',
  personal_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Enable row-level security (idempotent)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: create only if missing (idempotent, no DROP = non-destructive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'user_profiles' AND p.polname = 'Public profiles readable'
  ) THEN
    CREATE POLICY "Public profiles readable"
      ON user_profiles FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'user_profiles' AND p.polname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON user_profiles FOR INSERT
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'user_profiles' AND p.polname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON user_profiles FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- Index for public profile lookups by username
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Trigger: Update updated_at on row change (non-destructive, idempotent)
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it does not exist (avoids DROP = no destructive operation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'user_profiles' AND t.tgname = 'user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE PROCEDURE update_user_profiles_updated_at();
  END IF;
END
$$;
