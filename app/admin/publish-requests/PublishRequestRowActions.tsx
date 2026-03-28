'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  approvePublishAccessRequestAction,
  declinePublishAccessRequestAction,
} from '@/app/actions/publishAccessRequest';

export default function PublishRequestRowActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onApprove() {
    setMessage(null);
    setBusy(true);
    const res = await approvePublishAccessRequestAction(requestId);
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setMessage(res.error);
    }
  }

  async function onDecline() {
    const note = window.prompt('Optional internal note (optional):') ?? '';
    setMessage(null);
    setBusy(true);
    const res = await declinePublishAccessRequestAction(requestId, note);
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setMessage(res.error);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onApprove()}
          className="rounded-lg bg-green-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDecline()}
          className="rounded-lg border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {message && <p className="text-xs text-red-600 max-w-[200px] text-right">{message}</p>}
    </div>
  );
}
