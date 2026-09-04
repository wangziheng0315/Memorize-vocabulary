import { bigint, check, index, integer, json, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/** 管理员角色，系统管理员权限最高，超级管理员只能管理普通管理员。 */
export const adminRoleValues = ["系统管理员", "超级管理员", "普通管理员"] as const
export type AdminRole = (typeof adminRoleValues)[number]

/** 管理员账号状态；禁用后保留账号记录，但不能继续登录。 */
export const adminStatusValues = ["启用", "禁用"] as const
export type AdminStatus = (typeof adminStatusValues)[number]

/** 保存管理员账号、角色和密码哈希。 */
export const adminUsers = pgTable(
  "admin-users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: adminRoleValues }).notNull(),
    status: text("status", { enum: adminStatusValues }).notNull().default("启用"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("admin-users-email-lowercase-check", sql`${table.email} = lower(${table.email})`),
    check("admin-users-role-check", sql`${table.role} in ('系统管理员', '超级管理员', '普通管理员')`),
    check("admin-users-status-check", sql`${table.status} in ('启用', '禁用')`),
    uniqueIndex("admin-users-single-system-admin-index")
      .on(table.role)
      .where(sql`${table.role} = '系统管理员'`),
  ],
)

/** 保存登录会话；数据库只保存令牌哈希，原始令牌只在浏览器 Cookie 中。 */
export const adminSessions = pgTable(
  "admin-session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("admin-session-admin-id-index").on(table.adminId),
    index("admin-session-expires-at-index").on(table.expiresAt),
  ],
)

/** 单词书，每本单词书对应一个 bookId，words 表通过 bookId 关联到单词书。 */
export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    coverUrl: text("cover_url"),
    bookId: text("book_id").notNull().unique(),
    tags: text("tags"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
)

/** 保存单词数据；从 GitHub 单词资料库转换后通过 CSV 导入 Supabase。 */
export const words = pgTable(
  "words",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    wordRank: integer("wordRank"),
    headWord: text("headWord"),
    content: json("content"),
    bookId: text("bookId").references(() => books.bookId, { onDelete: "cascade" }),
  },
)
