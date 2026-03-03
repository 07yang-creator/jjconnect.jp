/**
 * Role Matrix - CSV parsing, getPermission helper
 * Synced from Google Sheet, stored in D1 role_permissions
 */

/** Column header (or partial match) -> resource ID mapping */
const RESOURCE_MAP = {
  '新闻': 'news',
  '公告': 'announcement',
  '活动': 'activity',
  '1 Finance': 'blog_brief_1',
  '2 Real Estate': 'blog_brief_2',
  '3 Misc': 'blog_brief_3',
  'Blog Brief 1': 'blog_brief_1',
  'Blog Brief 2': 'blog_brief_2',
  'Blog Brief 3': 'blog_brief_3',
  'Blog Full 1': 'blog_full_1',
  'Blog Full 2': 'blog_full_2',
  'Blog Full 3': 'blog_full_3',
  'Mono Page BB': 'mono_bb',
  'Mono Page CB': 'mono_cb',
  'Mono Page VB': 'mono_vb',
  'AI Tool': 'ai_tool',
  'ai_tool': 'ai_tool',
  'news': 'news',
  'announcement': 'announcement',
  'activity': 'activity',
  'blog_brief_1': 'blog_brief_1',
  'blog_brief_2': 'blog_brief_2',
  'blog_brief_3': 'blog_brief_3',
  'blog_full_1': 'blog_full_1',
  'blog_full_2': 'blog_full_2',
  'blog_full_3': 'blog_full_3',
  'mono_bb': 'mono_bb',
  'mono_cb': 'mono_cb',
  'mono_vb': 'mono_vb',
};

/** Normalize permission cell value to R, R/W, allow, deny */
function normalizePermission(val) {
  if (!val || typeof val !== 'string') return 'deny';
  const v = val.trim().toUpperCase();
  if (v === 'R/W') return 'R/W';
  if (v === 'R') return 'R';
  if (v === '✓' || v === '√' || v === '有' || v === 'ALLOW') return 'allow';
  if (v === '–' || v === '-' || v === 'DENY') return 'deny';
  return 'deny';
}

/** Parse CSV text into rows (handles quoted fields, UTF-8) */
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (current) lines.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  if (current) lines.push(current);
  return lines.map((line) => {
    const row = [];
    let cell = '';
    inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === '\t') && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell.trim());
    return row;
  });
}

/**
 * Parse Role Matrix CSV into { role_level, resource, permission }[]
 * @param {string} csvText - Raw CSV from Google Sheet
 * @returns {{ rows: Array<{role_level:string,resource:string,permission:string}>, parseReport: { total: number, skipped: number, errors: string[] } }}
 */
export function parseRoleMatrixCSV(csvText) {
  const rows = [];
  const errors = [];
  let skipped = 0;

  const allRows = parseCSV(csvText);
  if (allRows.length < 2) {
    return { rows: [], parseReport: { total: 0, skipped: 0, errors: ['CSV too short'] } };
  }

  // Row 0 or 1: headers. Row 2 (index 2) might be sub-headers. Data from row 3 (index 3).
  const headerRow = allRows[1] || allRows[0];
  const colToResource = {};
  for (let c = 2; c < headerRow.length; c++) {
    const header = String(headerRow[c] || '').trim();
    for (const [key, resource] of Object.entries(RESOURCE_MAP)) {
      if (header.includes(key) || header === key) {
        colToResource[c] = resource;
        break;
      }
    }
  }

  const dataStartIndex = 3;
  for (let r = dataStartIndex; r < allRows.length; r++) {
    const row = allRows[r];
    if (!row || row.length < 2) {
      skipped++;
      continue;
    }
    const roleLevelRaw = String(row[0] || '').trim();
    if (!roleLevelRaw) {
      skipped++;
      continue;
    }
    // Normalize S-writer -> S_writer
    const roleLevel = roleLevelRaw.replace(/-/g, '_');
    for (const [col, resource] of Object.entries(colToResource)) {
      const cellVal = row[parseInt(col, 10)];
      const permission = normalizePermission(cellVal);
      rows.push({ role_level: roleLevel, resource, permission });
    }
  }

  return {
    rows,
    parseReport: {
      total: rows.length,
      skipped,
      errors: errors.length ? errors : undefined,
    },
  };
}

/**
 * Get permission for role_level + resource from D1
 * @param {string} roleLevel - A, B, CB, VB, T, S, W, WN, W1, W2, W3, S_writer
 * @param {string} resource - news, announcement, blog_brief_1, etc.
 * @param {object} env - Worker env with DB binding
 * @returns {Promise<string|null>} - R, R/W, allow, deny, or null if not found
 */
export async function getPermission(roleLevel, resource, env) {
  if (!roleLevel || !resource || !env.DB) return null;
  try {
    const row = await env.DB.prepare(
      'SELECT permission FROM role_permissions WHERE role_level = ? AND resource = ?'
    )
      .bind(roleLevel, resource)
      .first();
    return row ? row.permission : null;
  } catch (e) {
    console.error('getPermission error:', e);
    return null;
  }
}

/** Check if permission allows write (R/W or allow) */
export function hasWritePermission(permission) {
  return permission === 'R/W' || permission === 'allow';
}
