-- Step 1: profiles.role + generated role_level + signup trigger
-- Idempotent and compatible with existing schema variants

-- 1) Ensure role column exists and is non-null with default 'T'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE public.profiles
SET role = 'T'
WHERE role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'T',
  ALTER COLUMN role SET NOT NULL;

-- 2) Ensure role_level is generated from role
DO $$
DECLARE
  role_level_exists boolean;
  role_level_generated text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role_level'
  ) INTO role_level_exists;

  IF role_level_exists THEN
    SELECT is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role_level'
    INTO role_level_generated;

    IF role_level_generated IS DISTINCT FROM 'ALWAYS' THEN
      ALTER TABLE public.profiles DROP COLUMN role_level;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role_level'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN role_level TEXT GENERATED ALWAYS AS (role) STORED;
  END IF;
END
$$;

-- 3) Create trigger function for new auth users
-- Supports profiles schemas both with and without email column.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'T')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'T')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Replace auth signup trigger with requested name
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
