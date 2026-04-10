import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type LegacyProfileRow = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  registered_date: string | null;
  self_description: string | null;
  email: string | null;
  telephone: string | null;
  company_name: string | null;
  address: string | null;
  mail_code: string | null;
  user_category: number | null;
  contribution_value: string | null;
  personal_remarks: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type QueryResult = { data: unknown; error: { message?: string } | null };
type RowQuery = {
  select(columns: string): RowQuery;
  eq(column: string, value: string): RowQuery;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
  update(values: Record<string, unknown>): RowQuery;
  upsert(values: Record<string, unknown>, options: { onConflict: string }): RowQuery;
};
type UntypedSupabase = { from(table: string): RowQuery };

function adminClient(): UntypedSupabase {
  return createSupabaseAdminClient() as unknown as UntypedSupabase;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultUsername(user: UserLike): string {
  const meta = user.user_metadata || {};
  const fromMeta =
    (typeof meta.username === 'string' && meta.username.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    '';
  if (fromMeta) return fromMeta;
  const email = user.email || '';
  if (email.includes('@')) return email.split('@')[0] || 'User';
  return email || 'User';
}

export function toLegacyProfile(row: LegacyProfileRow) {
  return {
    user_id: row.user_id,
    username: row.username || '',
    avatar_url: row.avatar_url || null,
    registered_date: row.registered_date,
    self_description: row.self_description || '',
    email: row.email || '',
    telephone: row.telephone || '',
    company_name: row.company_name || '',
    address: row.address || '',
    mail_code: row.mail_code || '',
    user_category: row.user_category ?? 1,
    contribution_value: row.contribution_value || '0',
    personal_remarks: row.personal_remarks || '',
  };
}

export async function getPublicLegacyProfile(userId: string) {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('username,avatar_url,contribution_value,registered_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to load profile');
  if (!data) return null;

  const row = data as LegacyProfileRow;
  return {
    username: row.username || '',
    avatar_url: row.avatar_url || null,
    contribution_value: row.contribution_value || '0',
    registered_date: row.registered_date || null,
  };
}

async function getProfileRow(userId: string): Promise<LegacyProfileRow | null> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to load profile');
  return (data as LegacyProfileRow | null) || null;
}

async function createDefaultProfileRow(user: UserLike): Promise<LegacyProfileRow> {
  const supabase = adminClient();
  const now = nowIso();
  const payload: LegacyProfileRow = {
    user_id: user.id,
    username: defaultUsername(user),
    avatar_url: null,
    registered_date: now,
    self_description: null,
    email: user.email || '',
    telephone: null,
    company_name: null,
    address: null,
    mail_code: null,
    user_category: 1,
    contribution_value: '0',
    personal_remarks: null,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to initialize profile');
  return data as LegacyProfileRow;
}

export async function getOrCreateOwnLegacyProfile(user: UserLike): Promise<LegacyProfileRow> {
  const existing = await getProfileRow(user.id);
  if (existing) return existing;
  return createDefaultProfileRow(user);
}

export function normalizeProfilePatch(input: unknown): Partial<LegacyProfileRow> {
  if (!input || typeof input !== 'object') return {};
  const src = input as Record<string, unknown>;
  const patch: Partial<LegacyProfileRow> = {};

  const username = src.username;
  if (typeof username === 'string' || username === null) patch.username = username;

  const avatarUrl = src.avatar_url;
  if (typeof avatarUrl === 'string' || avatarUrl === null) patch.avatar_url = avatarUrl;

  const selfDescription = src.self_description;
  if (typeof selfDescription === 'string' || selfDescription === null) {
    patch.self_description = selfDescription;
  }

  const email = src.email;
  if (typeof email === 'string' || email === null) patch.email = email;

  const telephone = src.telephone;
  if (typeof telephone === 'string' || telephone === null) patch.telephone = telephone;

  const companyName = src.company_name;
  if (typeof companyName === 'string' || companyName === null) patch.company_name = companyName;

  const address = src.address;
  if (typeof address === 'string' || address === null) patch.address = address;

  const mailCode = src.mail_code;
  if (typeof mailCode === 'string' || mailCode === null) patch.mail_code = mailCode;

  const contributionValue = src.contribution_value;
  if (typeof contributionValue === 'string' || contributionValue === null) {
    patch.contribution_value = contributionValue;
  }

  const personalRemarks = src.personal_remarks;
  if (typeof personalRemarks === 'string' || personalRemarks === null) {
    patch.personal_remarks = personalRemarks;
  }

  if (Object.prototype.hasOwnProperty.call(src, 'user_category')) {
    const n = Number.parseInt(String(src.user_category), 10);
    if (!Number.isNaN(n)) patch.user_category = n;
  }

  return patch;
}

export async function updateOwnLegacyProfile(
  user: UserLike,
  patch: Partial<LegacyProfileRow>
): Promise<LegacyProfileRow> {
  const hasPatch = Object.keys(patch).length > 0;
  if (!hasPatch) throw new Error('No fields to update');

  const supabase = adminClient();
  const current = await getProfileRow(user.id);
  const now = nowIso();

  if (!current) {
    const payload: LegacyProfileRow = {
      user_id: user.id,
      username: (patch.username as string | null | undefined) ?? defaultUsername(user),
      avatar_url: (patch.avatar_url as string | null | undefined) ?? null,
      registered_date: now,
      self_description: (patch.self_description as string | null | undefined) ?? null,
      email: (patch.email as string | null | undefined) ?? user.email ?? '',
      telephone: (patch.telephone as string | null | undefined) ?? null,
      company_name: (patch.company_name as string | null | undefined) ?? null,
      address: (patch.address as string | null | undefined) ?? null,
      mail_code: (patch.mail_code as string | null | undefined) ?? null,
      user_category: (patch.user_category as number | null | undefined) ?? 1,
      contribution_value: (patch.contribution_value as string | null | undefined) ?? '0',
      personal_remarks: (patch.personal_remarks as string | null | undefined) ?? null,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw new Error(error.message || 'Failed to update profile');
    return data as LegacyProfileRow;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...patch,
      updated_at: now,
    })
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Failed to update profile');
  return data as LegacyProfileRow;
}
