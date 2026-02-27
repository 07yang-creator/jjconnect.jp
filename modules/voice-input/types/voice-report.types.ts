/**
 * Voice Report Type Definitions
 * Aligned with jjconnect.jp types/database.ts patterns
 *
 * Voice-to-Report data input: voice → transcript → AI extraction → structured report
 */

// ============================================================================
// ENUMS
// ============================================================================

export type VoiceReportStatus =
  | 'draft'
  | 'pending'
  | 'reviewed'
  | 'resolved'
  | 'archived';

export type ReportTemplateType = 'property' | 'mansion' | 'general';

// ============================================================================
// EXTRACTED DATA (AI-parsed from voice transcript)
// ============================================================================

export interface ExtractedData {
  /** Key-value pairs from AI extraction - extend per template needs */
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
  user_id: string | null; // NULL if anonymous (match submissions pattern)
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
  reviewed_by: string | null; // user_id of reviewer

  notes: string | null; // Admin notes (match submissions)
}

// ============================================================================
// INSERT / UPDATE HELPERS
// ============================================================================

export type VoiceReportInsert = Omit<
  VoiceReport,
  'id' | 'created_at' | 'updated_at'
> & {
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

export type VoiceReportUpdate = Partial<
  Omit<VoiceReport, 'id' | 'user_id' | 'created_at'>
> & {
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
    missing_fields?: string[]; // For Q&A prompts
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================================================
// QUERY FILTERS (optional, for listing)
// ============================================================================

export interface VoiceReportFilters {
  status?: VoiceReportStatus | VoiceReportStatus[];
  user_id?: string;
  template_type?: ReportTemplateType;
  created_after?: string;
  created_before?: string;
}
