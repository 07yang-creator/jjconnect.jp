/**
 * Role Matrix - Next.js 端按 role_level 查询 Supabase role_permissions
 */

import { createServerSupabaseClient } from './server';

/** 有写入权限：R/W 或 allow */
export function hasWritePermission(permission: string | null | undefined): boolean {
  return permission === 'R/W' || permission === 'allow';
}

/**
 * 获取某 role_level 的全部权限
 */
export async function getAllPermissionsForRole(
  roleLevel: string
): Promise<Record<string, string>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('role_permissions')
    .select('resource, permission')
    .eq('role_level', roleLevel);

  if (error) {
    console.error('getAllPermissionsForRole error:', error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.resource] = row.permission;
  }
  return map;
}

/**
 * 是否可访问 Admin（内容编辑/审核）
 * 有 admin_content 或任一 blog_full_* 的 R/W 即可
 */
export function canAccessAdmin(permissions: Record<string, string>): boolean {
  return (
    hasWritePermission(permissions.admin_content) ||
    hasWritePermission(permissions.blog_full_1) ||
    hasWritePermission(permissions.blog_full_2) ||
    hasWritePermission(permissions.blog_full_3) ||
    hasWritePermission(permissions.publish)
  );
}
