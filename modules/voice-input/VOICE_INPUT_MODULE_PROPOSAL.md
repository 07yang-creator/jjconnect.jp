# Voice Input Module — Structure & Interface Proposal

> Aligned with jjconnect.jp data structures, naming conventions, and architecture.

---

## 1. Existing Data Structure Summary

### From `types/database.ts` (canonical types)
- **ID fields**: `string` (UUID) for Supabase entities
- **Timestamps**: `created_at`, `updated_at` (ISO string)
- **Insert/Update helpers**: `Omit<Entity, 'id' | 'created_at' | 'updated_at'>` pattern
- **API responses**: `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`

### From `schema.sql` (D1 / submissions)
- **ID**: `INTEGER PRIMARY KEY AUTOINCREMENT`
- **Columns**: `snake_case` (e.g. `user_id`, `relation_type`, `media_key`)
- **Status enum**: `'pending' | 'reviewed' | 'resolved' | 'archived'`
- **User linkage**: `user_id`, `user_name`, `user_email` (supports anonymous)
- **Media**: `media_key`, `media_filename`, `media_size`, `media_type`

### From `app/actions/posts.ts`
- **Input types**: `CreatePostInput`, `CreatePostResult` with `{ success, data?, error? }`
- **Validation**: explicit required fields, optional `details` for errors

---

## 2. Proposed Folder Structure

```
jjconnect.jp/
├── modules/
│   └── voice-input/
│       ├── README.md                    # Module overview & setup
│       │
│       ├── types/
│       │   ├── voice-report.types.ts     # VoiceReport interface & related types
│       │   └── index.ts                 # Re-exports
│       │
│       ├── lib/
│       │   ├── transcription.ts         # AI transcription API client
│       │   ├── extraction.ts            # AI extraction (structured data from transcript)
│       │   ├── report-generator.ts      # Template-based report generation
│       │   └── qa-prompt.ts             # Interactive Q&A prompt logic
│       │
│       ├── app/
│       │   ├── voice-input/
│       │   │   └── page.tsx             # Main voice input UI
│       │   └── actions/
│       │       └── voice-report.ts       # Server actions (create, update, submit)
│       │
│       ├── components/
│       │   ├── VoiceRecorder.tsx         # Record / stop / playback
│       │   ├── TranscriptDisplay.tsx    # Live / final transcript
│       │   ├── ExtractedDataForm.tsx    # Edit extracted fields
│       │   ├── QaPromptDialog.tsx       # Missing-data Q&A flow
│       │   └── ReportPreview.tsx        # Generated report preview
│       │
│       └── schema/
│           └── voice_reports.sql        # Supabase migration (or D1 schema)
│
├── types/
│   └── database.ts                      # Extend with VoiceReport tables
│
└── workers/
    └── auth-worker.js                   # Extend with /api/voice-reports if needed
```

---

## 3. VoiceReport Interface (draft)

### Base entity

