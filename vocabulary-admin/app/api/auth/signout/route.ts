import { NextResponse } from "next/server"
import { destroyCurrentSession } from "@/lib/admin-auth"

/** 删除当前管理员的登录会话并清除 Cookie。 */
export async function POST() {
  await destroyCurrentSession()
  return NextResponse.json({ success: true })
}
