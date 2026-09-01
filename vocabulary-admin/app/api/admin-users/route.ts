import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { adminSessions, adminUsers, type AdminRole, type AdminStatus } from "@/db/schema"
import { canManageAdmins, getCurrentAdmin, hashPassword, toPublicAdmin } from "@/lib/admin-auth"

/** 统一检查管理员管理权限，普通管理员永远不能通过接口绕过前端限制。 */
async function requireManager() {
  const current = await getCurrentAdmin()
  if (!current || !canManageAdmins(current.role)) return null
  return current
}

/** 查询管理员列表，按角色优先级排序：系统管理员 → 超级管理员 → 普通管理员。 */
export async function GET() {
  const current = await requireManager()
  if (!current) return NextResponse.json({ error: "无权访问" }, { status: 403 })
  const admins = await db.select().from(adminUsers)
  const roleOrder: Record<AdminRole, number> = { "系统管理员": 0, "超级管理员": 1, "普通管理员": 2 }
  admins.sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
  return NextResponse.json({ admins: admins.map(toPublicAdmin) })
}

/** 新建管理员；超级管理员只能创建普通管理员。 */
export async function POST(request: Request) {
  const current = await requireManager()
  if (!current) return NextResponse.json({ error: "无权访问" }, { status: 403 })

  const body = await request.json()
  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  const role = (body.role ?? "普通管理员") as AdminRole
  if (!name || !email || password.length < 6) {
    return NextResponse.json({ error: "请填写完整信息，密码至少需要 6 个字符" }, { status: 400 })
  }
  if (!["系统管理员", "超级管理员", "普通管理员"].includes(role)) {
    return NextResponse.json({ error: "管理员角色无效" }, { status: 400 })
  }
  if (role === "系统管理员") {
    return NextResponse.json({ error: "系统管理员权限只能通过转让获得" }, { status: 403 })
  }
  if (current.role === "超级管理员" && role !== "普通管理员") {
    return NextResponse.json({ error: "超级管理员只能创建普通管理员" }, { status: 403 })
  }

  try {
    const [admin] = await db.insert(adminUsers).values({
      name,
      email,
      passwordHash: hashPassword(password),
      role,
    }).returning()
    return NextResponse.json({ admin: toPublicAdmin(admin) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 })
  }
}

