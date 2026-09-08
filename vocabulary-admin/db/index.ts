// postgres：负责建立和管理与 PostgreSQL 数据库的 TCP 连接
import postgres from "postgres"
// drizzle：Drizzle ORM 的核心，把数据库连接包装成可操作的 db 对象
import { drizzle } from "drizzle-orm/postgres-js"

/**
 * 懒加载数据库连接——只在第一次调用 db 方法时才初始化。
 *
 * 这样做的原因是：next build 构建时会预加载所有 API 路由模块，
 * 如果模块加载时就检查 DATABASE_URL，构建时 .env 还没加载好就会报错。
 * 改成懒加载后，只有真正请求 API 时才会去读 .env 初始化连接。
 */
function createLazyDb() {
  let _db: ReturnType<typeof drizzle> | null = null

  return new Proxy({} as ReturnType<typeof drizzle>, {
    get(_, prop) {
      if (!_db) {
        const connectionString = process.env.DATABASE_URL
        if (!connectionString) {
          throw new Error("缺少 DATABASE_URL 环境变量")
        }
        const client = postgres(connectionString)
        _db = drizzle(client)
      }
      return (_db as unknown as Record<PropertyKey, unknown>)[prop]
    },
  })
}

// 保持导出方式不变，其他文件还是 import { db } from "@/db"
export const db = createLazyDb()
