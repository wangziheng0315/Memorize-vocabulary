import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * 路由守卫中间件
 * 检查用户是否登录，未登录则重定向到登录页
 * 
 * 注意：这个中间件只做简单的 cookie 检查，
 * 真正的认证状态由客户端的 AuthProvider 管理
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查是否有登录 cookie（客户端登录时会设置）
  const hasAuthCookie = request.cookies.has("vocabulary-admin-auth")

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