/** 编辑管理员资料或转让系统管理员权限。 */
export async function PATCH(request: Request) {
  const current = await requireManager()
  if (!current) return NextResponse.json({ error: "无权访问" }, { status: 403 })

  const body = await request.json()
  const id = String(body.id ?? "")
  const requestedRole = body.role
  const requestedStatus = body.status
  const validRoles = ["系统管理员", "超级管理员", "普通管理员"] as const
  const validStatuses = ["启用", "禁用"] as const
  if (requestedRole !== undefined && !validRoles.includes(requestedRole)) {
    return NextResponse.json({ error: "管理员角色无效" }, { status: 400 })
  }
  if (requestedStatus !== undefined && !validStatuses.includes(requestedStatus)) {
    return NextResponse.json({ error: "管理员状态无效" }, { status: 400 })
  }
  const targetRole = requestedRole as AdminRole | undefined
  const targetStatus = requestedStatus as AdminStatus | undefined
  const target = (await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1))[0]
  if (!target) return NextResponse.json({ error: "管理员不存在" }, { status: 404 })

  if (targetStatus && targetStatus !== target.status) {
    if (target.id === current.id) {
      return NextResponse.json({ error: "不能禁用当前登录管理员" }, { status: 400 })
    }
    if (target.role === "系统管理员") {
      return NextResponse.json({ error: "系统管理员不可禁用" }, { status: 403 })
    }
    if (current.role === "超级管理员" && target.role !== "普通管理员") {
      return NextResponse.json({ error: "超级管理员只能管理普通管理员" }, { status: 403 })
    }

    const admin = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(adminUsers)
        .set({ status: targetStatus, updatedAt: new Date() })
        .where(eq(adminUsers.id, target.id))
        .returning()
      if (targetStatus === "禁用") {
        await tx.delete(adminSessions).where(eq(adminSessions.adminId, target.id))
      }
      return updated
    })
    return NextResponse.json({ admin: toPublicAdmin(admin) })
  }

  if (target.status === "禁用") {
    return NextResponse.json({ error: "请先启用该管理员，再修改账号信息" }, { status: 400 })
  }

  if (targetRole === "系统管理员" && current.role === "系统管理员" && target.id !== current.id) {
    const result = await db.transaction(async (tx) => {
      // 先降级原管理员，再升级目标管理员，避免唯一索引冲突
      const [formerSystemAdmin] = await tx.update(adminUsers).set({ role: "超级管理员", updatedAt: new Date() }).where(eq(adminUsers.id, current.id)).returning()
      const [newSystemAdmin] = await tx.update(adminUsers).set({ role: "系统管理员", updatedAt: new Date() }).where(eq(adminUsers.id, target.id)).returning()
      return { newSystemAdmin, formerSystemAdmin }
    })
    return NextResponse.json({ admins: [toPublicAdmin(result.newSystemAdmin), toPublicAdmin(result.formerSystemAdmin)] })
  }

  if (current.role === "超级管理员" && target.role !== "普通管理员") {
    return NextResponse.json({ error: "超级管理员只能管理普通管理员" }, { status: 403 })
  }
  if (target.id === current.id && targetRole && targetRole !== target.role) {
    return NextResponse.json({ error: "系统管理员角色只能通过转让流程变更" }, { status: 403 })
  }
  const requestedPassword = body.password === undefined ? "" : String(body.password)
  if (requestedPassword && requestedPassword.length < 6) {
    return NextResponse.json({ error: "密码至少需要 6 个字符" }, { status: 400 })
  }
  if (targetRole && targetRole !== target.role) {
    if (current.role !== "系统管理员" || targetRole === "系统管理员") {
      return NextResponse.json({ error: "无权修改该管理员角色" }, { status: 403 })
    }
  }

  const name = body.name === undefined ? target.name : String(body.name).trim()
  const email = body.email === undefined ? target.email : String(body.email).trim().toLowerCase()
  if (!name || !email) return NextResponse.json({ error: "姓名和邮箱不能为空" }, { status: 400 })
  try {
    const [admin] = await db.update(adminUsers).set({
      name,
      email,
      role: targetRole ?? target.role,
      ...(requestedPassword ? { passwordHash: hashPassword(requestedPassword) } : {}),
      updatedAt: new Date(),
    }).where(eq(adminUsers.id, id)).returning()
    return NextResponse.json({ admin: toPublicAdmin(admin) })
  } catch {
    return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 })
  }
}

/** 回收管理员账号：保留账号记录、改为禁用，并清除其全部登录会话。 */
export async function DELETE(request: Request) {
  const current = await requireManager()
  if (!current) return NextResponse.json({ error: "无权访问" }, { status: 403 })
  const id = new URL(request.url).searchParams.get("id")
  if (!id || id === current.id) return NextResponse.json({ error: "不能回收当前登录管理员" }, { status: 400 })
  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1)
  if (!target) return NextResponse.json({ error: "管理员不存在" }, { status: 404 })
  if (target.role === "系统管理员") return NextResponse.json({ error: "系统管理员不可回收" }, { status: 403 })
  if (current.role === "超级管理员" && target.role !== "普通管理员") {
    return NextResponse.json({ error: "超级管理员只能回收普通管理员" }, { status: 403 })
  }

  const admin = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(adminUsers)
      .set({ status: "禁用", updatedAt: new Date() })
      .where(eq(adminUsers.id, target.id))
      .returning()
    await tx.delete(adminSessions).where(eq(adminSessions.adminId, target.id))
    return updated
  })
  return NextResponse.json({ admin: toPublicAdmin(admin) })
}
