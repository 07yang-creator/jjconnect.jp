-- Step 5: RLS policies on profiles

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Keep policies explicit and idempotent
DROP POLICY IF EXISTS "Public profiles readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Users can read only their own profile; admins can read all
CREATE POLICY "Profiles select self or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.get_my_role() = 'A'
);

-- Users can insert only their own profile row
CREATE POLICY "Profiles insert self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update own profile (non-role fields),
-- admins can update any profile including role
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
