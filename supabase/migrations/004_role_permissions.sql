-- role_permissions: Role Matrix 权限表（与 D1 同步）
-- 供 Next.js 按 role_level 查询权限，与 Worker 同步时双写
-- 在 Supabase Dashboard → SQL Editor 中执行
-- https://supabase.com/dashboard/project/_/sql/new

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_level TEXT NOT NULL,
  resource TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_level, resource)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_level);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON public.role_permissions(resource);

COMMENT ON TABLE public.role_permissions IS 'Role Matrix 权限，由 admin 更新授权时从 Google Sheet 同步';

-- RLS: 公开可读（权限表为配置数据，所有人可读）
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'role_permissions' AND p.polname = 'role_permissions readable by all'
  ) THEN
    CREATE POLICY "role_permissions readable by all"
      ON public.role_permissions FOR SELECT
      USING (true);
  END IF;
END
$$;

-- 写入仅允许 service_role（Worker 同步时使用 service key）
-- 不创建 INSERT/UPDATE/DELETE 策略给 anon，由 service_role 绕过 RLS 执行
