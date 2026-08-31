import { NextResponse } from "next/server"
import { db } from "@/db"
import { adminUsers } from "@/db/schema"
import { createAdminSession, hashPassword, toPublicAdmin } from "@/lib/admin-auth"

/** 创建首个系统管理员；数据库已有管理员时拒绝重复初始化。 */
export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  if (!name || !email || password.length < 6) {
    return NextResponse.json({ error: "请填写完整信息，密码至少需要 6 个字符" }, { status: 400 })
  }

  try {
    const admin = await db.transaction(async (tx) => {
      const existing = await tx.select({ id: adminUsers.id }).from(adminUsers).limit(1)
      if (existing.length > 0) throw new Error("ADMIN_EXISTS")
      const [created] = await tx.insert(adminUsers).values({
        name,
        email,
        passwordHash: hashPassword(password),
        role: "系统管理员",
      }).returning()
      return created
    })
    await createAdminSession(admin.id)
    return NextResponse.json({ user: toPublicAdmin(admin) }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_EXISTS") {
      return NextResponse.json({ error: "系统管理员已存在，无法重复注册" }, { status: 409 })
    }
    return NextResponse.json({ error: "该邮箱已被注册或注册失败" }, { status: 400 })
  }
}
