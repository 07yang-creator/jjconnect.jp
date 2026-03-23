-- Step 3 (fixed): role_permissions table with existing shape
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_level TEXT NOT NULL,
  resource TEXT NOT NULL,
  permission TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_level, resource)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_level
  ON public.role_permissions(role_level);

CREATE INDEX IF NOT EXISTS idx_role_permissions_resource
  ON public.role_permissions(resource);
