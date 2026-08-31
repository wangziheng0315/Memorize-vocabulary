import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { and, eq, gt } from "drizzle-orm"
import { db } from "@/db"
import { adminSessions, adminUsers, type AdminRole } from "@/db/schema"

export const SESSION_COOKIE = "vocabulary-admin-session"
const SESSION_DAYS = 7

export type PublicAdmin = {
  id: string
  name: string
  email: string
  role: AdminRole
  createdAt: string
}

/** 将密码变成不可逆的哈希值，数据库不保存明文密码。 */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

/** 比较登录密码和数据库中的密码哈希。 */
export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":")
  if (!salt || !expected) return false
  const actual = scryptSync(password, salt, 64)
  const expectedBuffer = Buffer.from(expected, "hex")
  return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer)
}

/** 生成会话令牌的哈希，数据库只保存这个值。 */
export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

/** 将数据库管理员记录转换成可以返回给浏览器的安全对象。 */
export function toPublicAdmin(admin: typeof adminUsers.$inferSelect): PublicAdmin {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    createdAt: admin.createdAt.toISOString(),
  }
}

/** 创建 7 天有效的登录会话，并把原始令牌写入 HttpOnly Cookie。 */
export async function createAdminSession(adminId: string) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.insert(adminSessions).values({ adminId, tokenHash: hashSessionToken(token), expiresAt })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

/** 校验会话是否存在、未过期且关联的管理员仍然存在。 */
export async function getCurrentAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const rows = await db
    .select({ admin: adminUsers, session: adminSessions })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, hashSessionToken(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1)

  if (!rows[0]) {
    cookieStore.delete(SESSION_COOKIE)
    return null
  }
  return rows[0].admin
}

/** 删除当前会话，使退出登录立即生效。 */
export async function destroyCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashSessionToken(token)))
  cookieStore.delete(SESSION_COOKIE)
}

/** 判断当前管理员是否拥有管理员管理权限。 */
export function canManageAdmins(role: AdminRole) {
  return role === "系统管理员" || role === "超级管理员"
}
