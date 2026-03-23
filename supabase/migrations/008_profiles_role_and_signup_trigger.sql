-- profiles.role + signup trigger
-- Goal:
-- 1) Ensure public.profiles has role column with default 'T' (traveller)
-- 2) Auto-create profile row when new auth user is created
-- Idempotent migration (safe to run multiple times)

-- Ensure profiles table exists (minimal shape if absent)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_authorized BOOLEAN DEFAULT false,
  role_level TEXT DEFAULT 'T',
  role TEXT DEFAULT 'T',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure role column exists with default 'T'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'T';
  END IF;
END
$$;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'T';
UPDATE public.profiles SET role = 'T' WHERE role IS NULL;

COMMENT ON COLUMN public.profiles.role IS 'Default traveller role: T';

-- Create/replace trigger function that creates profile row on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_url,
    bio,
    is_authorized,
    role_level,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NULL,
    false,
    'T',
    'T'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger once
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created_create_profile'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created_create_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.handle_new_auth_user_profile();
  END IF;
END
$$;
