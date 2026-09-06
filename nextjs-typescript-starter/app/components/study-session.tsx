'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { advanceStudy, prefetchStudy } from 'app/actions/study';
import type { WordCardData } from 'app/word-data';

export function StudySession({
  bookId,
  cards: initialCards,
  initialPosition,
  total,
  wasCompleted,
}: {
  bookId: string;
  cards: WordCardData[];
  initialPosition: number;
  total: number;
  wasCompleted: boolean;
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [cursor, setCursor] = useState(0);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const prefetchedAnchor = useRef<string | null>(null);
  const card = cards[cursor];
  const position = initialPosition + cursor;
  const isLastWord = position + 1 === total;

  useEffect(() => {
    const remaining = cards.length - cursor;
    const lastCard = cards.at(-1);
    if (!card || !lastCard || remaining > 3 || prefetchedAnchor.current === lastCard.id) return;

    prefetchedAnchor.current = lastCard.id;
    void prefetchStudy({ bookId, afterWordId: lastCard.id }).then((result) => {
      if (!result.ok || result.cards.length === 0) return;
      setCards((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...result.cards.filter((item) => !known.has(item.id))];
      });
    }).catch(() => {
      prefetchedAnchor.current = null;
    });
  }, [bookId, card, cards, cursor]);

  function advance() {
    if (!card) return;
    const previousCursor = cursor;
    const nextCursor = cursor + 1;
    setMessage('');
    if (nextCursor < cards.length) setCursor(nextCursor);
    startTransition(async () => {
      const result = await advanceStudy({ bookId, wordId: card.id });
      if (!result.ok) {
        setCursor(previousCursor);
        if (result.code === 'AUTH_REQUIRED') {
          router.push(`/me?auth=login&returnTo=${encodeURIComponent(`/study/${bookId}`)}`);
          return;
        }
        if (result.code === 'PROGRESS_CONFLICT') router.refresh();
        setMessage(result.message);
        return;
      }

      if (result.completed) {
        router.push('/');
      } else if (nextCursor < cards.length) {
        return;
      } else {
        router.refresh();
      }
    });
  }

  if (!card) {
    return (
      <div className="my-auto rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
        <p className="text-3xl" aria-hidden="true">📖</p>
        <h2 className="mt-4 font-bold text-slate-800">该单词书暂无单词</h2>
        <p className="mt-2 text-sm text-slate-500">换一本单词书继续学习吧。</p>
        <Link href="/" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center py-8">
      {wasCompleted ? (
        <div role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 这本书已经学完，现在可以从头复习。
        </div>
      ) : null}
      <Link
        href={`/study/${encodeURIComponent(bookId)}/word/${card.id}`}
        aria-label={`查看 ${card.headWord} 的详细释义`}
        className="group block min-h-[390px] rounded-[2rem] border border-white bg-white p-7 shadow-2xl shadow-indigo-100 ring-1 ring-slate-100 transition hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <div className="mt-14 text-center">
          <h2 className="break-words text-5xl font-bold tracking-tight text-slate-950">{card.headWord}</h2>
          {card.usPhone || card.ukPhone ? (
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {card.usPhone ? <span>美 /{card.usPhone}/</span> : null}
              {card.ukPhone ? <span>英 /{card.ukPhone}/</span> : null}
            </div>
          ) : null}
          <p className="mt-8 text-2xl font-semibold text-indigo-700">{card.meaning || '暂无释义'}</p>
        </div>
        {card.example ? (
          <div className="mt-12 rounded-2xl bg-slate-50 p-4 text-left">
            <p className="font-medium leading-6 text-slate-800">{card.example.en}</p>
            {card.example.zh ? <p className="mt-2 text-sm leading-6 text-slate-500">{card.example.zh}</p> : null}
          </div>
        ) : null}
      </Link>
      <div className="mt-8">
        <button type="button" disabled={pending} onClick={advance} className="flex h-12 w-full items-center justify-center rounded-2xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300">
          {pending ? '已切换，正在保存…' : isLastWord ? '完成本书' : '下一个'}
        </button>
        {message ? <p className="mt-3 text-center text-sm text-rose-600">{message}</p> : null}
      </div>
    </div>
  );
}
