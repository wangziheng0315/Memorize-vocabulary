import { auth } from 'app/auth';
import {
  getBookSummaries,
  getProgressSummaries,
  getUserId,
  type ProgressSummary,
} from 'app/db';
import { BookCard } from 'app/components/book-cards';
import { RecentLearning } from 'app/components/recent-learning';

export default async function HomePage() {
  const [session, books] = await Promise.all([auth(), getBookSummaries()]);
  const email = session?.user?.email;
  const userId = email ? await getUserId(email) : undefined;
  const progress = userId ? await getProgressSummaries(userId) : [];
  const progressByBook = new Map<string, ProgressSummary>(
    progress.map((item) => [item.bookId, item]),
  );

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">WORD FLOW</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            今天学几个单词？
          </h1>
        </div>
        {email ? (
          <div
            title={email}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold uppercase text-white shadow-lg shadow-indigo-200"
          >
            {email.slice(0, 1)}
          </div>
        ) : null}
      </header>

      {userId ? <RecentLearning /> : null}

      <section className="mt-10" aria-labelledby="books-title">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
            Library
          </p>
          <h2 id="books-title" className="mt-1 text-xl font-bold text-slate-900">
            全部单词书
          </h2>
        </div>
        {books.length > 0 ? (
          <div className="space-y-4">
            {books.map((book) => (
              <BookCard
                key={book.bookId}
                book={book}
                progress={progressByBook.get(book.bookId)}
                signedIn={Boolean(userId)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <p className="font-semibold text-slate-700">还没有可学习的单词书</p>
            <p className="mt-2 text-sm text-slate-500">内容准备好后会显示在这里。</p>
          </div>
        )}
      </section>
    </main>
  );
}
