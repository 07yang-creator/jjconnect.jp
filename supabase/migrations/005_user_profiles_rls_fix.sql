-- user_profiles RLS 修复：移除不安全的 INSERT/UPDATE 策略
-- 修复后：仅 service_role 可写入，anon 仅可 SELECT（公开可读）
-- Worker 使用 getSupabaseServiceConfig 执行 user_profiles 写入
--
-- 注意：本迁移使用 DROP POLICY（与 001-004 的「仅创建不删除」约定不同）
-- 原因：001 中创建的 INSERT/UPDATE 策略使用 WITH CHECK (true)，存在安全漏洞，
--       PostgreSQL 无法 ALTER 策略定义，必须 DROP 后由 service_role 接管写入。
-- 部署顺序：先部署 Worker（含 getSupabaseServiceConfig），再执行本迁移。
--
-- 回滚（如需恢复旧策略，仅用于紧急恢复）：
--   CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (true);
--   CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'user_profiles' AND p.polname = 'Users can insert own profile'
  ) THEN
    DROP POLICY "Users can insert own profile" ON public.user_profiles;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'user_profiles' AND p.polname = 'Users can update own profile'
  ) THEN
    DROP POLICY "Users can update own profile" ON public.user_profiles;
  END IF;
END
$$;
