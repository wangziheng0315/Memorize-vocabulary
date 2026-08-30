"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 根路径页面
 * 根据登录状态和超级管理员存在情况自动跳转：
 * - 已登录 → /books
 * - 未登录 + 已有超级管理员 → /signin
 * - 未登录 + 无超级管理员 → /signup（首次注册）
 */
export default function Home() {
  const router = useRouter()
  const { user, isLoading, hasSuperAdmin } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (user) {
      router.replace("/books")
    } else if (hasSuperAdmin) {
      router.replace("/signin")
    } else {
      router.replace("/signup")
    }
  }, [user, isLoading, hasSuperAdmin, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}