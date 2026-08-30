"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle, Sparkles, Mail, Lock } from "lucide-react"

/**
 * 管理员登录页面
 * 只有超级管理员添加的账号才能登录
 */
export default function SignInPage() {
  const router = useRouter()
  const { user, signIn, isLoading, hasSuperAdmin } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 已登录则跳转
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/books")
    }
  }, [user, isLoading, router])

  // 如果还没有超级管理员，跳转到注册页
  useEffect(() => {
    if (!isLoading && !hasSuperAdmin && !user) {
      router.replace("/signup")
    }
  }, [hasSuperAdmin, isLoading, user, router])

  // 处理登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("请填写邮箱和密码")
      return
    }

    setIsSubmitting(true)
    const result = await signIn(email, password)
    setIsSubmitting(false)

    if (result.success) {
      router.push("/books")
    } else {
      setError(result.error || "登录失败")
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

      <Card className="relative w-full max-w-sm border-none shadow-xl shadow-black/5">
        <CardHeader className="space-y-1 pb-6 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">欢迎回来</CardTitle>
          <CardDescription>登录词汇管理后台</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pb-6">
            <Button
              type="submit"
              className="h-11 w-full rounded-lg font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}