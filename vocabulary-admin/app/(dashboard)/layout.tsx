"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Sidebar } from "@/components/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 后台管理页面布局（含侧边栏）
 * 所有需要登录的页面都使用此布局
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // 未登录则跳转到登录页
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/signin")
    }
  }, [user, isLoading, router])

  // 加载中显示骨架屏
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* 左侧边栏 */}
      <Sidebar />

      {/* 右侧主体内容 */}
      <main className="ml-60 flex-1 overflow-auto bg-background p-8">
        {children}
      </main>
    </div>
  )
}