'use client';

import { useEffect, useState } from 'react';
import { RecentBookCard } from 'app/components/book-cards';
import type { ProgressSummary } from 'app/db';

export function RecentLearning() {
  const [progress, setProgress] = useState<ProgressSummary[] | null>(null);

  useEffect(() => {
    fetch('/api/progress/recent')
      .then((response) => (response.ok ? response.json() : []))
      .then((items: Array<Omit<ProgressSummary, 'lastStudiedAt'> & { lastStudiedAt: string }>) =>
        setProgress(items.map((item) => ({ ...item, lastStudiedAt: new Date(item.lastStudiedAt) }))),
      )
      .catch(() => setProgress([]));
  }, []);

  if (!progress?.length) return null;

  return (
    <section className="mt-10" aria-labelledby="recent-title">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Keep going</p>
          <h2 id="recent-title" className="mt-1 text-xl font-bold text-slate-900">最近学习</h2>
        </div>
        <span className="text-xs text-slate-400">继续上次进度</span>
      </div>
      <div className="space-y-3">
        {progress.map((item) => <RecentBookCard key={item.bookId} progress={item} />)}
      </div>
    </section>
  );
}
