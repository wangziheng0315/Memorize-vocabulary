"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth, type AdminUser, type AdminRole } from "@/lib/auth-context"
import { Plus, Trash2, Shield, Mail, Lock, User, Pencil } from "lucide-react"

/**
 * 管理员管理页面
 * 系统管理员可以添加和删除普通管理员
 */
export default function AdminUsersPage() {
  const { user, getAllAdmins, addAdmin, updateAdmin, removeAdmin } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[]>([])

  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  // 表单状态
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState<AdminRole>("普通管理员")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载管理员列表
  useEffect(() => {
    getAllAdmins().then(setAdmins)
  }, [getAllAdmins])

  // 获取姓名首字母
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase()

  // 打开新增弹窗
  const openCreateDialog = () => {
    setEditingAdmin(null)
    setFormName("")
    setFormEmail("")
    setFormPassword("")
    setFormRole("普通管理员")
    setFormError("")
    setDialogOpen(true)
  }

  const openEditDialog = (admin: AdminUser) => {
    setEditingAdmin(admin)
    setFormName(admin.name)
    setFormEmail(admin.email)
    setFormPassword("")
    setFormRole(admin.role)
    setFormError("")
    setDialogOpen(true)
  }

  // 添加管理员
  const handleAdd = async () => {
    setFormError("")

    if (!formName.trim() || !formEmail.trim() || (!editingAdmin && !formPassword.trim())) {
      setFormError("请填写所有字段")
      return
    }

    if (formPassword && formPassword.length < 6) {
      setFormError("密码至少需要 6 个字符")
      return
    }

    setIsSubmitting(true)
    const result = editingAdmin
      ? await updateAdmin(editingAdmin.id, { name: formName, email: formEmail, role: formRole, ...(formPassword ? { password: formPassword } : {}) })
      : await addAdmin(formName, formEmail, formPassword, formRole)
    setIsSubmitting(false)

    if (result.success) {
      getAllAdmins().then(setAdmins)
      setDialogOpen(false)
    } else {
      setFormError(result.error || (editingAdmin ? "保存失败" : "添加失败"))
    }
  }

  // 删除管理员
  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = await removeAdmin(deleteTarget.id)
    if (result.success) getAllAdmins().then(setAdmins)
    else setFormError(result.error || "删除失败")
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">管理员管理</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">管理系统管理员账号</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          添加管理员
        </Button>
      </div>

      {/* 管理员列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">管理员列表</CardTitle>
          <CardDescription>共 {admins.length} 位管理员</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead className="w-[120px]">角色</TableHead>
                <TableHead className="w-[120px]">添加日期</TableHead>
                <TableHead className="w-[80px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    暂无管理员
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => {
                  const isSuper = admin.role === "系统管理员"
                  const isSelf = user?.id === admin.id
                  return (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <Avatar className="size-8 ring-2 ring-border/50">
                          <AvatarFallback
                            className={`text-xs font-medium ${
                              isSuper
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {getInitials(admin.name)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {admin.name}
                        {isSelf && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground">（我）</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={isSuper ? "default" : "secondary"}
                          className="font-normal"
                        >
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {admin.createdAt}
                      </TableCell>
                      <TableCell className="text-right">
                        {((user?.role === "系统管理员") ||
                          (user?.role === "超级管理员" && admin.role === "普通管理员")) && (
                          <Button variant="ghost" size="icon-xs" onClick={() => openEditDialog(admin)} title="编辑管理员">
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {user?.role !== "普通管理员" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteTarget(admin)}
                            disabled={isSuper || isSelf || (user?.role === "超级管理员" && admin.role !== "普通管理员")}
                            title={isSuper ? "系统管理员不可删除" : isSelf ? "不能删除自己" : "删除"}
                          >
                            <Trash2 className={`size-3.5 ${isSuper || isSelf ? "text-muted-foreground/30" : "text-red-500"}`} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 添加管理员弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加管理员</DialogTitle>
            <DialogDescription>
              填写新管理员的信息，创建后即可登录后台
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="adminName">姓名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="adminName"
                  placeholder="请输入姓名"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder={editingAdmin ? "留空表示不修改" : "至少 6 个字符"}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminRole">角色</Label>
              <select
                id="adminRole"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as AdminRole)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={user?.role !== "系统管理员" || editingAdmin?.id === user?.id}
              >
                <option value="普通管理员">普通管理员</option>
                <option value="超级管理员">超级管理员</option>
                <option value="系统管理员">系统管理员</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isSubmitting || !formName.trim() || !formEmail.trim() || (!editingAdmin && !formPassword.trim())}
            >
              {isSubmitting ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除管理员「{deleteTarget?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}