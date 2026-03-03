-- Migration: Role Matrix (role_permissions table)
-- Run: cd workers && npx wrangler d1 execute jjconnect-db --local --file=migrations/001_role_matrix.sql
-- For users.role_level: run 002_users_role_level.sql after users table exists

CREATE TABLE IF NOT EXISTS role_permissions (
  role_level TEXT NOT NULL,
  resource TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_level, resource)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_level);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);
