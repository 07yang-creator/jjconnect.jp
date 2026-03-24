'use client';

import { useEffect, useState } from 'react';

interface ArticleToastProps {
  postId: string;
  enabled: boolean;
}

export default function ArticleToast({ postId, enabled }: ArticleToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const storageKey = `toast_shown_${postId}`;
    if (sessionStorage.getItem(storageKey) === '1') return;

    let hideTimer: number | undefined;

    const showTimer = window.setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(storageKey, '1');

      hideTimer = window.setTimeout(() => {
        setVisible(false);
      }, 3000);
    }, 2000);

    return () => {
      window.clearTimeout(showTimer);
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
    };
  }, [enabled, postId]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
      Enjoying this? Subscribers get more.
    </div>
  );
}
