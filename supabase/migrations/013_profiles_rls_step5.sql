-- Step 5: RLS policies on profiles

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- non-destructive policy creation:
-- avoid dropping existing policies in this migration; only add if missing

-- Users can read only their own profile; admins can read all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles select self or admin'
  ) THEN
    CREATE POLICY "Profiles select self or admin"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = id
      OR public.get_my_role() = 'A'
    );
  END IF;
END
$$;

-- Users can insert only their own profile row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles insert self'
  ) THEN
    CREATE POLICY "Profiles insert self"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- Users can update own profile (non-role fields),
-- admins can update any profile including role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles update self or admin'
  ) THEN
    CREATE POLICY "Profiles update self or admin"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = id
      OR public.get_my_role() = 'A'
    )
    WITH CHECK (
      auth.uid() = id
      OR public.get_my_role() = 'A'
    );
  END IF;
END
$$;
