import Link from 'next/link';
import { auth } from 'app/auth';
import { getProgressSummaries, getUserId } from 'app/db';
import { AuthModal } from 'app/components/auth-modal';
import { ProgressBar } from 'app/components/book-cards';
import { signOutAction } from 'app/actions/auth';

type SearchParams = { auth?: string | string[]; returnTo?: string | string[] };

function value(input: string | string[] | undefined) {
  return typeof input === 'string' ? input : '';
}

function studiedAt(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function MePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const email = session?.user?.email;
  const userId = email ? await getUserId(email) : undefined;
  const progress = userId ? await getProgressSummaries(userId) : [];
  const mode = value(searchParams.auth);
  const returnTo = value(searchParams.returnTo);
  const showModal = !email && (mode === 'login' || mode === 'register');

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8">
      <p className="text-sm font-semibold text-indigo-600">PROFILE</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">我的</h1>

      {email ? (
        <>
          <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold uppercase">
                {email.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-400">已登录账号</p>
                <p className="mt-1 truncate font-semibold">{email}</p>
              </div>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="progress-title">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  Progress
                </p>
                <h2 id="progress-title" className="mt-1 text-xl font-bold text-slate-900">
                  学习进度
                </h2>
              </div>
              <span className="text-xs text-slate-400">{progress.length} 本</span>
            </div>

            {progress.length > 0 ? (
              <div className="space-y-3">
                {progress.map((item) => (
                  <article key={item.bookId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-xs text-slate-400">{studiedAt(item.lastStudiedAt)} 学习</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-indigo-600">
                        {item.isCompleted ? '已完成' : `${item.percent}%`}
                      </span>
                    </div>
                    <div className="mt-4"><ProgressBar value={item.percent} /></div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-slate-500">{item.learnedCount} / {item.wordCount} 个</p>
                      <Link
                        href={`/study/${encodeURIComponent(item.bookId)}`}
                        className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        {item.isCompleted ? '重新复习' : '继续学习'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
                <p className="font-semibold text-slate-800">开始选择一本单词书吧</p>
                <p className="mt-2 text-sm text-slate-500">完成第一个单词后，进度会显示在这里。</p>
                <Link href="/" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">
                  去首页选书
                </Link>
              </div>
            )}
          </section>

          <form action={signOutAction} className="mt-8">
            <button type="submit" className="h-12 w-full rounded-2xl border border-rose-200 bg-white font-semibold text-rose-600 transition hover:bg-rose-50">
              退出登录
            </button>
          </form>
        </>
      ) : (
        <section className="mt-8 overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl shadow-slate-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl" aria-hidden="true">↗</div>
          <h2 className="mt-8 text-2xl font-bold">登录后同步学习进度</h2>
          <p className="mt-3 text-sm leading-6 text-indigo-100">
            保存每本单词书的学习位置，下次从刚刚停下的地方继续。
          </p>
          <Link
            href="/me?auth=login"
            className="mt-7 flex h-12 items-center justify-center rounded-2xl bg-white font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            登录 / 注册
          </Link>
        </section>
      )}

      {showModal ? (
        <AuthModal
          initialMode={mode === 'register' ? 'register' : 'login'}
          returnTo={returnTo}
        />
      ) : null}
    </main>
  );
}
