'use server';

import { auth } from 'app/auth';
import { getNextStudyCards, getUserId } from 'app/db';
import { decideProgress, type StoredProgress } from 'app/progress';
import { sql } from 'app/db';
import { revalidatePath } from 'next/cache';
import type { WordCardData } from 'app/word-data';

export type AdvanceStudyResult =
  | { ok: true; completed: boolean }
  | {
      ok: false;
      code: 'AUTH_REQUIRED' | 'WORD_NOT_IN_BOOK' | 'PROGRESS_CONFLICT' | 'UNKNOWN_ERROR';
      message: string;
    };

export type PrefetchStudyResult =
  | { ok: true; cards: WordCardData[] }
  | { ok: false; message: string };

export async function prefetchStudy(input: {
  bookId: string;
  afterWordId: string;
}): Promise<PrefetchStudyResult> {
  if (!input.bookId || input.bookId.length > 200 || !/^\d{1,19}$/.test(input.afterWordId)) {
    return { ok: false, message: '下一批单词加载失败。' };
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email || !(await getUserId(email))) return { ok: false, message: '请先登录。' };

  try {
    return { ok: true, cards: await getNextStudyCards(input.bookId, input.afterWordId) };
  } catch {
    return { ok: false, message: '下一批单词加载失败。' };
  }
}

type PositionRow = { id: string | bigint; position: number; total: number };
type ProgressRow = {
  lastLearnedWordId: string | bigint | null;
  learnedCount: number;
  isCompleted: boolean;
};

export async function advanceStudy(input: {
  bookId: string;
  wordId: string;
}): Promise<AdvanceStudyResult> {
  if (
    !input.bookId ||
    input.bookId.length > 200 ||
    !/^\d{1,19}$/.test(input.wordId) ||
    BigInt(input.wordId) > BigInt('9223372036854775807')
  ) {
    return { ok: false, code: 'WORD_NOT_IN_BOOK', message: '单词不存在。' };
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false, code: 'AUTH_REQUIRED', message: '请先登录。' };

  const userId = await getUserId(email);
  if (!userId) return { ok: false, code: 'AUTH_REQUIRED', message: '请先登录。' };

  try {
    let result: AdvanceStudyResult = {
      ok: false,
      code: 'UNKNOWN_ERROR',
      message: '保存进度失败，请重试。',
    };
    const wordId = input.wordId;

    await sql.begin(async (transaction) => {
      const [word] = (await transaction`
        with ordered_words as (
          select
            id,
            (row_number() over (order by "wordRank" asc nulls last, id asc) - 1)::integer as position,
            count(*) over ()::integer as total
          from public.words
          where "bookId" = ${input.bookId}
        )
        select id, position, total from ordered_words where id = ${wordId}::bigint
      `) as unknown as PositionRow[];
      if (!word) {
        result = { ok: false, code: 'WORD_NOT_IN_BOOK', message: '单词不存在。' };
        return;
      }

      await transaction`
        insert into public.user_book_progress (user_id, book_id)
        values (${userId}, ${input.bookId})
        on conflict (user_id, book_id) do nothing
      `;
      const [progress] = (await transaction`
        select
          last_learned_word_id as "lastLearnedWordId",
          learned_count as "learnedCount",
          is_completed as "isCompleted"
        from public.user_book_progress
        where user_id = ${userId} and book_id = ${input.bookId}
        for update
      `) as unknown as ProgressRow[];
      const stored: StoredProgress = {
        lastLearnedWordId: progress?.lastLearnedWordId
          ? String(progress.lastLearnedWordId)
          : null,
        learnedCount: progress?.learnedCount ?? 0,
        isCompleted: progress?.isCompleted ?? false,
      };
      const decision = decideProgress(stored, input.wordId, word.position, word.total);

      if (decision.kind === 'duplicate') {
        result = { ok: true, completed: stored.isCompleted };
        return;
      }
      if (decision.kind === 'conflict') {
        result = {
          ok: false,
          code: 'PROGRESS_CONFLICT',
          message: '学习进度已在其他页面更新，已为你刷新当前单词。',
        };
        return;
      }

      await transaction`
        update public.user_book_progress
        set
          last_learned_word_id = ${wordId}::bigint,
          learned_count = ${decision.learnedCount},
          is_completed = ${decision.isCompleted},
          started_at = case when ${decision.restarts} then now() else started_at end,
          completed_at = case when ${decision.isCompleted} then now() else null end,
          last_studied_at = now(),
          updated_at = now()
        where user_id = ${userId} and book_id = ${input.bookId}
      `;
      result = { ok: true, completed: decision.isCompleted };
    });

    if (result.ok) {
      revalidatePath('/');
      revalidatePath('/me');
      revalidatePath(`/study/${input.bookId}`);
    }
    return result;
  } catch {
    return { ok: false, code: 'UNKNOWN_ERROR', message: '保存进度失败，请重试。' };
  }
}
