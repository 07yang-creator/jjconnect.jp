-- Initial schema for a fresh D1 database (dev / new deployments).
-- Run this FIRST on any new D1 database, then skip 002 and 003
-- (those are ALTER TABLE migrations for existing production DBs only).
--
-- Usage:
--   npx wrangler d1 execute jjconnect-db-dev --env development --remote --file ./migrations/000_init.sql

-- Users table (includes role_level, so 002/003 are not needed on fresh DBs)
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  username       TEXT     NOT NULL UNIQUE,
  email          TEXT     NOT NULL UNIQUE,
  password_hash  TEXT     NOT NULL,
  firstname      TEXT     NOT NULL DEFAULT '',
  lastname       TEXT     NOT NULL DEFAULT '',
  role           INTEGER  NOT NULL DEFAULT 0,
  role_level     TEXT     NOT NULL DEFAULT 'T',
  email_verified INTEGER  NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);

-- Role permissions table (same as 001_role_matrix.sql)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_level TEXT NOT NULL,
  resource   TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_level, resource)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role     ON role_permissions(role_level);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);
