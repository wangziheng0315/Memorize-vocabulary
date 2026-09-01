# Memorize vocabulary

next.js 单词后台管理系统和h5应用开发

## 应用形式
- 后台管理系统
- h5 应用
- 多段开发(pc端、移动端)

## 亮点
- 数据清洗 
  在github上 找到了一个 高星的 单词资料库
  数据清洗 (选择、格式化、审核)
- supabase 云端数据库（PostgreSQL）
  关系型数据库（支持通过 pgvector 扩展做向量存储）
  - 云端 BaaS 平台
    Backend as a Service，提供数据库、认证、存储等后端服务
  - 详见下方 [Supabase](#supabase) 章节
- ORM（对象关系映射）
  不用写 SQL，用代码操作数据库
  - 例如：`todos.save()` 就可以把对象保存到数据库
  - 本质：将代码里的对象和数据库里的一条记录对应起来
  - 详见下方 [ORM（Drizzle）](#ormdrizzle) 章节

## 后台管理系统

### 创建项目

```bash
npx create-next-app@latest
```

配置选项：

- 项目名：`vocabulary-admin`
- TypeScript：是
- 代码检查：ESLint
- React Compiler：否
- Tailwind CSS：是
- `src/` 目录：否
- App Router：是
- 自定义 import 别名：否
- AGENTS.md：是

### 单词书管理
维护单词书，包括单词书的创建、删除、更新、查询等操作
交给管理员去做 
### 管理员管理

- 首次使用时注册一个系统管理员账号，系统管理员拥有最高管理权限
- 系统管理员可以继续添加其他管理员

第一次访问 `/` → 注册系统管理员 → 自动登录 → 进入单词书管理。

已经存在管理员时访问 `/` → 进入登录页 → 登录成功后进入单词书管理。

#### 管理员账号与登录会话

管理员登录功能主要使用两张数据库表：

- `admin-users`：管理员账号表，保存管理员姓名、邮箱、密码哈希、角色和创建时间等信息。密码只保存经过加密处理的哈希值，不保存用户输入的明文密码。
- `admin-session`：管理员登录会话表，记录哪位管理员已经登录、登录令牌的哈希值以及会话过期时间。浏览器 Cookie 保存原始令牌，数据库只保存令牌哈希，避免数据库泄露后令牌被直接用于登录。

登录判断流程：

1. 管理员提交邮箱和密码，服务端统一将邮箱去除首尾空格并转换为小写。
2. 服务端根据邮箱查询 `admin-users`，再校验输入密码与数据库中的密码哈希是否匹配。
3. 校验成功后生成随机登录令牌，在 `admin-session` 中保存令牌哈希，并将原始令牌写入浏览器的 HttpOnly Cookie。
4. 管理员再次访问后台时，服务端读取 Cookie，将令牌计算成哈希后查询 `admin-session`。
5. 如果会话存在、尚未过期，并且能通过 `adminId` 找到对应管理员，则判定为已登录；否则要求重新登录。
6. 登录成功后，再通过 `admin-users.role` 判断管理员可以使用哪些功能。

可以简单理解为：`admin-users` 负责保存“你是谁、密码、角色和账号状态”，`admin-session` 负责判断“你现在是否处于有效登录状态”。

账号回收采用“软回收”：系统不会删除 `admin-users` 中的账号记录，而是将状态改为“禁用”，并删除该账号在 `admin-session` 中的全部登录会话。这样账号会立即退出、无法再次登录，但历史记录仍然保留。管理员可以在列表中恢复账号；恢复后状态变为“启用”，即可重新登录。

### shadcn/ui UI 组件库

- 80% 前端组件业务趋同，不用重复造轮子，选用第三方组件库
- 对比 element-ui / ANT Design：功能强大但不够灵活
- shadcn/ui 的优势：
  - 定制性很好，和 Tailwind CSS 配合使用
  - 语义化，对 AI 友好
  - 按需加载，不打包冗余代码
- 目录在 `components/ui` 目录下
### vibe coding

```
基于shadcn/ui 和 tailwindcss ，实现一个管理后台的UI界面，要求以下几个页面： 
 1. / ：如果用户已登录，跳转到 /books 页面，如果用户没有登录，跳转到 /sigin  
 2. /signup ： 系统管理员注册功能，可以输入姓名、邮箱、密码、确认密码。 
 3. /signin : 管理员的登录页，输入邮箱和密码登录 
 4. /books: 单词书管理 
 5. /admin-users : 管理员管理 
 单词书管理和管理员管理页面要求登陆后才能查看，并显示对应的侧边栏。侧边栏底部显示用户邮箱+退出登陆icon
```

基于以上 prompt，实现了 5 个页面 + 侧边栏布局 + 登录守卫 + 系统管理员初始化注册（仅一次）。
后续优化：页面配色、弹窗样式、button 嵌套修复、管理逻辑调整为系统管理员添加普通管理员。

## Supabase

BaaS 数据库云服务（Backend as a Service），提供数据库、认证、存储等后端服务。

- 性能、安全、可扩展性、部署成本几乎为 0
- 底层是 PostgreSQL 关系型数据库，同时支持通过 pgvector 扩展做向量存储（embedding）
- 不需要自己搭服务器、装数据库、配网络，Supabase 已经帮你搞定

### DATABASE_URL 解析

连接数据库的地址写在 `.env` 文件中，格式如下：

```
DATABASE_URL=postgresql://postgres.xxxxx:密码@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

拆开来看：

- `postgresql://`：协议，表示连接的是 PostgreSQL 数据库
- `postgres.xxxxx`：数据库用户名，`xxxxx` 是 Supabase 项目 ID
- `:密码`：数据库密码，注意密码中如果包含 `@`、`#`、`:` 等特殊字符需要 URL 编码
- `@`：分隔符，后面是数据库服务器地址
- `aws-0-ap-southeast-1.pooler.supabase.com`：数据库服务器地址，`ap-southeast-1` 表示新加坡机房
- `:5432`：端口号，PostgreSQL 默认端口
- `/postgres`：数据库名，Supabase 默认数据库名

### 直连 vs Session Pooler（会话连接池）

Supabase 提供两种连接数据库的方式：

**直连（Direct Connection）**

- 地址格式：`postgresql://postgres:密码@db.xxxxx.supabase.co:5432/postgres`
- 应用直接连到数据库服务器，中间没有中转
- 缺点：某些网络环境不支持 IPv6 会连不上；应用创建大量连接时可能超过数据库连接数限制

**Session Pooler（会话连接池）**

- 地址格式：`postgresql://postgres.xxxxx:密码@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
- 应用先连到 Supabase 的连接池服务器，再由连接池统一管理到数据库的连接
- 优点：解决 IPv4/IPv6 兼容问题；避免连接数过多；更适合 Next.js 和 Serverless 部署
- 注意：用户名中需要加上项目 ID（如 `postgres.enzmdgsxvoyhgawnknyn`），不是单纯的 `postgres`

**如何切换？** 在 Supabase 控制台 → Project Settings → Database → Connection string 中选择对应类型，复制连接字符串，替换 `.env` 中的 `DATABASE_URL`。

**修改 .env 后必须重启开发服务器**，因为 Next.js 在启动时读取环境变量，运行中修改不会生效。

### RLS 行级安全策略

RLS（Row Level Security）是 PostgreSQL 的一种安全机制，可以控制"谁能看到/修改表中的哪些数据行"。

- 普通数据库权限：决定"这个用户能不能访问这张表"
- RLS：进一步决定"这个用户能访问这张表中的**哪些行**"

例如：用户 A 只能看到自己的单词记录，管理员可以看到全部。

**Create Trigger（自动启用 RLS）**

在 Supabase 控制台可以设置一个触发器：以后每次新建数据表时，自动开启 RLS。

- 开启后：新建的表会自动打开 RLS 开关
- 不会影响：已经存在的旧表不会被自动修改
- 需要注意：自动开启 RLS 只是打开"安全开关"，并没有自动创建访问规则。如果需要通过 Supabase 客户端访问新表，还要为该表配置 RLS Policy（策略）
- 当前项目使用 Next.js 服务端 + Drizzle ORM 直接操作数据库，不依赖 Supabase 客户端，所以 RLS 不影响现有功能

## ORM（Drizzle）

> 给该 Next.js 项目，安装并引入 Drizzle ORM 的相关依赖和配置，我需要集成我的 Supabase 的数据库。
> 我已经在项目中创建了 `.env` 文件，并且设置了 `DATABASE_URL` 环境变量。
> 注意：只安装依赖并引入相关配置，不要给我默认创建额外的表。

- Supabase 数据库已在云端创建，连接地址写在 `.env` 的 `DATABASE_URL` 中
- Drizzle 通过 `.env` 连接数据库，接手所有数据库操作

### 为什么需要 ORM

- 两种语言的鸿沟：
  - Next.js 用的是 TypeScript，属于**高级语言**（贴近人类思维，用对象和类来组织代码）
  - 数据库只懂 SQL（如 `SELECT`、`INSERT`），属于**低级语言**（贴近机器，人类直接读写很费劲）
  - 两者之间天然存在一道鸿沟，你不可能在代码里直接写 SQL 字符串，又麻烦又容易出错

- 面向对象映射 —— 填平鸿沟的桥梁：
  - 数据库里的一张表 → 代码里的一个类（Class，即一张"图纸"）
  - 表里的一行数据 → 代码里的一个对象（即按图纸造出来的"实例"）
  - 例如：`user.save()` 这行代码，Drizzle 自动翻译成 `INSERT INTO users ...` 发给数据库
  - 本质：你在代码里操作对象，Drizzle 在背后帮你翻译成 SQL，结果再翻译回对象还给你

### Schema 与迁移

- 不需要手动建表：
  - 在代码里定义 schema（表结构，描述表有哪些字段、什么类型）
  - 通过 `migrate`（数据表迁移）自动在数据库里创建对应的表
  - 你只管写代码，表结构 Drizzle 帮你同步到数据库

> 安装 Drizzle ORM 依赖并配置 `.env` 连接 Supabase，未创建任何数据表，仅完成基础集成。

### 项目结构与命令

Drizzle 在项目中的文件结构以及配套的常用命令。

#### 项目目录

- `db/index.ts`：数据库连接配置
  - 读取 `.env` 中的 `DATABASE_URL`，连接 Supabase 数据库
  - 导出 `db` 对象，之后所有数据库操作（查询、插入、更新、删除）都通过它进行
- `db/schema.ts`：数据库表结构定义
  - 用代码描述表有哪些字段、什么类型、什么约束
  - 一个表对应一个 Drizzle 对象定义

#### 配套命令

- `db:generate`：生成数据库迁移文件
  - 对比 `schema.ts` 和当前数据库状态，生成 SQL 迁移文件到 `drizzle/` 目录
  - 用于加表、改字段、添索引等操作
- `db:migrate`：执行数据库迁移
  - 将 `drizzle/` 目录中的迁移文件应用到数据库
  - 会在数据库中创建或修改对应的表
- `db:push`：直接推送表结构到数据库
  - 将 `schema.ts` 的表结构直接同步到数据库，跳过生成迁移文件
  - 适合开发阶段快速调试，生产环境建议用 `generate` + `migrate`
- `db:studio`：数据库可视化工具
  - 在浏览器中打开可视化界面，查看表结构和数据
  - 可以手动增删改查数据，方便开发调试

#### 迁移是什么（用白话理解）

迁移（migration）就是把代码中定义的表结构，真正创建到数据库里。

用盖房子来比喻：

- `schema.ts`：设计图，描述表有哪些字段、什么类型
- `db:generate`：根据设计图，生成施工方案（SQL 迁移文件，保存在 `drizzle/` 目录）
- `db:migrate`：按照施工方案，在数据库里真正建表
- Supabase 中的表：最终建好的房子

**什么时候需要重新执行迁移？** 只有修改了 `db/schema.ts`（比如加字段、改类型、新增表）时才需要。单纯修改 `.env` 更换数据库连接地址，不需要重新迁移，因为连接的是同一个数据库，表和数据都还在。

## git 提交

可以在编译器的源代码管理中提交代码。

`feat:完成前端UI开发` 使用的是 **Conventional Commits（约定式提交）** 风格。`feat` 表示新增功能，冒号后面是本次提交内容的简短说明。

常见类型还有：

- `fix`：修复问题
- `docs`：修改文档
- `style`：调整样式
- `refactor`：重构代码
- `test`：添加测试
- `chore`：架构变更

建议冒号后加空格：`feat: 完成前端 UI 开发`。


   
