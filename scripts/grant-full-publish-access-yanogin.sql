-- One-off: grant full app access for yanogin@icloud.com
-- Run in Supabase Dashboard → SQL Editor (postgres).
--
-- Grants:
--   • auth.users.email_confirmed_at (email / upgrade gates)
--   • profiles.is_authorized = true (publish personal categories, legacy “authorized” flag)
--   • profiles.role = 'A' (Next.js /admin layout, RLS paths using get_my_role() = 'A', role_permissions via role_level)
--   • Onboarding / upgrade timestamps and required profile fields (middleware gates)
--
-- If this user has no profiles row yet, the INSERT below creates one.

UPDATE auth.users u
SET
  email_confirmed_at = COALESCE(u.email_confirmed_at, now()),
  updated_at = now()
WHERE lower(u.email) = lower('yanogin@icloud.com');

INSERT INTO public.profiles (
  id,
  role,
  is_authorized,
  country_region,
  preferred_language,
  call_name,
  basic_profile_completed_at,
  upgrade_profile_completed_at,
  updated_at
)
SELECT
  u.id,
  'A',
  true,
  'Japan',
  'English',
  'Yano',
  now(),
  now(),
  now()
FROM auth.users u
WHERE lower(u.email) = lower('yanogin@icloud.com')
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

UPDATE public.profiles p
SET
  is_authorized = true,
  role = 'A',
  country_region = COALESCE(NULLIF(trim(p.country_region), ''), 'Japan'),
  preferred_language = COALESCE(NULLIF(trim(p.preferred_language), ''), 'English'),
  call_name = COALESCE(NULLIF(trim(p.call_name), ''), 'Yano'),
  upgrade_profile_completed_at = COALESCE(p.upgrade_profile_completed_at, now()),
  basic_profile_completed_at = COALESCE(p.basic_profile_completed_at, now()),
  updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND lower(u.email) = lower('yanogin@icloud.com');
