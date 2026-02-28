/**
 * Validation middleware for Worker routes
 * Use: validate(Schema, source)(controller)
 * Mirrors Express-style: router.post('/register', validate(registerSchema, 'body'), registerController)
 */

import { parseSafe } from './schemas.js';
import { errorResponse } from './http.js';

/**
 * Extract input from request based on source
 * @param {Request} request
 * @param {'body'|'query'|'form'} source
 * @returns {Promise<unknown>}
 */
/**
 * Extract input from request based on source.
 * For 'query', builds object from searchParams (e.g. ?identifier=foo -> { identifier: 'foo' })
 */
async function extractInput(request, source) {
  if (source === 'body') {
    try {
      return await request.json();
    } catch (e) {
      throw new Error(`请求体解析失败: ${e.message}`);
    }
  }
  if (source === 'query') {
    const url = new URL(request.url);
    const obj = {};
    url.searchParams.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Build form object for schema validation (excludes File entries)
 * @param {FormData} formData
 * @param {string[]} fields
 */
function formToObject(formData, fields) {
  const obj = {};
  for (const k of fields) {
    const v = formData.get(k);
    obj[k] = v != null ? String(v).trim() : '';
  }
  return obj;
}

/**
 * Validation middleware factory
 * @param {import('zod').ZodSchema} schema - Zod schema mirroring DB/API requirements
 * @param {'body'|'query'|'form'} source - Where to read input from
 * @param {string[]} [formFields] - For source='form', which fields to validate (formData passed separately)
 * @returns {(controller: (req: Request, env: object, data: unknown, formData?: FormData) => Promise<Response>) => (req: Request, env: object) => Promise<Response>}
 */
export function validate(schema, source, formFields = []) {
  return (controller) => async (request, env) => {
    let raw;
    try {
      if (source === 'form' && formFields.length) {
        const formData = await request.formData();
        raw = formToObject(formData, formFields);
        const parsed = parseSafe(schema, raw);
        if (!parsed.success) {
          const msg = parsed.error?.issues?.[0]?.message || 'Invalid input';
          return errorResponse(msg, 400);
        }
        return controller(request, env, parsed.data, formData);
      }
      raw = await extractInput(request, source);
    } catch (e) {
      return errorResponse(e.message || 'Invalid request', 400);
    }

    const parsed = parseSafe(schema, raw);
    if (!parsed.success) {
      const msg = parsed.error?.issues?.[0]?.message || 'Invalid input';
      return errorResponse(msg, 400);
    }
    return controller(request, env, parsed.data);
  };
}
