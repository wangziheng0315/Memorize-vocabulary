"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export type AdminRole = "系统管理员" | "超级管理员" | "普通管理员"

/** 浏览器端可安全使用的管理员信息。 */
export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  createdAt: string
}

type Result = { success: boolean; error?: string }

interface AuthContextType {
  user: AdminUser | null
  isLoading: boolean
  hasSuperAdmin: boolean
  signIn: (email: string, password: string) => Promise<Result>
  signUpSuperAdmin: (name: string, email: string, password: string) => Promise<Result>
  signOut: () => Promise<void>
  getAllAdmins: () => Promise<AdminUser[]>
  addAdmin: (name: string, email: string, password: string, role?: AdminRole) => Promise<Result>
  updateAdmin: (id: string, data: Partial<AdminUser> & { password?: string }) => Promise<Result>
  removeAdmin: (id: string) => Promise<Result>
}

const AuthContext = createContext<AuthContextType | null>(null)

/** 读取接口响应，统一转换成页面需要的结果格式。 */
async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } })
  const data = await response.json()
  return { response, data }
}

/** 提供基于服务端数据库会话的认证能力。 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false)

  useEffect(() => {
    requestJson("/api/auth/status")
      .then(({ data }) => {
        setUser(data.user)
        setHasSuperAdmin(data.hasAdmin)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signIn = async (email: string, password: string): Promise<Result> => {
    const { response, data } = await requestJson("/api/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) })
    if (!response.ok) return { success: false, error: data.error }
    setUser(data.user)
    setHasSuperAdmin(true)
    return { success: true }
  }

  const signUpSuperAdmin = async (name: string, email: string, password: string): Promise<Result> => {
    const { response, data } = await requestJson("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) })
    if (!response.ok) return { success: false, error: data.error }
    setUser(data.user)
    setHasSuperAdmin(true)
    return { success: true }
  }

  const signOut = async () => {
    await requestJson("/api/auth/signout", { method: "POST" })
    setUser(null)
  }

  const getAllAdmins = useCallback(async () => {
    const { response, data } = await requestJson("/api/admin-users")
    return response.ok ? data.admins : []
  }, [])

  const addAdmin = async (name: string, email: string, password: string, role = "普通管理员" as AdminRole): Promise<Result> => {
    const { response, data } = await requestJson("/api/admin-users", { method: "POST", body: JSON.stringify({ name, email, password, role }) })
    return response.ok ? { success: true } : { success: false, error: data.error }
  }

  const updateAdmin = async (id: string, update: Partial<AdminUser> & { password?: string }): Promise<Result> => {
    const { response, data } = await requestJson("/api/admin-users", { method: "PATCH", body: JSON.stringify({ id, ...update }) })
    return response.ok ? { success: true } : { success: false, error: data.error }
  }

  const removeAdmin = async (id: string): Promise<Result> => {
    const { response, data } = await requestJson(`/api/admin-users?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    return response.ok ? { success: true } : { success: false, error: data.error }
  }

  return <AuthContext.Provider value={{ user, isLoading, hasSuperAdmin, signIn, signUpSuperAdmin, signOut, getAllAdmins, addAdmin, updateAdmin, removeAdmin }}>{children}</AuthContext.Provider>
}

/** 获取认证上下文。 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内部使用")
  return context
}
