-- comments: 文章评论表，支持多级嵌套（parent_id）
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- https://supabase.com/dashboard/project/_/sql/new
--
-- 设计说明：非破坏性、可重复执行（idempotent）。不包含 DROP TABLE / DROP POLICY / DROP TRIGGER，
-- 策略与触发器均采用「仅当不存在时创建」，多次执行不会报错也不会删数据。
--
-- 若未使用 Supabase Auth：将 user_id 改为
--   user_id UUID NOT NULL,
-- 并删除或调整下方依赖 auth.uid() 的 RLS 策略。

-- 建表（已存在则跳过）
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引（已存在则跳过）
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);

-- 函数：自动更新 updated_at（CREATE OR REPLACE 为幂等，不删数据）
CREATE OR REPLACE FUNCTION public.update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器：仅当不存在时创建（避免使用 DROP TRIGGER，非破坏性）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'comments' AND t.tgname = 'comments_updated_at'
  ) THEN
    CREATE TRIGGER comments_updated_at
      BEFORE UPDATE ON public.comments
      FOR EACH ROW
      EXECUTE PROCEDURE public.update_comments_updated_at();
  END IF;
END
$$;

-- 启用 RLS（重复执行无副作用）
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 策略：仅当不存在时创建（可重复执行，不 DROP 已有策略）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'comments' AND p.polname = 'Comments are readable by everyone'
  ) THEN
    CREATE POLICY "Comments are readable by everyone"
      ON public.comments FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'comments' AND p.polname = 'Authenticated users can insert own comment'
  ) THEN
    CREATE POLICY "Authenticated users can insert own comment"
      ON public.comments FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'comments' AND p.polname = 'Users can update own comment'
  ) THEN
    CREATE POLICY "Users can update own comment"
      ON public.comments FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'comments' AND p.polname = 'Users can delete own comment'
  ) THEN
    CREATE POLICY "Users can delete own comment"
      ON public.comments FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;
