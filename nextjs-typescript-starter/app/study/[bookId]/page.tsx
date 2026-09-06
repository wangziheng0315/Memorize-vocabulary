import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from 'app/auth';
import { getStudyContext, getUserId } from 'app/db';
import { NextStudyButton } from 'app/components/next-study-button';

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

      {context.wasCompleted ? (
        <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 这本书已经学完，现在可以从头复习。
        </div>
      ) : null}

      {context.card ? (
        <div className="flex flex-1 flex-col justify-center py-8">
          <Link
            href={`/study/${encodeURIComponent(params.bookId)}/word/${context.card.id}`}
            aria-label={`查看 ${context.card.headWord} 的详细释义`}
            className="group block min-h-[390px] rounded-[2rem] border border-white bg-white p-7 shadow-2xl shadow-indigo-100 ring-1 ring-slate-100 transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="mt-14 text-center">
              <h2 className="break-words text-5xl font-bold tracking-tight text-slate-950">{context.card.headWord}</h2>
              {context.card.usPhone || context.card.ukPhone ? (
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  {context.card.usPhone ? <span>美 /{context.card.usPhone}/</span> : null}
                  {context.card.ukPhone ? <span>英 /{context.card.ukPhone}/</span> : null}
                </div>
              ) : null}
              <p className="mt-8 text-2xl font-semibold text-indigo-700">{context.card.meaning || '暂无释义'}</p>
            </div>

            {context.card.example ? (
              <div className="mt-12 rounded-2xl bg-slate-50 p-4 text-left">
                <p className="font-medium leading-6 text-slate-800">{context.card.example.en}</p>
                {context.card.example.zh ? <p className="mt-2 text-sm leading-6 text-slate-500">{context.card.example.zh}</p> : null}
              </div>
            ) : null}
          </Link>

          <NextStudyButton
            bookId={params.bookId}
            wordId={context.card.id}
            isLastWord={context.position + 1 === context.total}
          />
        </div>
      ) : (
        <div className="my-auto rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
          <p className="text-3xl" aria-hidden="true">📖</p>
          <h2 className="mt-4 font-bold text-slate-800">该单词书暂无单词</h2>
          <p className="mt-2 text-sm text-slate-500">换一本单词书继续学习吧。</p>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">返回首页</Link>
        </div>
      )}
    </main>
  );
}
