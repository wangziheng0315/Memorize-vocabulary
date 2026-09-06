import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from 'app/auth';
import { getWordDetail } from 'app/db';
import { PronunciationButtons } from 'app/components/pronunciation-buttons';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function WordDetailPage({ params }: { params: { bookId: string; wordId: string } }) {
  const session = await auth();
  const path = `/study/${encodeURIComponent(params.bookId)}/word/${encodeURIComponent(params.wordId)}`;
  if (!session?.user?.email) redirect(`/me?auth=login&returnTo=${encodeURIComponent(path)}`);

  const word = await getWordDetail(params.bookId, params.wordId);
  if (!word) notFound();

  const synonyms = word.synonyms.filter((item) => item.meaning || item.words.length > 0);
  const relatedWords = word.relatedWords.filter((item) => item.words.length > 0);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/study/${encodeURIComponent(params.bookId)}`}
          aria-label="返回学习页"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl text-slate-700 shadow-sm ring-1 ring-slate-200"
        >
          ‹
        </Link>
        <p className="truncate text-sm font-semibold text-slate-500">单词详情</p>
      </header>

      <section className="py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">Word</p>
        <h1 className="mt-4 break-words text-5xl font-bold tracking-tight text-slate-950">{word.headWord}</h1>
        <div className="mt-5">
          <PronunciationButtons word={word.headWord} />
        </div>
        {word.usPhone || word.ukPhone ? (
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
            {word.usPhone ? <span>美 /{word.usPhone}/</span> : null}
            {word.ukPhone ? <span>英 /{word.ukPhone}/</span> : null}
          </div>
        ) : null}
      </section>

      <div className="space-y-4">
        {word.translations.length > 0 ? (
          <Section title="核心释义">
            <div className="space-y-3">
              {word.translations.map((translation, index) => (
                <div key={index} className="rounded-2xl bg-indigo-50 p-4">
                  {translation.zh ? <p className="font-semibold text-slate-900">{translation.zh}</p> : null}
                  {translation.en ? (
                    <details className="mt-2 text-sm text-slate-500">
                      <summary className="cursor-pointer font-medium text-indigo-600">查看英文释义</summary>
                      <p className="mt-2 leading-6">{translation.en}</p>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {word.examples.length > 0 ? (
          <Section title="例句">
            <div className="divide-y divide-slate-100">
              {word.examples.map((example, index) => (
                <div key={index} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium leading-6 text-slate-800">{example.en}</p>
                  {example.zh ? <p className="mt-1 text-sm leading-6 text-slate-500">{example.zh}</p> : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {word.phrases.length > 0 ? (
          <Section title="常用短语">
            <div className="flex flex-wrap gap-2">
              {word.phrases.map((phrase, index) => (
                <div key={index} className="w-full rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-800">{phrase.text}</p>
                  {phrase.zh ? <p className="mt-1 text-sm text-slate-500">{phrase.zh}</p> : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {synonyms.length > 0 ? (
          <Section title="同近义词">
            <div className="space-y-4">
              {synonyms.map((item, index) => (
                <div key={index}>
                  <div className="flex items-start gap-2">
                    {item.partOfSpeech ? <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">{item.partOfSpeech}</span> : null}
                    {item.meaning ? <p className="text-sm leading-6 text-slate-600">{item.meaning}</p> : null}
                  </div>
                  {item.words.length > 0 ? <p className="mt-2 text-sm font-medium text-slate-800">{item.words.join(' · ')}</p> : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {relatedWords.length > 0 ? (
          <Section title="同根词">
            <div className="space-y-4">
              {relatedWords.map((group, index) => (
                <div key={index}>
                  {group.partOfSpeech ? <span className="inline-flex rounded-md bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">{group.partOfSpeech}</span> : null}
                  <div className="mt-2 space-y-2">
                    {group.words.map((item, wordIndex) => (
                      <p key={wordIndex} className="text-sm leading-6">
                        <span className="font-semibold text-slate-900">{item.word}</span>
                        {item.meaning ? <span className="text-slate-500"> — {item.meaning}</span> : null}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {word.memoryTip ? (
          <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700">记忆方法</h2>
            <p className="mt-3 leading-7 text-amber-950">{word.memoryTip}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
