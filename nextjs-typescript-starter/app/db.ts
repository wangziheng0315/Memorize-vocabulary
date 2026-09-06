import { drizzle } from 'drizzle-orm/postgres-js';
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { asc, desc, eq, sql as drizzleSql } from 'drizzle-orm';
import postgres from 'postgres';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { toWordCard, toWordDetail, WordCardData, WordDetailData } from 'app/word-data';

export const sql = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
export const db = drizzle(sql);

export const users = pgTable(
  'User',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 254 }).notNull(),
    password: varchar('password', { length: 64 }).notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex('User_email_unique').on(table.email),
  }),
);

export const books = pgTable(
  'books',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    wordCount: integer('word_count').notNull(),
    coverUrl: text('cover_url'),
    bookId: text('book_id').notNull(),
    tags: text('tags'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bookIdUnique: uniqueIndex('books_book_id_unique').on(table.bookId),
  }),
);

export const words = pgTable(
  'words',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    wordRank: integer('wordRank'),
    headWord: text('headWord'),
    content: json('content'),
    bookId: text('bookId')
      .notNull()
      .references(() => books.bookId, { onDelete: 'restrict', onUpdate: 'restrict' }),
  },
  (table) => ({
    bookRank: index('words_book_rank_id_idx').on(
      table.bookId,
      table.wordRank,
      table.id,
    ),
  }),
);

export const userBookProgress = pgTable(
  'user_book_progress',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    bookId: text('book_id')
      .notNull()
      .references(() => books.bookId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    lastLearnedWordId: bigint('last_learned_word_id', { mode: 'bigint' }).references(
      () => words.id,
      { onDelete: 'restrict', onUpdate: 'restrict' },
    ),
    learnedCount: integer('learned_count').notNull().default(0),
    isCompleted: boolean('is_completed').notNull().default(false),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastStudiedAt: timestamp('last_studied_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userBookUnique: uniqueIndex('user_book_progress_user_book_unique').on(
      table.userId,
      table.bookId,
    ),
    userRecent: index('user_book_progress_user_recent_idx').on(
      table.userId,
      table.lastStudiedAt,
    ),
    book: index('user_book_progress_book_idx').on(table.bookId),
  }),
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getUser(email: string) {
  return await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)));
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  return await db
    .insert(users)
    .values({ email: normalizeEmail(email), password: hash });
}

export async function getUserId(email: string) {
  return (await getUser(email))[0]?.id;
}

export type BookSummary = {
  bookId: string;
  title: string;
  wordCount: number;
  coverUrl: string | null;
  tags: string | null;
};

export type ProgressSummary = BookSummary & {
  learnedCount: number;
  isCompleted: boolean;
  lastStudiedAt: Date;
  percent: number;
};

export async function getBookSummaries(): Promise<BookSummary[]> {
  return await db
    .select({
      bookId: books.bookId,
      title: books.title,
      wordCount: books.wordCount,
      coverUrl: books.coverUrl,
      tags: books.tags,
    })
    .from(books)
    .orderBy(asc(books.createdAt));
}

export async function getProgressSummaries(userId: number): Promise<ProgressSummary[]> {
  const rows = await db
    .select({
      bookId: books.bookId,
      title: books.title,
      wordCount: books.wordCount,
      coverUrl: books.coverUrl,
      tags: books.tags,
      learnedCount: userBookProgress.learnedCount,
      isCompleted: userBookProgress.isCompleted,
      lastStudiedAt: userBookProgress.lastStudiedAt,
    })
    .from(userBookProgress)
    .innerJoin(books, eq(userBookProgress.bookId, books.bookId))
    .where(eq(userBookProgress.userId, userId))
    .orderBy(desc(userBookProgress.lastStudiedAt));

  return rows.map((row) => ({
    ...row,
    percent: row.wordCount
      ? Math.min(100, Math.round((row.learnedCount / row.wordCount) * 100))
      : 0,
  }));
}

export type StudyContext = {
  book: BookSummary;
  card: WordCardData | null;
  position: number;
  total: number;
  wasCompleted: boolean;
};

export async function getStudyContext(
  userId: number,
  bookId: string,
): Promise<StudyContext | null> {
  const [book] = await db
    .select({
      bookId: books.bookId,
      title: books.title,
      wordCount: books.wordCount,
      coverUrl: books.coverUrl,
      tags: books.tags,
    })
    .from(books)
    .where(eq(books.bookId, bookId))
    .limit(1);

  if (!book) return null;

  const [progress] = await db
    .select()
    .from(userBookProgress)
    .where(
      drizzleSql`${userBookProgress.userId} = ${userId} and ${userBookProgress.bookId} = ${bookId}`,
    )
    .limit(1);
  const isCompleted = progress?.isCompleted ?? false;
  const lastWordId = progress?.lastLearnedWordId ? String(progress.lastLearnedWordId) : null;
  const [word] = (await sql`
    with ordered_words as (
      select
        id,
        "headWord" as "headWord",
        content,
        (row_number() over (order by "wordRank" asc nulls last, id asc) - 1)::integer as position,
        count(*) over ()::integer as total
      from public.words
      where "bookId" = ${bookId}
    ), anchor as (
      select position from ordered_words where id = ${lastWordId}::bigint
    )
    select id, "headWord", content, position, total
    from ordered_words
    where position = case
      when ${isCompleted} or ${lastWordId}::bigint is null then 0
      else coalesce((select position + 1 from anchor), 0)
    end
  `) as unknown as Array<{
    id: string | bigint;
    headWord: string | null;
    content: unknown;
    position: number;
    total: number;
  }>;
  const total = word?.total ?? 0;
  const safePosition = word?.position ?? 0;

  return {
    book,
    card: word ? toWordCard(word) : null,
    position: safePosition,
    total,
    wasCompleted: progress?.isCompleted ?? false,
  };
}

export async function getWordDetail(
  bookId: string,
  wordRowId: string,
): Promise<WordDetailData | null> {
  let id: bigint;
  try {
    id = BigInt(wordRowId);
  } catch {
    return null;
  }

  const [word] = await db
    .select({ id: words.id, headWord: words.headWord, content: words.content })
    .from(words)
    .where(
      drizzleSql`${words.id} = ${id} and ${words.bookId} = ${bookId}`,
    )
    .limit(1);

  return word ? toWordDetail(word) : null;
}
