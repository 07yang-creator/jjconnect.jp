-- One-off: grant full access to use /publish (article writing) for yanogin@icloud.com
-- Run in Supabase Dashboard → SQL Editor (postgres).
--
-- Ensures:
--   • is_authorized = true (passes Publish page gate)
--   • Basic onboarding fields filled if empty (passes /onboarding redirect)
--   • upgrade_profile_completed_at set if missing (passes upgrade gate when role ≠ 'T')
--   • email_confirmed_at on auth.users if missing (passes email gate for upgraded roles)

UPDATE auth.users u
SET
  email_confirmed_at = COALESCE(u.email_confirmed_at, now()),
  updated_at = now()
WHERE lower(u.email) = lower('yanogin@icloud.com');

UPDATE public.profiles p
SET
  is_authorized = true,
  country_region = COALESCE(NULLIF(trim(p.country_region), ''), 'Japan'),
  preferred_language = COALESCE(NULLIF(trim(p.preferred_language), ''), 'English'),
  call_name = COALESCE(NULLIF(trim(p.call_name), ''), 'Yano'),
  upgrade_profile_completed_at = COALESCE(p.upgrade_profile_completed_at, now()),
  basic_profile_completed_at = COALESCE(p.basic_profile_completed_at, now()),
  updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND lower(u.email) = lower('yanogin@icloud.com');
