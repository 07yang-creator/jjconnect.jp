-- profiles 表创建 + role_level 列
-- 若 profiles 不存在则创建；若存在则仅添加 role_level 列
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- https://supabase.com/dashboard/project/_/sql/new
--
-- 幂等设计：可重复执行。

-- 1. 若 profiles 表不存在，则创建（含 role_level）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_authorized BOOLEAN DEFAULT false,
  role_level TEXT DEFAULT 'T',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 若表已存在但缺少 role_level 列，则添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role_level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role_level TEXT DEFAULT 'T';
  END IF;
END
$$;

COMMENT ON COLUMN public.profiles.role_level IS 'Role Matrix: A/B/CB/VB/T/S/W/WN/W1/W2/W3/S_writer';

-- 3. 启用 RLS（若未启用）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. 基础 RLS 策略：公开可读，用户可更新/插入自己的 profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'profiles' AND p.polname = 'Public profiles readable'
  ) THEN
    CREATE POLICY "Public profiles readable" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'profiles' AND p.polname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'profiles' AND p.polname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- 5. 数据迁移：is_authorized=true 的用户设为 role_level='A'
UPDATE public.profiles
SET role_level = 'A'
WHERE is_authorized = true AND (role_level IS NULL OR role_level = 'T');
