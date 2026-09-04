import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { books, words } from "@/db/schema"
import { getCurrentAdmin } from "@/lib/admin-auth"

/** 所有管理员都能管理单词书，只需要检查是否已登录。 */
async function requireLogin() {
  const current = await getCurrentAdmin()
  if (!current) return null
  return current
}

/** 查询所有单词书，按创建时间排序。 */
export async function GET() {
  const current = await requireLogin()
  if (!current) return NextResponse.json({ error: "请先登录" }, { status: 401 })
  const result = await db.select().from(books).orderBy(books.createdAt)
  return NextResponse.json({ books: result })
}

/** 新增单词书。 */
export async function POST(request: Request) {
  const current = await requireLogin()
  if (!current) return NextResponse.json({ error: "请先登录" }, { status: 401 })

  const body = await request.json()
  const title = String(body.title ?? "").trim()
  const bookId = String(body.bookId ?? "").trim()
  const wordCount = Number(body.wordCount ?? 0)
  const coverUrl = String(body.coverUrl ?? "").trim()
  const tags = String(body.tags ?? "").trim()

  if (!title) return NextResponse.json({ error: "标题不能为空" }, { status: 400 })
  if (!bookId) return NextResponse.json({ error: "bookId 不能为空" }, { status: 400 })

  // 检查 bookId 是否已存在
  const existing = await db.select().from(books).where(eq(books.bookId, bookId)).limit(1)
  if (existing.length > 0) {
    return NextResponse.json({ error: "该 bookId 已存在" }, { status: 409 })
  }

  const [created] = await db.insert(books).values({
    title,
    bookId,
    wordCount: Math.max(0, wordCount),
    coverUrl: coverUrl || null,
    tags: tags || null,
  }).returning()

  return NextResponse.json({ book: created }, { status: 201 })
}

/** 编辑单词书。 */
export async function PATCH(request: Request) {
  const current = await requireLogin()
  if (!current) return NextResponse.json({ error: "请先登录" }, { status: 401 })

  const body = await request.json()
  const id = String(body.id ?? "").trim()
  const title = String(body.title ?? "").trim()
  const bookId = String(body.bookId ?? "").trim()
  const wordCount = Number(body.wordCount ?? 0)
  const coverUrl = String(body.coverUrl ?? "").trim()
  const tags = String(body.tags ?? "").trim()

  if (!id) return NextResponse.json({ error: "缺少单词书 id" }, { status: 400 })
  if (!title) return NextResponse.json({ error: "标题不能为空" }, { status: 400 })
  if (!bookId) return NextResponse.json({ error: "bookId 不能为空" }, { status: 400 })

  // 检查 bookId 是否被其他单词书占用
  const existing = await db.select().from(books).where(eq(books.bookId, bookId)).limit(1)
  if (existing.length > 0 && existing[0].id !== id) {
    return NextResponse.json({ error: "该 bookId 已被其他单词书使用" }, { status: 409 })
  }

  const [updated] = await db.update(books)
    .set({
      title,
      bookId,
      wordCount: Math.max(0, wordCount),
      coverUrl: coverUrl || null,
      tags: tags || null,
      updatedAt: new Date(),
    })
    .where(eq(books.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "单词书不存在" }, { status: 404 })
  return NextResponse.json({ book: updated })
}

/** 删除单词书，同时删除该单词书关联的所有单词数据。 */
export async function DELETE(request: Request) {
  const current = await requireLogin()
  if (!current) return NextResponse.json({ error: "请先登录" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "缺少单词书 id" }, { status: 400 })

  // 先查出单词书，获取 bookId
  const [book] = await db.select({ bookId: books.bookId }).from(books).where(eq(books.id, id)).limit(1)
  if (!book) return NextResponse.json({ error: "单词书不存在" }, { status: 404 })

  // 使用事务：先删除关联的单词，再删除单词书，保证数据一致性
  await db.transaction(async (tx) => {
    await tx.delete(words).where(eq(words.bookId, book.bookId))
    await tx.delete(books).where(eq(books.id, id))
  })

  return NextResponse.json({ success: true })
}