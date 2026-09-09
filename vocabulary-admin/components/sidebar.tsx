"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BookOpen, Users, LogOut, Sparkles } from "lucide-react"

/** 侧边栏导航菜单项 */
const menuItems = [
  {
    href: "/books",
    label: "单词书管理",
    icon: BookOpen,
  },
  {
    href: "/admin-users",
    label: "管理员管理",
    icon: Users,
  },
]

/**
 * 后台管理系统的侧边栏
 * 包含导航菜单和底部用户信息
 */
export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  // 处理退出登录（layout 的 useEffect 会自动跳转到登录页）
  const handleSignOut = () => {
    if (window.confirm("确定退出登录吗？")) void signOut()
  }

  // 获取用户姓名首字母作为头像
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-border bg-white">
      {/* Logo 区域 */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="size-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">词汇管理后台</span>
      </div>

      <Separator />

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-0.5 p-3">
        <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          导航菜单
        </p>
        {menuItems.filter((item) => item.href !== "/admin-users" || user?.role !== "普通管理员").map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className={`size-4 transition-colors ${isActive ? "text-primary" : ""}`} />
                <span>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* 底部用户信息 */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          {/* 用户头像 */}
          <Avatar className="size-8 shrink-0 ring-2 ring-border/50">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>

          {/* 邮箱 */}
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-foreground">
              {user?.name || "未登录"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email || ""}
            </p>
          </div>

          {/* 退出按钮 */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent side="right" className="text-xs">退出登录</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  )
}
