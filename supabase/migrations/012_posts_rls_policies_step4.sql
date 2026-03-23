-- Step 4 (fixed): RLS policies on posts using role_permissions(role_level, resource, permission)

-- helper: current role (already part of Step 6, kept here for safety)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- helper: normalize role code for matrix lookup (S-writer -> S_writer)
CREATE OR REPLACE FUNCTION public.normalize_role_level(raw_role TEXT)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN raw_role = 'S-writer' THEN 'S_writer'
    ELSE COALESCE(raw_role, 'T')
  END;
$$ LANGUAGE sql IMMUTABLE;

-- helper: normalize resource names for robust matching (dash variants/spacing/case)
CREATE OR REPLACE FUNCTION public.normalize_resource_name(raw_resource TEXT)
RETURNS TEXT AS $$
  SELECT lower(
    regexp_replace(
      replace(replace(trim(COALESCE(raw_resource, '')), '—', '-'), '–', '-'),
      '\s+',
      ' ',
      'g'
    )
  );
$$ LANGUAGE sql IMMUTABLE;

-- helper: map posts.topic to sheet resource names (as used in matrix)
CREATE OR REPLACE FUNCTION public.topic_to_sheet_resource(topic_value TEXT)
RETURNS TEXT AS $$
  SELECT CASE topic_value
    WHEN 'news' THEN '新闻'
    WHEN 'announcement' THEN '公告'
    WHEN 'event' THEN '活动'
    WHEN 'finance' THEN 'Blog Full — Finance'
    WHEN 'real_estate' THEN 'Blog Full — Real Estate'
    WHEN 'misc' THEN 'Blog Full — Misc'
    ELSE 'Blog Full — Misc'
  END;
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- remove old/broad or incompatible policies
DROP POLICY IF EXISTS "Posts readable by all" ON public.posts;
DROP POLICY IF EXISTS "Authenticated can insert own post" ON public.posts;
DROP POLICY IF EXISTS "Authors can update own post" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete own post" ON public.posts;
DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;
DROP POLICY IF EXISTS "Role-based full post read" ON public.posts;
DROP POLICY IF EXISTS "Role-based post insert" ON public.posts;
DROP POLICY IF EXISTS "Role-based post update" ON public.posts;
DROP POLICY IF EXISTS "Role-based post delete" ON public.posts;

-- 1) Public preview access (published rows; app should expose brief as preview)
CREATE POLICY "Public can read published posts"
ON public.posts
FOR SELECT
USING (status = 'published');

-- 2) Authenticated full read: admin OR matrix permission in ('R', 'R/W')
CREATE POLICY "Role-based full post read"
ON public.posts
FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'A'
  OR EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_level = public.normalize_role_level(public.get_my_role())
      AND public.normalize_resource_name(rp.resource)
          = public.normalize_resource_name(public.topic_to_sheet_resource(posts.topic))
      AND rp.permission IN ('R', 'R/W')
  )
);

-- 3) Writes: admin OR matrix permission = 'R/W'
CREATE POLICY "Role-based post insert"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_role() = 'A'
  OR EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_level = public.normalize_role_level(public.get_my_role())
      AND public.normalize_resource_name(rp.resource)
          = public.normalize_resource_name(public.topic_to_sheet_resource(topic))
      AND rp.permission IN ('R/W')
  )
);

CREATE POLICY "Role-based post update"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = 'A'
  OR EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_level = public.normalize_role_level(public.get_my_role())
      AND public.normalize_resource_name(rp.resource)
          = public.normalize_resource_name(public.topic_to_sheet_resource(posts.topic))
      AND rp.permission IN ('R/W')
  )
)
WITH CHECK (
  public.get_my_role() = 'A'
  OR EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_level = public.normalize_role_level(public.get_my_role())
      AND public.normalize_resource_name(rp.resource)
          = public.normalize_resource_name(public.topic_to_sheet_resource(topic))
      AND rp.permission IN ('R/W')
  )
);

CREATE POLICY "Role-based post delete"
ON public.posts
FOR DELETE
TO authenticated
USING (
  public.get_my_role() = 'A'
  OR EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_level = public.normalize_role_level(public.get_my_role())
      AND public.normalize_resource_name(rp.resource)
          = public.normalize_resource_name(public.topic_to_sheet_resource(posts.topic))
      AND rp.permission IN ('R/W')
  )
);
