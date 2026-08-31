"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle, Shield, Mail, Lock, User } from "lucide-react"

/**
 * 系统管理员首次注册页面
 * 系统初始化时使用，只能注册一个系统管理员
 */
export default function SignUpPage() {
  const router = useRouter()
  const { user, signUpSuperAdmin, isLoading, hasSuperAdmin } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 已登录则跳转
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/books")
    }
  }, [user, isLoading, router])

  // 如果已有系统管理员，跳转到登录页
  useEffect(() => {
    if (!isLoading && hasSuperAdmin && !user) {
      router.replace("/signin")
    }
  }, [hasSuperAdmin, isLoading, user, router])

  // 处理注册提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("请填写所有字段")
      return
    }

    if (password.length < 6) {
      setError("密码至少需要 6 个字符")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    setIsSubmitting(true)
    const result = await signUpSuperAdmin(name, email, password)
    setIsSubmitting(false)

    if (result.success) {
      router.push("/books")
    } else {
      setError(result.error || "注册失败")
    }
  }

  if (isLoading || user) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* 装饰背景 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-[300px] w-[300px] rounded-full bg-violet-100/40 blur-3xl" />
      </div>

      {/* 卡片 */}
      <Card className="relative w-full max-w-sm border-none shadow-xl shadow-black/5">
        <CardHeader className="space-y-1 pb-6 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">初始化系统</CardTitle>
          <CardDescription>注册系统管理员账号，此操作仅需一次</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 姓名 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">姓名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="name"
                  type="text"
                  placeholder="请输入姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>

            {/* 邮箱 */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">邮箱地址</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="至少 6 个字符"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>

            {/* 确认密码 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">确认密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-4 border-t-0 bg-transparent pb-6">
            <Button
              type="submit"
              className="h-11 w-full rounded-lg font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "注册中..." : "创建系统管理员"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              系统管理员拥有系统最高权限，仅能注册一次
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}