/**
 * Role Matrix - CSV parsing, getPermission helper
 * Synced from Google Sheet, stored in D1 role_permissions
 */

export const ROLE_LEVELS = [
  'A', 'B', 'CB', 'VB', 'T', 'S', 'W', 'WN', 'W1', 'W2', 'W3', 'S_writer',
];

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
  'admin_users': 'admin_users',
  'admin_content': 'admin_content',
  'admin_settings': 'admin_settings',
  'publish': 'publish',
};

function normalizeRoleLevel(val) {
  if (!val) return '';
  const normalized = String(val).trim().replace(/-/g, '_');
  return normalized;
}

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

function isLikelyRoleCode(value) {
  const role = normalizeRoleLevel(value);
  return ROLE_LEVELS.includes(role);
}

function isLikelyEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function getMappedResource(header) {
  const headerText = String(header || '').trim();
  if (!headerText) return null;
  for (const [key, resource] of Object.entries(RESOURCE_MAP)) {
    if (headerText.includes(key) || headerText === key) {
      return resource;
    }
  }
  return null;
}

function detectRoleColumn(allRows, maxProbeRows = 12) {
  if (!allRows?.length) return 0;
  let best = { col: 0, score: -1 };
  const maxCols = allRows.reduce((m, row) => Math.max(m, row.length), 0);
  const probeEnd = Math.min(allRows.length, maxProbeRows);
  for (let c = 0; c < maxCols; c++) {
    let score = 0;
    for (let r = 0; r < probeEnd; r++) {
      const cell = normalizeRoleLevel((allRows[r] || [])[c]);
      if (isLikelyRoleCode(cell)) score++;
    }
    if (score > best.score) best = { col: c, score };
  }
  return best.col;
}

function detectMatrixHeaderRow(allRows, roleColumn) {
  const scanEnd = Math.min(allRows.length, 12);
  for (let r = 0; r < scanEnd; r++) {
    let mapped = 0;
    const row = allRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (c === roleColumn) continue;
      if (getMappedResource(row[c])) mapped++;
    }
    if (mapped >= 2) return r;
  }
  return -1;
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

  const roleColumn = detectRoleColumn(allRows);
  const headerIndex = detectMatrixHeaderRow(allRows, roleColumn);
  const headerRow = headerIndex >= 0 ? allRows[headerIndex] : (allRows[1] || allRows[0]);
  const colToResource = {};
  for (let c = 0; c < headerRow.length; c++) {
    if (c === roleColumn) continue;
    const resource = getMappedResource(headerRow[c]);
    if (resource) colToResource[c] = resource;
  }
  if (Object.keys(colToResource).length === 0) {
    return {
      rows: [],
      parseReport: { total: 0, skipped: allRows.length, errors: ['Cannot locate resource header row'] },
    };
  }

  const dataStartIndex = Math.max(headerIndex + 1, 1);
  for (let r = dataStartIndex; r < allRows.length; r++) {
    const row = allRows[r];
    if (!row || row.length === 0) {
      skipped++;
      continue;
    }
    const roleLevel = normalizeRoleLevel(row[roleColumn]);
    if (!roleLevel || !ROLE_LEVELS.includes(roleLevel)) {
      skipped++;
      continue;
    }
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
 * Parse assignments CSV where role codes are in a header row
 * and emails are listed under each role column.
 * @param {string} csvText
 * @returns {{ rows: Array<{email:string, role_level:string}>, parseReport: { total: number, skipped: number, errors?: string[] } }}
 */
export function parseRoleAssignmentsCSV(csvText) {
  const allRows = parseCSV(csvText);
  if (allRows.length < 2) {
    return { rows: [], parseReport: { total: 0, skipped: 0, errors: ['CSV too short'] } };
  }

  let headerIdx = -1;
  let roleColumns = {};
  const errors = [];
  let skipped = 0;

  for (let r = 0; r < Math.min(allRows.length, 10); r++) {
    const row = allRows[r] || [];
    const cols = {};
    let hits = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = normalizeRoleLevel(row[c]);
      if (isLikelyRoleCode(cell)) {
        cols[c] = cell;
        hits++;
      }
    }
    // Usually row has A/B/CB/... across many columns
    if (hits >= 3) {
      headerIdx = r;
      roleColumns = cols;
      break;
    }
  }

  const dedup = new Set();
  const rows = [];
  if (headerIdx !== -1) {
    for (let r = headerIdx + 1; r < allRows.length; r++) {
      const row = allRows[r] || [];
      let hasAny = false;
      for (const [col, roleLevel] of Object.entries(roleColumns)) {
        const emailCell = String(row[parseInt(col, 10)] || '').trim();
        if (!emailCell) continue;
        hasAny = true;
        if (!isLikelyEmail(emailCell)) {
          skipped++;
          continue;
        }
        const key = `${emailCell.toLowerCase()}::${roleLevel}`;
        if (dedup.has(key)) continue;
        dedup.add(key);
        rows.push({ email: emailCell.toLowerCase(), role_level: roleLevel });
      }
      if (!hasAny) skipped++;
    }
  } else {
    // Fallback: "email, role" rows format.
    const header = (allRows[0] || []).map((x) => String(x || '').trim().toLowerCase());
    let emailCol = header.findIndex((x) => x === 'email' || x === 'mail' || x.includes('email'));
    let roleCol = header.findIndex((x) => x === 'role' || x === 'role_level' || x.includes('role'));
    let startAt = 1;
    if (emailCol === -1 || roleCol === -1) {
      emailCol = 0;
      roleCol = 1;
      startAt = 0;
    }
    for (let r = startAt; r < allRows.length; r++) {
      const row = allRows[r] || [];
      const email = String(row[emailCol] || '').trim().toLowerCase();
      const roleLevel = normalizeRoleLevel(row[roleCol]);
      if (!email && !roleLevel) {
        skipped++;
        continue;
      }
      if (!isLikelyEmail(email) || !isLikelyRoleCode(roleLevel)) {
        skipped++;
        continue;
      }
      const key = `${email}::${roleLevel}`;
      if (dedup.has(key)) continue;
      dedup.add(key);
      rows.push({ email, role_level: roleLevel });
    }
    if (rows.length === 0) errors.push('Cannot locate role header row and no valid email-role rows found');
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

/**
 * Get all permissions for a role_level from D1
 * @param {string} roleLevel
 * @param {object} env
 * @returns {Promise<Record<string, string>>} - { resource: permission }
 */
export async function getAllPermissionsForRole(roleLevel, env) {
  if (!roleLevel || !env.DB) return {};
  try {
    const { results } = await env.DB.prepare(
      'SELECT resource, permission FROM role_permissions WHERE role_level = ?'
    )
      .bind(roleLevel)
      .all();
    const map = {};
    for (const row of results || []) {
      map[row.resource] = row.permission;
    }
    return map;
  } catch (e) {
    console.error('getAllPermissionsForRole error:', e);
    return {};
  }
}