```typescript
// modules/voice-input/types/voice-report.types.ts

// ============================================================================
// ENUMS
// ============================================================================

export type VoiceReportStatus = 'draft' | 'pending' | 'reviewed' | 'resolved' | 'archived';

export type ReportTemplateType = 'property' | 'mansion' | 'general'; // extend as needed

// ============================================================================
// EXTRACTED DATA (AI-parsed from voice)
// ============================================================================

export interface ExtractedData {
  /** Key-value pairs from AI extraction */
  [key: string]: string | number | boolean | string[] | null | undefined;
  // Examples: address, price, area_sqm, notes, category, etc.
}

// ============================================================================
// Q&A PROMPT FLOW (for missing required fields)
// ============================================================================

export interface QaPrompt {
  id: string;
  field_key: string;
  question: string;
  answer?: string | null;
  asked_at: string;
  answered_at?: string | null;
}

// ============================================================================
// BASE VOICE REPORT
// ============================================================================

export interface VoiceReport {
  id: string;
  user_id: string | null;           // NULL if anonymous (match submissions pattern)
  user_name: string | null;
  user_email: string | null;

  /** Raw transcript from AI transcription API */
  transcript: string | null;

  /** AI-extracted structured data (JSONB) */
  extracted_data: ExtractedData | null;

  /** Template used for report generation */
  template_type: ReportTemplateType;

  /** Generated report body (final consolidated output) */
  report_content: string | null;

  /** Q&A prompts for missing data */
  qa_prompts: QaPrompt[] | null;

  /** Audio file reference (R2 key, similar to submissions.media_key) */
  audio_key: string | null;
  audio_filename: string | null;
  audio_size: number | null;
  audio_type: string | null;

  status: VoiceReportStatus;

  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;       // user_id of reviewer

  notes: string | null;              // Admin notes (match submissions)
}

// ============================================================================
// INSERT / UPDATE HELPERS
// ============================================================================

export type VoiceReportInsert = Omit<VoiceReport, 'id' | 'created_at' | 'updated_at'> & {
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  transcript?: string | null;
  extracted_data?: ExtractedData | null;
  report_content?: string | null;
  qa_prompts?: QaPrompt[] | null;
  audio_key?: string | null;
  audio_filename?: string | null;
  audio_size?: number | null;
  audio_type?: string | null;
  status?: VoiceReportStatus;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  notes?: string | null;
};

export type VoiceReportUpdate = Partial<Omit<
  VoiceReport,
  'id' | 'user_id' | 'created_at'
>> & {
  updated_at?: string;
};

// ============================================================================
// EXTENDED / API TYPES
// ============================================================================

export interface VoiceReportWithUser extends VoiceReport {
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateVoiceReportInput {
  transcript?: string;
  audio_file?: File;
  template_type: ReportTemplateType;
  extracted_data?: ExtractedData;
}

export interface CreateVoiceReportResult {
  success: boolean;
  data?: {
    report_id: string;
    audio_url?: string;
    missing_fields?: string[];  // For Q&A prompts
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

---

## 4. Database Schema Options

### Option A: Supabase (PostgreSQL) — Recommended

- Fits JSONB for `extracted_data`, `qa_prompts`
- Integrates with `profiles` via `user_id`
- RLS support
- `types/database.ts` already defines Supabase patterns

```sql
-- schema/voice_reports.sql (Supabase migration)
CREATE TABLE voice_reports (
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

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'reviewed', 'resolved', 'archived')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

CREATE INDEX idx_voice_reports_user_id ON voice_reports(user_id);
CREATE INDEX idx_voice_reports_status ON voice_reports(status);
CREATE INDEX idx_voice_reports_created_at ON voice_reports(created_at);
```

### Option B: D1 (SQLite) — If aligned with submissions

- Same backend as `submissions`
- Simpler deployment (no extra Supabase tables)

```sql
-- schema.sql addition (D1)
CREATE TABLE IF NOT EXISTS voice_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  user_email TEXT,

  transcript TEXT,
  extracted_data TEXT,  -- JSON string
  template_type TEXT NOT NULL DEFAULT 'general',
  report_content TEXT,
  qa_prompts TEXT,      -- JSON string

  audio_key TEXT,
  audio_filename TEXT,
  audio_size INTEGER,
  audio_type TEXT,

  status TEXT DEFAULT 'draft',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER,
  notes TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
```

---

## 5. Integration with Core Types

Extend `types/database.ts`:

```typescript
// Add to types/database.ts
import type { VoiceReport, VoiceReportInsert, VoiceReportUpdate } from '@/modules/voice-input/types';

// Add to Database['public']['Tables']
voice_reports: {
  Row: VoiceReport;
  Insert: VoiceReportInsert;
  Update: VoiceReportUpdate;
};
```

---

## 6. Naming Conventions Checklist

| Area         | Convention     | Applied                            |
|--------------|----------------|------------------------------------|
| DB columns   | `snake_case`   | `user_id`, `extracted_data`, etc.  |
| Table names  | `snake_case`   | `voice_reports`                    |
| Type names   | `PascalCase`   | `VoiceReport`, `ExtractedData`     |
| Insert/Update| `*Insert`, `*Update` | `VoiceReportInsert`, `VoiceReportUpdate` |
| API result   | `{ success, data?, error? }` | `CreateVoiceReportResult` |
| Enums        | Union strings  | `VoiceReportStatus`, `ReportTemplateType` |

---

## 7. Next Steps

1. Add `voice_reports` to Supabase (or D1) and run migration.
2. Implement `modules/voice-input/types/voice-report.types.ts`.
3. Implement `lib/transcription.ts` and `lib/extraction.ts` (AI API clients).
4. Implement `app/actions/voice-report.ts` server actions.
5. Build UI components and `app/voice-input/page.tsx`.
6. Add API routes in `workers/auth-worker.js` if Worker-based access is needed.
7. Integrate report sending (email/PDF) and storage feedback per existing patterns (e.g. `sendSubmissionNotification`).
