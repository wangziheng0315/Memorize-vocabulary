import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * 路由守卫中间件
 * 检查用户是否登录，未登录则重定向到登录页
 * 
 * 注意：这个中间件只做 Cookie 存在性检查，
 * 具体会话有效期和角色权限由服务端接口验证
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查是否有登录 cookie（客户端登录时会设置）
  const hasAuthCookie = request.cookies.has("vocabulary-admin-session")

  // 需要登录才能访问的页面
  const protectedPaths = ["/books", "/admin-users"]

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !hasAuthCookie) {
    const signInUrl = new URL("/signin", request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  // 匹配需要保护的路由
  matcher: ["/books/:path*", "/admin-users/:path*"],
}