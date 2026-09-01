import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { adminUsers } from "@/db/schema"
import { createAdminSession, toPublicAdmin, verifyPassword } from "@/lib/admin-auth"

/** 校验管理员账号密码并创建 7 天登录会话。 */
export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 })
  }
  if (admin.status === "禁用") {
    return NextResponse.json({ error: "该账号已被禁用，请联系系统管理员" }, { status: 403 })
  }
  await createAdminSession(admin.id)
  return NextResponse.json({ user: toPublicAdmin(admin) })
}
