-- Publish access requests: questionnaire for writer authorization (admin review)
--
-- Non-destructive / additive: no DROP POLICY, no DROP TRIGGER, no table drops.
-- Safe to run on production with existing data. Re-runnable.
-- If policies already exist but with wrong rules, fix in a new migration (do not
-- rely on DROP here).
--
-- If CREATE UNIQUE INDEX fails: you have two+ pending rows for the same user_id;
-- resolve duplicates first, then re-run only the index block (or fix data in SQL).

-- 1) Table (create only if missing — never drops or truncates)
CREATE TABLE IF NOT EXISTS public.publish_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  applicant_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  full_name text NOT NULL,
  org_name text NOT NULL,
  org_type text NOT NULL,
  role_in_org text NOT NULL,
  org_url text,
  intent_summary text NOT NULL,
  publishing_experience text NOT NULL,
  language_pref text,
  attestation_accepted boolean NOT NULL DEFAULT false,
  admin_note text,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publish_access_requests_status_created_idx
  ON public.publish_access_requests (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS publish_access_requests_one_pending_per_user
  ON public.publish_access_requests (user_id)
  WHERE status = 'pending';

-- 2) updated_at trigger function (replace body only — no table data touched)
CREATE OR REPLACE FUNCTION public.publish_access_requests_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Trigger: create only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'publish_access_requests'
      AND t.tgname = 'publish_access_requests_updated_at'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER publish_access_requests_updated_at
      BEFORE UPDATE ON public.publish_access_requests
      FOR EACH ROW
      EXECUTE PROCEDURE public.publish_access_requests_set_updated_at();
  END IF;
END
$$;

ALTER TABLE public.publish_access_requests ENABLE ROW LEVEL SECURITY;

-- 4) Policies: create only if missing (no DROP — avoids RLS gaps)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'publish_access_requests'
      AND policyname = 'publish_access_requests_select_own'
  ) THEN
    CREATE POLICY "publish_access_requests_select_own"
      ON public.publish_access_requests
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'publish_access_requests'
      AND policyname = 'publish_access_requests_insert_own'
  ) THEN
    CREATE POLICY "publish_access_requests_insert_own"
      ON public.publish_access_requests
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
        AND attestation_accepted IS TRUE
      );
  END IF;
END
$$;

COMMENT ON TABLE public.publish_access_requests IS 'User-submitted requests for publishing (writer) access; admins approve via service role / app.';
