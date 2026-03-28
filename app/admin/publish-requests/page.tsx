import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PublishAccessRequest } from '@/types/database';
import PublishRequestRowActions from './PublishRequestRowActions';

export const metadata = {
  title: 'Publish access requests | Admin',
};

function formatEnum(s: string): string {
  return s.replace(/_/g, ' ');
}

export default async function AdminPublishRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: highlightId } = await searchParams;
  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from('publish_access_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('publish_access_requests list', error);
  }

  const list = (rows as PublishAccessRequest[] | null) ?? [];

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Publish access requests</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">
        Review questionnaire submissions. Approve sets <code className="text-xs bg-[var(--hover)] px-1 rounded">profiles.is_authorized</code> to true.
        New requests notify <span className="font-medium">support@jjconnect.jp</span> by email when{' '}
        <code className="text-xs bg-[var(--hover)] px-1 rounded">RESEND_API_KEY</code> is configured.
      </p>

      {list.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No requests yet.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => {
            const isHi = highlightId && r.id === highlightId;
            return (
              <li
                key={r.id}
                id={r.id}
                className={`rounded-xl border p-4 sm:p-5 ${
                  isHi ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200' : 'border-[var(--border)] bg-[var(--bg-sidebar)]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0 space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                          r.status === 'pending'
                            ? 'bg-amber-100 text-amber-900'
                            : r.status === 'approved'
                              ? 'bg-green-100 text-green-900'
                              : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p>
                      <span className="font-medium text-[var(--text-primary)]">{r.full_name}</span>
                      <span className="text-[var(--text-secondary)]"> · </span>
                      <a className="text-blue-600 hover:underline" href={`mailto:${r.applicant_email}`}>
                        {r.applicant_email}
                      </a>
                    </p>
                    <p className="text-[var(--text-secondary)] text-xs break-all">User ID: {r.user_id}</p>
                    <p>
                      <span className="font-medium">{r.org_name}</span>
                      <span className="text-[var(--text-secondary)]"> ({formatEnum(r.org_type)})</span>
                    </p>
                    <p className="text-[var(--text-secondary)]">Role: {r.role_in_org}</p>
                    {r.org_url && (
                      <p>
                        <a href={r.org_url} className="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer">
                          {r.org_url}
                        </a>
                      </p>
                    )}
                    <p className="text-[var(--text-secondary)]">Experience: {formatEnum(r.publishing_experience)}</p>
                    {r.language_pref && <p className="text-[var(--text-secondary)]">Language: {r.language_pref}</p>}
                    <div className="pt-2 border-t border-[var(--border)]">
                      <p className="text-xs font-medium text-[var(--text-primary)] mb-1">Intent</p>
                      <p className="text-[var(--text-primary)] whitespace-pre-wrap">{r.intent_summary}</p>
                    </div>
                    {r.status !== 'pending' && (
                      <p className="text-xs text-[var(--text-secondary)] pt-2">
                        Reviewed {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : '—'}
                        {r.admin_note ? ` · Note: ${r.admin_note}` : ''}
                      </p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div className="shrink-0">
                      <PublishRequestRowActions requestId={r.id} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
