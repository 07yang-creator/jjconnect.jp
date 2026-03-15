-- posts: 文章表（含付费、分类、作者）
-- 被 comments 引用；API /api/posts 使用
-- 幂等、可重复执行

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB,
  summary TEXT,
  cover_image TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_paid BOOLEAN DEFAULT false,
  price NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 若表已存在但缺少列（旧表），则补列；已有行新列为默认值/NULL，需在 Dashboard 内按需补齐
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'author_id') THEN
    ALTER TABLE public.posts ADD COLUMN author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'status') THEN
    ALTER TABLE public.posts ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'is_paid') THEN
    ALTER TABLE public.posts ADD COLUMN is_paid BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'price') THEN
    ALTER TABLE public.posts ADD COLUMN price NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'content') THEN
    ALTER TABLE public.posts ADD COLUMN content JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'summary') THEN
    ALTER TABLE public.posts ADD COLUMN summary TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'cover_image') THEN
    ALTER TABLE public.posts ADD COLUMN cover_image TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'category_id') THEN
    ALTER TABLE public.posts ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'posts' AND p.polname = 'Posts readable by all'
  ) THEN
    CREATE POLICY "Posts readable by all"
      ON public.posts FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'posts' AND p.polname = 'Authenticated can insert own post'
  ) THEN
    CREATE POLICY "Authenticated can insert own post"
      ON public.posts FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'posts' AND p.polname = 'Authors can update own post'
  ) THEN
    CREATE POLICY "Authors can update own post"
      ON public.posts FOR UPDATE
      TO authenticated
      USING (auth.uid() = author_id)
      WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'posts' AND p.polname = 'Authors can delete own post'
  ) THEN
    CREATE POLICY "Authors can delete own post"
      ON public.posts FOR DELETE
      TO authenticated
      USING (auth.uid() = author_id);
  END IF;
END
$$;

COMMENT ON TABLE public.posts IS 'Articles with optional paid content; author_id links to auth.users';
