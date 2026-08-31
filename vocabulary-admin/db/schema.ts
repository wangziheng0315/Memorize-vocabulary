import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/** 管理员角色，系统管理员权限最高，超级管理员只能管理普通管理员。 */
export const adminRoleValues = ["系统管理员", "超级管理员", "普通管理员"] as const
export type AdminRole = (typeof adminRoleValues)[number]

/** 保存管理员账号、角色和密码哈希。 */
export const adminUsers = pgTable(
  "admin-users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: adminRoleValues }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("admin-users-single-system-admin-index")
    .on(table.role)
    .where(sql`${table.role} = '系统管理员'`)],
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
  (table) => [index("admin-session-admin-id-index").on(table.adminId)],
)
