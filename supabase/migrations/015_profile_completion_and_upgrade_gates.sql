-- Step 7: profile completion fields + helper function for onboarding/upgrade gates

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_region TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT,
  ADD COLUMN IF NOT EXISTS call_name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS basic_profile_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upgrade_profile_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Backfill basic completion for users that already have all three first-time fields.
UPDATE public.profiles
SET basic_profile_completed_at = COALESCE(basic_profile_completed_at, NOW())
WHERE NULLIF(TRIM(COALESCE(country_region, '')), '') IS NOT NULL
  AND NULLIF(TRIM(COALESCE(preferred_language, '')), '') IS NOT NULL
  AND NULLIF(TRIM(COALESCE(call_name, '')), '') IS NOT NULL;

-- Keep email_verified_at in sync for existing auth users where email is already confirmed.
UPDATE public.profiles p
SET email_verified_at = COALESCE(p.email_verified_at, u.email_confirmed_at)
FROM auth.users u
WHERE u.id = p.id
  AND u.email_confirmed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_profile_completion_state(p_user_id UUID)
RETURNS TABLE (
  role TEXT,
  basic_complete BOOLEAN,
  upgrade_complete BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(p.role, 'T') AS role,
    (
      NULLIF(TRIM(COALESCE(p.country_region, '')), '') IS NOT NULL
      AND NULLIF(TRIM(COALESCE(p.preferred_language, '')), '') IS NOT NULL
      AND NULLIF(TRIM(COALESCE(p.call_name, '')), '') IS NOT NULL
    ) AS basic_complete,
    (
      p.upgrade_profile_completed_at IS NOT NULL
    ) AS upgrade_complete
  FROM public.profiles p
  WHERE p.id = p_user_id
$$;
