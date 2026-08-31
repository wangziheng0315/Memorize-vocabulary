// postgres：负责建立和管理与 PostgreSQL 数据库的 TCP 连接
import postgres from "postgres"
// drizzle：Drizzle ORM 的核心，把数据库连接包装成可操作的 db 对象
import { drizzle } from "drizzle-orm/postgres-js"

// 从 .env 文件读取数据库连接地址（如 postgresql://user:password@host:5432/dbname）
const connectionString = process.env.DATABASE_URL

// 如果 .env 里没有配置 DATABASE_URL，直接报错，避免后续操作失败
if (!connectionString) {
  throw new Error("缺少 DATABASE_URL 环境变量")
}

// 用连接字符串创建数据库客户端（相当于"拨通电话"）
const client = postgres(connectionString)

// 把客户端交给 Drizzle 包装，导出 db 对象
// 之后所有数据库操作（查询、插入、更新、删除）都通过这个 db 对象进行
export const db = drizzle(client)
