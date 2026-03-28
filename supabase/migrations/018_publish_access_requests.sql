-- Publish access requests: questionnaire for writer authorization (admin review)

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

CREATE OR REPLACE FUNCTION public.publish_access_requests_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS publish_access_requests_updated_at ON public.publish_access_requests;
CREATE TRIGGER publish_access_requests_updated_at
  BEFORE UPDATE ON public.publish_access_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.publish_access_requests_set_updated_at();

ALTER TABLE public.publish_access_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own requests
DROP POLICY IF EXISTS "publish_access_requests_select_own" ON public.publish_access_requests;
CREATE POLICY "publish_access_requests_select_own"
  ON public.publish_access_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert a pending request for themselves
DROP POLICY IF EXISTS "publish_access_requests_insert_own" ON public.publish_access_requests;
CREATE POLICY "publish_access_requests_insert_own"
  ON public.publish_access_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND attestation_accepted IS TRUE
  );

COMMENT ON TABLE public.publish_access_requests IS 'User-submitted requests for publishing (writer) access; admins approve via service role / app.';
