-- RLS: map posts.topic → role_permissions.resource using English slugs only
-- (same names as workers/lib/roleMatrix.js RESOURCE_MAP: news, announcement, activity, blog_full_1..3).
-- Replaces Chinese / long labels from 012 so matrix rows from Sheet sync / seed scripts match policies.

CREATE OR REPLACE FUNCTION public.topic_to_sheet_resource(topic_value TEXT)
RETURNS TEXT AS $$
  SELECT CASE COALESCE(topic_value, '')
    WHEN 'news' THEN 'news'
    WHEN 'announcement' THEN 'announcement'
    WHEN 'event' THEN 'activity'
    WHEN 'finance' THEN 'blog_full_1'
    WHEN 'real_estate' THEN 'blog_full_2'
    WHEN 'misc' THEN 'blog_full_3'
    ELSE 'blog_full_3'
  END;
$$ LANGUAGE sql IMMUTABLE;

COMMENT ON FUNCTION public.topic_to_sheet_resource(TEXT) IS
  'Maps public.posts.topic to role_permissions.resource slugs (English; aligned with workers/lib/roleMatrix.js).';
