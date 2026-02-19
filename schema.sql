-- schema.sql
-- This file defines the database schema for the JJConnect authentication system.

-- Table: users
-- Stores user information, including authentication credentials and roles.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Stored as bcrypt hash in production
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  role INTEGER DEFAULT 0,     -- 0: Viewer, 1: Editor, 2: Admin
  email_verified BOOLEAN DEFAULT 0, -- 0: false, 1: true
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Table: sessions (Optional, for session-based authentication if not using JWT for sessions)
-- Stores active user sessions, useful for revoking sessions or tracking logins.
-- CREATE TABLE IF NOT EXISTS sessions (
--   session_id TEXT PRIMARY KEY NOT NULL,
--   user_id INTEGER NOT NULL,
--   expires_at TIMESTAMP NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Table: submissions
-- Stores joint-mamori submissions (文字内容 + 媒体文件)
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,          -- NULL if anonymous, user_id if logged in
  user_name TEXT,           -- Name from form
  user_email TEXT,          -- Email from form
  relation_type TEXT,       -- 关系类型 (環境問題、建物の状況等)
  content TEXT,             -- 文字内容 (comment field)
  media_key TEXT,           -- R2 存储的文件 Key (example: 2025/02/07/abc123.jpg)
  media_filename TEXT,      -- 原始文件名
  media_size INTEGER,       -- 文件大小 (bytes)
  media_type TEXT,          -- 文件 MIME 类型 (image/jpeg, video/mp4 等)
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'archived'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER,      -- user_id of reviewer
  notes TEXT,               -- Admin notes/comments
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

-- Example of initial data (for development/testing)
-- INSERT OR IGNORE INTO users (id, username, email, password_hash, firstname, lastname, role, email_verified)
-- VALUES 
-- (1, 'admin', 'admin@jjconnect.jp', 'CHANGE_THIS_TO_BCRYPT_HASH', 'Admin', 'User', 2, 1),
-- (2, 'editor', 'editor@jjconnect.jp', 'CHANGE_THIS_TO_BCRYPT_HASH', 'Editor', 'User', 1, 1),
-- (3, 'viewer', 'viewer@jjconnect.jp', 'CHANGE_THIS_TO_BCRYPT_HASH', 'Viewer', 'User', 0, 1);
