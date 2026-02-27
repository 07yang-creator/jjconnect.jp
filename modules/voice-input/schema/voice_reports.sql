-- Voice Reports Schema
-- Option A: Supabase (PostgreSQL) - recommended for JSONB / RLS
-- Run via Supabase migrations or SQL editor

CREATE TABLE IF NOT EXISTS voice_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,

  transcript TEXT,
  extracted_data JSONB,
  template_type TEXT NOT NULL DEFAULT 'general',
  report_content TEXT,
  qa_prompts JSONB,

  audio_key TEXT,
  audio_filename TEXT,
  audio_size INTEGER,
  audio_type TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending', 'reviewed', 'resolved', 'archived')
  ),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_voice_reports_user_id ON voice_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_reports_status ON voice_reports(status);
CREATE INDEX IF NOT EXISTS idx_voice_reports_created_at ON voice_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_reports_template_type ON voice_reports(template_type);

-- Optional: RLS policies (customize per auth model)
-- ALTER TABLE voice_reports ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own reports" ON voice_reports FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own reports" ON voice_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
