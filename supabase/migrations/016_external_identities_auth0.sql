-- Step 8: external identity mapping (Auth0 -> Supabase auth.users/profiles)

CREATE TABLE IF NOT EXISTS public.external_identities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT external_identities_provider_external_unique UNIQUE (provider, external_user_id),
  CONSTRAINT external_identities_provider_supabase_unique UNIQUE (provider, supabase_user_id)
);

ALTER TABLE public.external_identities ENABLE ROW LEVEL SECURITY;

-- No public policies by default. Table is intended for server/service-role access only.
