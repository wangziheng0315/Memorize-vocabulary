import Link from 'next/link';
import type { BookSummary, ProgressSummary } from 'app/db';

function studiedAt(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function studyHref(bookId: string) {
  return `/study/${encodeURIComponent(bookId)}`;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      role="progressbar"
      aria-label={`学习进度 ${value}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-2 overflow-hidden rounded-full bg-indigo-100"
    >
      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export function RecentBookCard({ progress }: { progress: ProgressSummary }) {
  return (
    <Link
      href={studyHref(progress.bookId)}
      className="block rounded-2xl border border-indigo-100 bg-indigo-50 p-4 transition hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{progress.title}</p>
          <p className="mt-1 text-xs text-slate-500">最近学习：{studiedAt(progress.lastStudiedAt)}</p>
        </div>
        <span className="text-lg text-indigo-600" aria-hidden="true">›</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>{progress.learnedCount} / {progress.wordCount}</span>
        <span className="font-semibold text-indigo-700">{progress.isCompleted ? '已完成' : `${progress.percent}%`}</span>
      </div>
      <div className="mt-2"><ProgressBar value={progress.percent} /></div>
    </Link>
  );
}

export function BookCard({
  book,
  progress,
  signedIn,
}: {
  book: BookSummary;
  progress?: ProgressSummary;
  signedIn: boolean;
}) {
  const href = studyHref(book.bookId);
  const destination = signedIn ? href : `/me?auth=login&returnTo=${encodeURIComponent(href)}`;
  const value = progress?.percent ?? 0;
  const actionLabel = progress && !progress.isCompleted ? '继续学习' : '开始学习';

  return (
    <Link
      href={destination}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 text-lg font-bold text-white">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : book.title.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900">{book.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{book.tags || `${book.wordCount} 个单词`}</p>
        </div>
      </div>
      {progress ? (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs text-slate-500">
            <span>{progress.learnedCount} / {book.wordCount}</span>
            <span>{progress.isCompleted ? '已完成' : `${value}%`}</span>
          </div>
          <ProgressBar value={value} />
        </div>
      ) : null}
      <div className="mt-4 flex h-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white transition group-hover:bg-slate-700">
        {actionLabel}
      </div>
    </Link>
  );
}
