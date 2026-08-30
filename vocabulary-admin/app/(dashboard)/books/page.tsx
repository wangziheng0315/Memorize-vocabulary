"use client"

import { useState } from "react"
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

/** 单词书数据结构 */
interface Book {
  id: string
  name: string
  description: string
  wordCount: number
  createdAt: string
}

/** 模拟初始数据 */
const initialBooks: Book[] = [
  {
    id: "1",
    name: "四级核心词汇",
    description: "大学英语四级考试高频词汇",
    wordCount: 2500,
    createdAt: "2026-08-01",
  },
  {
    id: "2",
    name: "六级核心词汇",
    description: "大学英语六级考试高频词汇",
    wordCount: 1800,
    createdAt: "2026-08-15",
  },
  {
    id: "3",
    name: "考研英语词汇",
    description: "考研英语必备词汇",
    wordCount: 3500,
    createdAt: "2026-08-20",
  },
]

/**
 * 单词书管理页面
 * 支持单词书的创建、编辑、删除、搜索
 */
export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [searchKeyword, setSearchKeyword] = useState("")

  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null)

  // 表单状态
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formWordCount, setFormWordCount] = useState(0)

  // 搜索过滤
  const filteredBooks = books.filter(
    (book) =>
      book.name.includes(searchKeyword) ||
      book.description.includes(searchKeyword)
  )

  // 打开新增弹窗
  const openCreateDialog = () => {
    setEditingBook(null)
    setFormName("")
    setFormDescription("")
    setFormWordCount(0)
    setDialogOpen(true)
  }

  // 打开编辑弹窗
  const openEditDialog = (book: Book) => {
    setEditingBook(book)
    setFormName(book.name)
    setFormDescription(book.description)
    setFormWordCount(book.wordCount)
    setDialogOpen(true)
  }

  // 保存（新增或编辑）
  const handleSave = () => {
    if (!formName.trim()) return

    if (editingBook) {
      setBooks(
        books.map((b) =>
          b.id === editingBook.id
            ? { ...b, name: formName, description: formDescription, wordCount: formWordCount }
            : b
        )
      )
    } else {
      const newBook: Book = {
        id: crypto.randomUUID(),
        name: formName,
        description: formDescription,
        wordCount: formWordCount,
        createdAt: new Date().toISOString().slice(0, 10),
      }
      setBooks([...books, newBook])
    }

    setDialogOpen(false)
  }

  // 删除单词书
  const handleDelete = () => {
    if (!deleteTarget) return
    setBooks(books.filter((b) => b.id !== deleteTarget.id))
    setDeleteTarget(null)
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

      {/* 搜索栏 + 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索单词书名称或描述..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-10 pl-9 border-none bg-transparent"
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
              <p className="text-2xl font-bold">{filteredBooks.length}</p>
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
                <TableHead className="w-[200px]">名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="w-[100px]">单词数</TableHead>
                <TableHead className="w-[120px]">创建日期</TableHead>
                <TableHead className="w-[100px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.length === 0 ? (
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
                    <TableCell className="font-medium">{book.name}</TableCell>
                    <TableCell className="text-muted-foreground">{book.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {book.wordCount.toLocaleString()} 词
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {book.createdAt}
                    </TableCell>
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
                          onClick={() => setDeleteTarget(book)}
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
              <Label htmlFor="bookName">名称</Label>
              <Input
                id="bookName"
                placeholder="如：四级核心词汇"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookDesc">描述</Label>
              <Input
                id="bookDesc"
                placeholder="如：大学英语四级考试高频词汇"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wordCount">单词数量</Label>
              <Input
                id="wordCount"
                type="number"
                placeholder="0"
                value={formWordCount}
                onChange={(e) => setFormWordCount(Math.max(0, Number(e.target.value) || 0))}
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {editingBook ? "保存修改" : "创建"}
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
              确定要删除单词书「{deleteTarget?.name}」吗？此操作不可撤销。
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