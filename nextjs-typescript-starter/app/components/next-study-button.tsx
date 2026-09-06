'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { advanceStudy } from 'app/actions/study';

export function NextStudyButton({ bookId, wordId, isLastWord }: { bookId: string; wordId: string; isLastWord: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function advance() {
    setMessage('');
    startTransition(async () => {
      const result = await advanceStudy({ bookId, wordId });
      if (result.ok) {
        router.refresh();
        return;
      }
      if (result.code === 'AUTH_REQUIRED') {
        router.push(`/me?auth=login&returnTo=${encodeURIComponent(`/study/${bookId}`)}`);
        return;
      }
      if (result.code === 'PROGRESS_CONFLICT') router.refresh();
      setMessage(result.message);
    });
  }

  return (
    <div className="mt-8">
      <button type="button" disabled={pending} onClick={advance} className="flex h-12 w-full items-center justify-center rounded-2xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300">
        {pending ? '保存中…' : isLastWord ? '完成本书' : '下一个'}
      </button>
      {message ? <p className="mt-3 text-center text-sm text-rose-600">{message}</p> : null}
    </div>
  );
}
