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
import { Plus, UserX, UserCheck, Shield, Mail, Lock, User, Pencil, ArrowRightLeft } from "lucide-react"

/**
 * 管理员管理页面
 * 系统管理员可以添加和删除普通管理员
 */
export default function AdminUsersPage() {
  const { user, getAllAdmins, addAdmin, updateAdmin, removeAdmin, setAdminStatus, refreshUser } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[]>([])

  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [transferTarget, setTransferTarget] = useState<AdminUser | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)

  // 表单状态
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState<AdminRole>("普通管理员")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 按角色优先级排序：系统管理员 → 超级管理员 → 普通管理员
  const roleOrder: Record<AdminRole, number> = { "系统管理员": 0, "超级管理员": 1, "普通管理员": 2 }
  const sortAdmins = (list: AdminUser[]) => [...list].sort((a, b) => roleOrder[a.role] - roleOrder[b.role])

  // 加载管理员列表
  useEffect(() => {
    getAllAdmins().then((list) => setAdmins(sortAdmins(list)))
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
      getAllAdmins().then((list) => setAdmins(sortAdmins(list)))
      setDialogOpen(false)
    } else {
      setFormError(result.error || (editingAdmin ? "保存失败" : "添加失败"))
    }
  }

  // 回收管理员：保留账号记录，但立即禁止登录
  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = await removeAdmin(deleteTarget.id)
    if (result.success) getAllAdmins().then((list) => setAdmins(sortAdmins(list)))
    else setFormError(result.error || "回收失败")
    setDeleteTarget(null)
  }

  // 恢复已回收账号，使管理员可以重新登录
  const handleRestore = async (admin: AdminUser) => {
    const result = await setAdminStatus(admin.id, "启用")
    if (result.success) getAllAdmins().then((list) => setAdmins(sortAdmins(list)))
    else setFormError(result.error || "恢复失败")
  }

  // 转让系统管理员权限
  const handleTransfer = async () => {
    if (!transferTarget) return
    setIsTransferring(true)
    const result = await updateAdmin(transferTarget.id, { role: "系统管理员" })
    setIsTransferring(false)
    if (result.success) {
      await refreshUser() // 立即刷新当前用户角色，避免页面显示过期信息
      getAllAdmins().then((list) => setAdmins(sortAdmins(list)))
    } else {
      setFormError(result.error || "转让失败")
    }
    setTransferTarget(null)
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
                <TableHead className="w-[90px]">状态</TableHead>
                <TableHead className="w-[120px]">添加日期</TableHead>
                <TableHead className="w-[80px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    暂无管理员
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => {
                  const isSystemAdmin = admin.role === "系统管理员"
                  const isSelf = user?.id === admin.id
                  const isDisabled = admin.status === "禁用"
                  const canManageTarget = user?.role === "系统管理员" ||
                    (user?.role === "超级管理员" && admin.role === "普通管理员")
                  return (
                    <TableRow key={admin.id} className={isDisabled ? "opacity-60" : undefined}>
                      <TableCell>
                        <Avatar className="size-8 ring-2 ring-border/50">
                          <AvatarFallback
                            className={`text-xs font-medium ${
                              isSystemAdmin
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
                          variant={isSystemAdmin ? "default" : "secondary"}
                          className="font-normal"
                        >
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isDisabled ? "outline" : "secondary"} className="font-normal">
                          {admin.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(admin.createdAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {user?.role === "系统管理员" && !isSelf && !isDisabled && (
                          <Button variant="ghost" size="icon-xs" onClick={() => setTransferTarget(admin)} title="转让系统管理员权限">
                            <ArrowRightLeft className="size-3.5" />
                          </Button>
                        )}
                        {canManageTarget && !isDisabled && (
                          <Button variant="ghost" size="icon-xs" onClick={() => openEditDialog(admin)} title="编辑管理员">
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {canManageTarget && !isSelf && !isSystemAdmin && (
                          isDisabled ? (
                            <Button variant="ghost" size="icon-xs" onClick={() => handleRestore(admin)} title="恢复账号">
                              <UserCheck className="size-3.5 text-green-600" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(admin)} title="回收账号">
                              <UserX className="size-3.5 text-red-500" />
                            </Button>
                          )
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
            <DialogTitle>{editingAdmin ? "编辑管理员" : "添加管理员"}</DialogTitle>
            <DialogDescription>
              {editingAdmin ? "修改管理员信息，密码留空表示不修改" : "填写新管理员的信息，创建后即可登录后台"}
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
              {editingAdmin?.role === "系统管理员" ? (
                <Input id="adminRole" value="系统管理员" disabled />
              ) : (
                <select
                  id="adminRole"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as AdminRole)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={user?.role !== "系统管理员"}
                >
                  <option value="普通管理员">普通管理员</option>
                  {user?.role === "系统管理员" && <option value="超级管理员">超级管理员</option>}
                </select>
              )}
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
              {isSubmitting ? (editingAdmin ? "保存中..." : "添加中...") : (editingAdmin ? "保存" : "添加")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 转让确认弹窗 */}
      <AlertDialog open={!!transferTarget} onOpenChange={() => setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认转让系统管理员权限</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将系统管理员权限转让给「{transferTarget?.name}」吗？转让后，你将自动降级为超级管理员。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer} disabled={isTransferring}>
              {isTransferring ? "转让中..." : "确认转让"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 账号回收确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认回收账号</AlertDialogTitle>
            <AlertDialogDescription>
              回收管理员「{deleteTarget?.name}」后，该账号会立即退出登录并禁止再次登录，但账号记录会保留，之后可以恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              确认回收
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}