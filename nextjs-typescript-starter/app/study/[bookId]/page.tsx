import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from 'app/auth';
import { getStudyContext, getUserId } from 'app/db';
import { StudySession } from 'app/components/study-session';

export default async function StudyPage({ params }: { params: { bookId: string } }) {
  const session = await auth();
  const email = session?.user?.email;
  const returnTo = `/study/${encodeURIComponent(params.bookId)}`;
  if (!email) redirect(`/me?auth=login&returnTo=${encodeURIComponent(returnTo)}`);

  const userId = await getUserId(email);
  if (!userId) redirect(`/me?auth=login&returnTo=${encodeURIComponent(returnTo)}`);

  const context = await getStudyContext(userId, params.bookId);
  if (!context) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-6">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="返回首页" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl text-slate-700 shadow-sm ring-1 ring-slate-200">‹</Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold text-slate-900">{context.book.title}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {context.total > 0 ? `第 ${context.position + 1} / ${context.total} 个` : '暂无单词'}
          </p>
        </div>
        {context.total > 0 ? (
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            {Math.round(((context.position + 1) / context.total) * 100)}%
          </span>
        ) : null}
      </header>

      <StudySession
        key={`${context.position}:${context.cards[0]?.id ?? 'empty'}`}
        bookId={params.bookId}
        cards={context.cards}
        initialPosition={context.position}
        total={context.total}
        wasCompleted={context.wasCompleted}
      />
    </main>
  );
}
