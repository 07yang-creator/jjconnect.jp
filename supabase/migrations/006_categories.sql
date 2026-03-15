-- categories: 全局文章分类表
-- 供首页、发布页、API /api/categories 使用
-- 幂等、可重复执行

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'categories' AND p.polname = 'Categories readable by all'
  ) THEN
    CREATE POLICY "Categories readable by all"
      ON public.categories FOR SELECT
      USING (true);
  END IF;
END
$$;

COMMENT ON TABLE public.categories IS 'Global article categories for posts';
