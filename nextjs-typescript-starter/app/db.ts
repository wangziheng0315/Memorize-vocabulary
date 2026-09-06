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
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { genSaltSync, hashSync } from 'bcrypt-ts';

const client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
export const db = drizzle(client);

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
