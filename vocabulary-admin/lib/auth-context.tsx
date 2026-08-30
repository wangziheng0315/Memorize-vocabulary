"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

/** 管理员用户数据结构 */
export interface AdminUser {
  id: string
  name: string
  email: string
  role: "超级管理员" | "普通管理员"
  createdAt: string
}

/** 存储用的完整用户数据（含密码） */
interface StoredUser extends AdminUser {
  password: string
}

/** 认证上下文提供的方法 */
interface AuthContextType {
  user: AdminUser | null
  isLoading: boolean
  /** 是否有超级管理员（用于判断是否显示注册页） */
  hasSuperAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  /** 超级管理员首次注册（只能注册一次） */
  signUpSuperAdmin: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => void
  /** 获取所有管理员列表（超级管理员才能调用） */
  getAllAdmins: () => AdminUser[]
  /** 超级管理员添加普通管理员 */
  addAdmin: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  /** 删除管理员（不能删除超级管理员） */
  removeAdmin: (id: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// ============== localStorage 工具函数 ==============

/** 从 localStorage 读取已登录用户 */
function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("vocabulary-admin-user")
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/** 从 localStorage 读取所有已注册用户 */
function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem("vocabulary-admin-users")
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/** 保存已注册用户列表 */
function saveUsers(users: StoredUser[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("vocabulary-admin-users", JSON.stringify(users))
}

/** 设置登录 cookie */
function setAuthCookie() {
  document.cookie = "vocabulary-admin-auth=1; path=/; max-age=86400; SameSite=Lax"
}

/** 移除登录 cookie */
function removeAuthCookie() {
  document.cookie = "vocabulary-admin-auth=; path=/; max-age=0"
}

/**
 * 认证上下文提供者
 * 目前使用 localStorage 模拟后端认证，后续接入 Supabase 后替换
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false)

  // 页面加载时恢复登录状态，同时检查是否已有超级管理员
  useEffect(() => {
    const storedUser = getStoredUser()
    const allUsers = getStoredUsers()
    setUser(storedUser)
    setHasSuperAdmin(allUsers.some((u) => u.role === "超级管理员"))
    setIsLoading(false)
  }, [])

  // 登录
  const signIn = async (email: string, password: string) => {
    const users = getStoredUsers()
    const found = users.find((u) => u.email === email && u.password === password)

    if (!found) {
      return { success: false, error: "邮箱或密码错误" }
    }

    const loggedInUser: AdminUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      createdAt: found.createdAt,
    }
    localStorage.setItem("vocabulary-admin-user", JSON.stringify(loggedInUser))
    setAuthCookie()
    setUser(loggedInUser)
    return { success: true }
  }

  // 超级管理员首次注册（只能注册一次）
  const signUpSuperAdmin = async (name: string, email: string, password: string) => {
    const users = getStoredUsers()

    // 检查是否已有超级管理员
    if (users.some((u) => u.role === "超级管理员")) {
      return { success: false, error: "超级管理员已存在，无法重复注册" }
    }

    if (users.find((u) => u.email === email)) {
      return { success: false, error: "该邮箱已被注册" }
    }

    const newSuperAdmin: StoredUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role: "超级管理员",
      createdAt: new Date().toISOString().slice(0, 10),
    }

    users.push(newSuperAdmin)
    saveUsers(users)

    // 注册成功后自动登录
    const loggedInUser: AdminUser = {
      id: newSuperAdmin.id,
      name: newSuperAdmin.name,
      email: newSuperAdmin.email,
      role: newSuperAdmin.role,
      createdAt: newSuperAdmin.createdAt,
    }
    localStorage.setItem("vocabulary-admin-user", JSON.stringify(loggedInUser))
    setAuthCookie()
    setUser(loggedInUser)
    setHasSuperAdmin(true)
    return { success: true }
  }

  // 退出登录
  const signOut = () => {
    localStorage.removeItem("vocabulary-admin-user")
    removeAuthCookie()
    setUser(null)
  }

  // 获取所有管理员（不含密码）
  const getAllAdmins = useCallback((): AdminUser[] => {
    return getStoredUsers().map(({ password: _, ...rest }) => rest)
  }, [])

  // 超级管理员添加普通管理员
  const addAdmin = async (name: string, email: string, password: string) => {
    const users = getStoredUsers()

    if (users.find((u) => u.email === email)) {
      return { success: false, error: "该邮箱已被注册" }
    }

    const newAdmin: StoredUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role: "普通管理员",
      createdAt: new Date().toISOString().slice(0, 10),
    }

    users.push(newAdmin)
    saveUsers(users)
    return { success: true }
  }

  // 删除管理员（不能删除超级管理员）
  const removeAdmin = (id: string) => {
    const users = getStoredUsers()
    const target = users.find((u) => u.id === id)
    if (!target || target.role === "超级管理员") return

    const filtered = users.filter((u) => u.id !== id)
    saveUsers(filtered)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        hasSuperAdmin,
        signIn,
        signUpSuperAdmin,
        signOut,
        getAllAdmins,
        addAdmin,
        removeAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/** 获取认证上下文的自定义 Hook */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内部使用")
  }
  return context
}