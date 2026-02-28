/**
 * Zod schemas for worker API input validation
 * Prevents malicious code injection (XSS, script injection, path traversal, etc.)
 */

import { z } from 'zod';

// ============================================================================
// ANTI-INJECTION HELPERS
// ============================================================================

const NO_SCRIPT_PATTERN = /<(script|iframe|object|embed|form|meta|link)|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on\w+\s*=\s*["']?|expression\s*\(|eval\s*\(|<\?|<\/?style/i;
const NO_PATH_TRAVERSAL = /\.\.|%2e%2e|%252e%252e/i;
const NO_SQL_PATTERN = /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE)|--\s*$|UNION\s+SELECT/i;

function safeString(val, pattern) {
  return !pattern.test(val);
}

// ============================================================================
// SHARED PRIMITIVES
// ============================================================================

export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores')
  .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
  .refine((s) => safeString(s, NO_SQL_PATTERN), 'Invalid characters');

export const emailSchema = z
  .string()
  .min(1)
  .max(254)
  .email()
  .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters');

export const passwordSchema = z.string().min(8).max(256);

export const nameSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
  .refine((s) => safeString(s, NO_SQL_PATTERN), 'Invalid characters');

function safeText(maxLen) {
  return z
    .string()
    .max(maxLen)
    .refine((s) => safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
    .refine((s) => safeString(s, NO_SQL_PATTERN), 'Invalid characters');
}

function optionalSafeText(maxLen) {
  return z
    .string()
    .max(maxLen)
    .refine((s) => s === '' || safeString(s, NO_SCRIPT_PATTERN), 'Invalid characters')
    .refine((s) => s === '' || safeString(s, NO_SQL_PATTERN), 'Invalid characters')
    .optional()
    .transform((s) => (s === '' ? undefined : s));
}

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
    .min(1)
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
    username: optionalSafeText(50)
      .optional()
      .refine(
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
    self_description: optionalSafeText(5000),
    email: z.union([emailSchema, z.literal('')]).optional().transform((s) => (s === '' ? undefined : s)),
    telephone: optionalSafeText(30),
    company_name: optionalSafeText(200),
    address: optionalSafeText(500),
    mail_code: optionalSafeText(20),
    user_category: z.number().int().min(0).max(10).optional(),
    contribution_value: optionalSafeText(50),
    personal_remarks: optionalSafeText(5000),
  })
  .strip();

// ============================================================================
// SUBMISSIONS
// ============================================================================

export const submitFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  relation_type: optionalSafeText(100),
  content: optionalSafeText(10000),
});

export const updateSubmissionSchema = z
  .object({
    status: submissionStatusSchema.optional(),
    notes: optionalSafeText(5000),
  })
  .strip()
  .refine((o) => Object.keys(o).length > 0, 'At least one field required');

export const getSubmissionsQuerySchema = z.object({
  status: submissionStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Parse and return { success, data } or { success: false, error: ZodError }
 */
export function parseSafe(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
