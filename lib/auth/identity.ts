import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Auth0SessionUser } from '@/lib/auth0/server';

export interface AppUserIdentity {
  id: string;
  email?: string;
  email_confirmed_at: string | null;
}

function makeSyntheticPassword() {
  return `JJconnect-${crypto.randomUUID()}-${Date.now()}!`;
}

export async function resolveOrCreateSupabaseIdentityFromAuth0User(
  auth0User: Auth0SessionUser
): Promise<AppUserIdentity | null> {
  const admin = createSupabaseAdminClient();
  const provider = 'auth0';

  const { data: existingMap } = await admin
    .from('external_identities')
    .select('supabase_user_id')
    .eq('provider', provider)
    .eq('external_user_id', auth0User.sub)
    .maybeSingle();

  let supabaseUserId = existingMap?.supabase_user_id ?? null;

  if (!supabaseUserId) {
    // Always use a synthetic internal email for mapped Auth0 identities.
    // This prevents hard failures when a real email already exists in Supabase auth.
    const randomEmail = `auth0-${crypto.randomUUID()}@jjconnect.local`;
    const created = await admin.auth.admin.createUser({
      email: randomEmail,
      password: makeSyntheticPassword(),
      email_confirm: auth0User.email_verified,
      user_metadata: {
        auth0_sub: auth0User.sub,
        provider,
        email: auth0User.email,
        name: auth0User.name,
        picture: auth0User.picture,
      },
    });

    if (created.error || !created.data.user?.id) {
      throw new Error(created.error?.message || 'Failed to create mapped Supabase user for Auth0 user');
    }
    supabaseUserId = created.data.user.id;

    const insertMap = await admin.from('external_identities').insert({
      provider,
      external_user_id: auth0User.sub,
      supabase_user_id: supabaseUserId,
      email: auth0User.email,
    });
    if (insertMap.error) {
      throw new Error(insertMap.error.message);
    }
  } else {
    await admin
      .from('external_identities')
      .update({
        email: auth0User.email,
        updated_at: new Date().toISOString(),
      })
      .eq('provider', provider)
      .eq('external_user_id', auth0User.sub);
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', supabaseUserId)
    .maybeSingle();

  const profileUpdates: Record<string, string> = {};
  if (auth0User.name && !profile?.display_name) profileUpdates.display_name = auth0User.name;
  if (auth0User.picture && !profile?.avatar_url) profileUpdates.avatar_url = auth0User.picture;
  if (Object.keys(profileUpdates).length > 0) {
    await admin.from('profiles').update(profileUpdates).eq('id', supabaseUserId);
  }

  if (auth0User.email_verified) {
    await admin
      .from('profiles')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('id', supabaseUserId)
      .is('email_verified_at', null);
  }

  return {
    id: supabaseUserId,
    email: auth0User.email ?? undefined,
    email_confirmed_at: auth0User.email_verified ? new Date().toISOString() : null,
  };
}
