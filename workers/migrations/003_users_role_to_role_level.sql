-- Migration: Map existing role to role_level
-- 2→A (Admin), 1→S (Seller/Editor), 0→T (Traveller/Viewer)
-- Run: cd workers && npx wrangler d1 execute jjconnect-db --local --file=migrations/003_users_role_to_role_level.sql

UPDATE users SET role_level = 'A' WHERE role = 2;
UPDATE users SET role_level = 'S' WHERE role = 1;
UPDATE users SET role_level = 'T' WHERE role = 0 OR role_level IS NULL OR role_level = '';
