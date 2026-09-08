"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
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
import { Plus, Pencil, Trash2, BookOpen, Search, Library } from "lucide-react"

/** 单词书数据结构（与后端返回一致） */
interface Book {
  id: string
  title: string
  wordCount: number
  coverUrl: string | null
  bookId: string
  tags: string | string[] | null
  createdAt: string
  updatedAt: string
}

/** 前端表单字段（wordCount 用字符串避免输入框显示 0 的问题） */
interface BookForm {
  title: string
  wordCount: string
  coverUrl: string
  bookId: string
  tags: string
}

/** 空白表单初始值 */
const emptyForm: BookForm = {
  title: "",
  wordCount: "",
  coverUrl: "",
  bookId: "",
  tags: "",
}

/**
 * 单词书管理页面
 * 通过 API 与服务端通信，支持单词书的创建、编辑、删除、搜索
 */
export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState("")

  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // 表单状态
  const [form, setForm] = useState<BookForm>(emptyForm)

  /** 从服务端加载单词书列表 */
  const loadBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/books")
      const data = await res.json()
      if (res.ok) {
        setBooks(data.books ?? [])
      }
    } catch {
      // 网络错误时保持当前列表
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(loadBooks) }, [loadBooks])

  // 搜索过滤
  const filteredBooks = books.filter(
    (book) =>
      book.title.includes(searchKeyword) ||
      (book.bookId && book.bookId.includes(searchKeyword)) ||
      (book.tags && book.tags.includes(searchKeyword))
  )

  // 打开新增弹窗
  const openCreateDialog = () => {
    setEditingBook(null)
    setForm(emptyForm)
    setError("")
    setDialogOpen(true)
  }

  // 打开编辑弹窗
  const openEditDialog = (book: Book) => {
    setEditingBook(book)
    setForm({
      title: book.title,
      wordCount: String(book.wordCount),
      coverUrl: book.coverUrl ?? "",
      bookId: book.bookId,
      tags: Array.isArray(book.tags) ? book.tags.join(",") : (book.tags ?? ""),
    })
    setError("")
    setDialogOpen(true)
  }

  // 保存（新增或编辑）
  const handleSave = async () => {
    if (!form.title.trim()) return
    if (!form.bookId.trim()) return
    setSaving(true)
    setError("")

    try {
      const isEdit = !!editingBook
      const res = await fetch("/api/books", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit
          ? { id: editingBook.id, ...form, wordCount: Number(form.wordCount) || 0 }
          : { ...form, wordCount: Number(form.wordCount) || 0 }
        ),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "保存失败")
        return
      }
      setDialogOpen(false)
      // 重新加载列表
      await loadBooks()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  // 删除单词书
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/books?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? "删除失败，请稍后重试")
        return
      }
      setBooks((current) => current.filter((book) => book.id !== deleteTarget.id))
    } catch {
      setDeleteError("网络错误，请稍后重试")
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Library className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">单词书管理</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              管理所有单词书，支持创建、编辑和删除
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          新增单词书
        </Button>
      </div>
      {deleteError && <p role="alert" className="text-sm text-red-500">{deleteError}</p>}

      {/* 搜索栏 + 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索单词书名称、bookId 或标签..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
          </CardContent>
        </Card>
        {/* 统计卡片 */}
        <Card className="bg-primary/5 border-none">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{isLoading ? "..." : filteredBooks.length}</p>
              <p className="text-xs text-muted-foreground">单词书总数</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 单词书列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">单词书列表</CardTitle>
          <CardDescription>共 {filteredBooks.length} 本单词书</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px]">封面</TableHead>
                <TableHead>标题</TableHead>
                <TableHead className="w-[100px]">单词数</TableHead>
                <TableHead className="w-[160px]">bookId</TableHead>
                <TableHead className="w-[100px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <p className="text-sm text-muted-foreground">加载中...</p>
                  </TableCell>
                </TableRow>
              ) : filteredBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <BookOpen className="size-8 opacity-30" />
                      <p className="text-sm">暂无单词书</p>
                      <Button variant="outline" size="sm" onClick={openCreateDialog}>
                        <Plus className="size-3.5" />
                        创建第一本单词书
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBooks.map((book) => (
                  <TableRow key={book.id}>
                    {/* 封面 */}
                    <TableCell>
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="size-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded bg-muted">
                          <BookOpen className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    {/* 标题 + 标签 */}
                    <TableCell>
                      <div className="font-medium">{book.title}</div>
                      {book.tags && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {/* 兼容 tags 是字符串逗号分隔或数组两种情况 */}
                          {(Array.isArray(book.tags) ? book.tags : book.tags.split(",")).filter(Boolean).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs font-normal">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    {/* 单词数量 */}
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {book.wordCount.toLocaleString()} 词
                      </Badge>
                    </TableCell>
                    {/* bookId */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {book.bookId}
                    </TableCell>
                    {/* 操作 */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditDialog(book)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setDeleteError("")
                            setDeleteTarget(book)
                          }}
                        >
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBook ? "编辑单词书" : "新增单词书"}</DialogTitle>
            <DialogDescription>
              {editingBook ? "修改单词书的基本信息" : "填写单词书的基本信息"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bookTitle">标题 *</Label>
              <Input
                id="bookTitle"
                placeholder="如：人教版小学英语三年级上册"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookId">bookId *</Label>
              <Input
                id="bookId"
                placeholder="如：PEPXiaoXue3_1"
                value={form.bookId}
                onChange={(e) => setForm({ ...form, bookId: e.target.value })}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">与 words 表中单词的 bookId 对应，创建后不建议修改</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wordCount">单词数量</Label>
              <Input
                id="wordCount"
                type="number"
                placeholder="0"
                value={form.wordCount}
                onChange={(e) => setForm({ ...form, wordCount: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverUrl">封面 URL</Label>
              <Input
                id="coverUrl"
                placeholder="https://example.com/cover.jpg"
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input
                id="tags"
                placeholder="如：小学,英语,三年级"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="h-10"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || !form.bookId.trim() || saving}>
              {saving ? "保存中..." : editingBook ? "保存修改" : "创建"}
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
              确定要删除单词书「{deleteTarget?.title}」吗？相关联的所有单词数据也会被删除，此操作不可撤销。
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
