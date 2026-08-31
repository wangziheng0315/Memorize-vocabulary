import { NextResponse } from "next/server"
import { db } from "@/db"
import { adminUsers } from "@/db/schema"
import { getCurrentAdmin, toPublicAdmin } from "@/lib/admin-auth"

/** 返回系统初始化状态和当前登录管理员。 */
export async function GET() {
  const [currentAdmin, admins] = await Promise.all([
    getCurrentAdmin(),
    db.select({ id: adminUsers.id }).from(adminUsers).limit(1),
  ])
  return NextResponse.json({
    hasAdmin: admins.length > 0,
    user: currentAdmin ? toPublicAdmin(currentAdmin) : null,
  })
}
