-- Migration: Add role_level to users table
-- Run only for existing DBs that have users table: cd workers && npx wrangler d1 execute jjconnect-db --local --file=migrations/002_users_role_level.sql
-- If role_level already exists, this will fail - that's ok.

ALTER TABLE users ADD COLUMN role_level TEXT DEFAULT 'T';
