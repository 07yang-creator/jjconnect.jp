/**
 * Zod schemas for all API input data
 * Prevents malicious code injection (XSS, script injection, path traversal, etc.)
 */

import { z } from 'zod';

// ============================================================================
// ANTI-INJECTION HELPERS
// ============================================================================

/** Rejects strings that could contain script/HTML injection */
const NO_SCRIPT_PATTERN = /<(script|iframe|object|embed|form|meta|link)|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on\w+\s*=\s*["']?|expression\s*\(|eval\s*\(|<\?|<\/?style/i;

/** Rejects path traversal attempts */
const NO_PATH_TRAVERSAL = /\.\.|%2e%2e|%252e%252e/i;

/** Rejects SQL-like injection patterns (belt-and-suspenders; app uses parameterized queries) */
const NO_SQL_PATTERN = /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE)|--\s*$|UNION\s+SELECT/i;

/** Combined safety check: rejects dangerous strings */
function safeString(val: string, pattern: RegExp): boolean {
  return !pattern.test(val);
}

// ============================================================================
// SHARED PRIMITIVES
// ============================================================================

/** Username: alphanumeric + underscore, 3–20 chars */
export const usernameSchema = z
  .string()
  .min(3, '3–20 characters')
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores')
  .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
  .refine((s) => safeString(s, NO_SQL_PATTERN), 'Invalid characters');

/** Email: valid format, max length */
export const emailSchema = z
  .string()
  .min(1)
  .max(254)
  .email('Invalid email format')
  .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters');

/** Password: min length, max to prevent DoS */
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(256);

/** Display name: letters, spaces, hyphens, common punctuation */
export const nameSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
  .refine((s) => safeString(s, NO_SQL_PATTERN), 'Invalid characters');

/** Plain text with length limit, no script patterns */
export const safeTextSchema = (maxLen: number) =>
  z
    .string()
    .max(maxLen)
    .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
    .refine((s) => safeString(s, NO_SQL_PATTERN), 'Invalid characters');

/** Optional safe text */
export const optionalSafeTextSchema = (maxLen: number) =>
  z
    .string()
    .max(maxLen)
    .refine((s) => s === '' || safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
    .refine((s) => s === '' || safeString(s, NO_SQL_PATTERN), 'Invalid characters')
    .optional()
    .transform((s) => (s === '' ? undefined : s));

/** User ID (integer string for D1) */
export const userIdSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().positive()])
  .transform((v) => (typeof v === 'number' ? String(v) : v));

/** UUID for Supabase */
export const uuidSchema = z
  .string()
  .uuid()
  .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters');

/** Status enum for submissions */
export const submissionStatusSchema = z.enum([
  'pending',
  'reviewed',
  'resolved',
  'archived',
]);

// ============================================================================
// AUTH
// ============================================================================

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username required')
    .max(255)
    .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters'),
  password: passwordSchema,
});

export const registerSchema = z.object({
  firstname: nameSchema,
  lastname: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.number().int().min(0).max(1).default(0),
});

export const accountCheckSchema = z.object({
  identifier: z
    .string()
    .min(1)
    .max(255)
    .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters'),
});

// ============================================================================
// PROFILE
// ============================================================================

export const profilePatchSchema = z
  .object({
    username: optionalSafeTextSchema(50).refine(
      (s) => !s || /^[a-zA-Z0-9_\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+$/.test(s),
      'Username: letters, numbers, underscores, Japanese only'
    ),
    avatar_url: z
      .string()
      .url()
      .max(2048)
      .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid URL')
      .refine((s) => safeString(s, NO_PATH_TRAVERSAL), 'Invalid path')
      .optional(),
    self_description: optionalSafeTextSchema(5000),
    email: z.union([emailSchema, z.literal('')]).optional().transform((s) => (s === '' ? undefined : s)),
    telephone: optionalSafeTextSchema(30),
    company_name: optionalSafeTextSchema(200),
    address: optionalSafeTextSchema(500),
    mail_code: optionalSafeTextSchema(20),
    user_category: z.number().int().min(0).max(10).optional(),
    contribution_value: optionalSafeTextSchema(50),
    personal_remarks: optionalSafeTextSchema(5000),
  })
  .strip();

// ============================================================================
// SUBMISSIONS
// ============================================================================

export const submitFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  relation_type: optionalSafeTextSchema(100),
  content: optionalSafeTextSchema(10000),
});

export const updateSubmissionSchema = z
  .object({
    status: submissionStatusSchema.optional(),
    notes: optionalSafeTextSchema(5000),
  })
  .strip()
  .refine((o) => Object.keys(o).length > 0, 'At least one field required');

export const getSubmissionsQuerySchema = z.object({
  status: submissionStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// (POSTS schemas removed in Movement A — article publishing dropped. The new
// content system's schema is defined fresh in Movement C.)

// ============================================================================
// QUERY / PATH PARAMS
// ============================================================================

export const identifierQuerySchema = z.object({
  identifier: z.string().min(1).max(255).refine((s) => safeString(s, NO_SCRIPT_PATTERN)),
});

export const submissionIdPathSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

// Type safety: use z.infer<typeof Schema> so business logic is type-aware
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AccountCheckInput = z.infer<typeof accountCheckSchema>;
export type ProfilePatchInput = z.infer<typeof profilePatchSchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type GetSubmissionsQueryInput = z.infer<typeof getSubmissionsQuerySchema>;

/** Parse and return { success, data, error } */
export function parseSafe<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
