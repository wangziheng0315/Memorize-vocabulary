# Memorize vocabulary

Next.js 单词后台管理系统和 H5 应用开发

> 本 README 保留了项目从数据处理、Supabase、Drizzle 到前后端开发的完整记录；下面新增的“当前项目使用说明”和“交付检查”用于说明现在可以直接运行的 H5 学习应用。

## 当前项目使用说明

仓库包含两个相互配合的应用：`vocabulary-admin` 负责单词书和单词数据管理，`nextjs-typescript-starter` 是面向用户的 H5 背单词应用。H5 应用当前已经支持：

- 首页、我的两个底部 Tab，以及游客/登录两种首页状态。
- 从 `books` 表读取全部单词书；登录用户通过最近学习 API 查看最近 3 本书。
- 邮箱密码登录、注册、退出登录，以及登录后回跳到原学习页面。
- 以批次方式读取 `words` 表单词，点击“下一个”立即切换，并在服务端保存书级和单词级学习进度。
- 单词详情页按需读取完整 JSON；学习卡片和详情页支持有道英式/美式发音。

H5 应用的主要目录：

```text
nextjs-typescript-starter/
├─ app/page.tsx                         # 首页与单词书列表
├─ app/me/page.tsx                      # 我的、学习进度、退出登录
├─ app/study/[bookId]/                  # 学习页
├─ app/study/[bookId]/word/[wordId]/    # 单词详情页
├─ app/api/progress/recent/             # 最近学习 API
├─ app/actions/                         # 登录、注册、学习进度 Server Actions
├─ app/db.ts                            # Drizzle schema 与服务端查询
└─ migrations/                          # PostgreSQL 迁移脚本
```

H5 应用运行所需的环境变量：

| 变量 | 用途 |
|---|---|
| `POSTGRES_URL` | Supabase/PostgreSQL 连接串，服务端查询和迁移共用 |
| `AUTH_SECRET` | NextAuth 会话签名密钥，生产环境必须使用随机高强度值 |

文档中较早的 `DATABASE_URL` 内容是数据库连接方式的历史说明；当前 H5 代码和迁移脚本读取的是 `POSTGRES_URL`，部署时请以代码为准。

## 应用形式
- 后台管理系统
- H5 应用
- 多端开发（PC 端、移动端）

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

项目支持两种建表方式。管理员相关表采用第一种方式：先在代码中的 `db/schema.ts` 定义 schema（表结构），再通过 Drizzle 迁移命令将表结构同步到 Supabase 数据库。

- 在代码里定义 schema（表结构，描述表有哪些字段、什么类型）
- 通过 `db:generate` 生成迁移文件
- 通过 `db:migrate` 将表结构真正创建或修改到数据库

这种方式适合项目自身的业务表，可以让代码中的表结构和数据库保持一致。

> 本项目接入 Drizzle ORM 时，先完成依赖和数据库连接配置，之后根据管理员功能需要创建了对应的数据表。

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


   
## words 表数据
单词数据是背单词应用的核心内容。本节记录从原始数据到数据库导入的完整流程，以及 CSV 格式、数据清洗和 RLS 等配套说明。

### 数据处理流程

单词数据的整体处理路径：

1. 从 GitHub 下载单词资料库的 ZIP 压缩包，解压得到 JSON 文件。
2. 根据 JSON 数据结构设计 `words` 表，确定单词、释义、音标、例句等字段的保存方式。
3. 将 JSON 数据转换为 CSV 格式，再批量导入 Supabase 数据库。

完整流程可以概括为：

```text
GitHub 数据 → ZIP 压缩包 → JSON → Node.js 本地转换 → CSV → 导入 words 表
```

### 手动建表（第二种建表方式）

由于单词数据量较大、字段内容复杂，`words` 表不交给 AI 直接创建，而是采用第二种建表方式：先在 Supabase 控制台中手动创建 `words` 表，再将处理好的 CSV 数据导入这张表。这样可以在导入前直接确认字段名称、字段类型和主键设置，避免 AI 因为没有读取完整数据而设计错误的表结构。

CSV 文件只负责保存具体数据，不负责保存数据库结构。因此，手动建表时需要根据 CSV 表头创建对应字段：

| CSV 表头 | 数据库字段 | 类型 | 说明 |
|---|---|---|---|
| `wordRank` | `wordRank` | `integer` | 单词排序编号 |
| `headWord` | `headWord` | `text` | 单词本身 |
| `content` | `content` | `json` 或 `text` | 完整的单词数据（音标、例句、同义词等） |
| `bookId` | `bookId` | `text` | 所属单词书 ID |

其中 `content` 保存完整的 JSON 内容。如果按当前 CSV 原样导入，建议先使用 `text` 保存，后续再根据实际查询需求决定是否转换为 `jsonb`（`jsonb` 支持数据库内的 JSON 查询和索引，但导入时对格式要求更严格）。当前实际使用的是 `json` 类型，CSV 导入时 Supabase 会自动将 JSON 字符串解析为 JSON 对象。

手动建表并导入数据的流程如下：

```text
JSON 示例 → AI 根据少量示例生成转换脚本 → 本地生成 CSV
→ 在 Supabase 手动创建 words 表 → 将 CSV 数据导入 words 表
```

建表完成后，还需要在项目的 `db/schema.ts` 中定义对应的 Drizzle schema，这样代码才能通过 `db.select().from(words)` 的方式查询和操作 `words` 表的数据。具体操作方法见下方"让 AI 了解 Supabase 中已有表的表结构"章节。

### CSV 导入

当前已生成 Node.js 转换脚本：`vocabulary-admin/scripts/json2csv.mjs`。脚本会读取 `vocabulary-admin/temp/PEPXiaoXue3_1.json`，将数据转换为包含 `wordRank`、`headWord`、`content` 和 `bookId` 四列的 CSV 文件，并保存到 JSON 文件的相同目录下。其中，`content` 会作为 JSON 字符串保存在 CSV 单元格中。

运行命令：

```powershell
node "vocabulary-admin/scripts/json2csv.mjs"
```

数据生成 CSV 后，再按照 Supabase 导入页面的提示上传 CSV 文件。导入时第一行必须是表头，并且应上传 `.csv` 文件，不要直接上传原始 `.json` 文件。导入后建议在 Supabase 的 Table Editor 中确认数据行数是否与 CSV 中的数据条数一致。

### CSV 格式说明

CSV（Comma-Separated Values）是“逗号分隔值”文件格式，本质上是用纯文本保存表格数据。第一行通常是表头，表示字段名称，后面的每一行表示一条数据，每列对应一个字段。

当前生成的 CSV 包含 `wordRank`、`headWord`、`content` 和 `bookId` 四列。由于 `content` 中保存的是 JSON 字符串，内部可能包含逗号、双引号和换行，因此需要将整个内容放在双引号中；JSON 内部原有的双引号则转换为连续的两个双引号，避免 CSV 解析时出现列错位。

CSV 只保存具体数据，不包含主键、字段类型、索引和外键等数据库结构。因此，导入 Supabase 前，仍需要先通过 Drizzle 的 `schema.ts` 定义 `words` 表，再将 CSV 作为数据导入。

### 数据清洗

数据清洗是后端开发中常见的数据处理工作，通常可以将相关脚本放在 `scripts/` 目录下。例如：

- 爬取和整理数据。
- 转换数据格式。
- 筛选、修正和规范化数据。
- 将外部数据处理成适合数据库导入的格式。

如果直接把完整 JSON 文件交给 AI 处理，文件内容会占用较多上下文 Token，并且可能受到上下文窗口限制。更合适的方式是只提供少量示例数据和处理要求，让 AI 根据示例生成一个 Node.js 脚本，再由脚本在本地读取和处理完整文件。

这样可以将任务分成两部分：

- AI：理解示例数据结构，编写数据处理脚本。
- 本地脚本：读取完整数据，执行转换和清洗。

#### Prompt 执行时的上下文考虑

使用 AI 处理数据时，需要同时考虑信息是否充足和上下文开销：

1. **提供必要的上下文**：说明项目使用的技术架构、数据表设计、输入数据格式和处理目标。项目级别的通用信息可以放在 `AGENTS.md` 中，作为 AI 的全局上下文。
2. **控制上下文开销**：不要让 AI 直接读取完整的大型数据文件，可以提供文件结构、字段说明和少量示例数据。这样既能帮助 AI 理解任务，也能避免大量数据占用上下文窗口。
3. **让脚本处理完整数据**：让 AI 负责编写处理工具，再由脚本在本地读取完整文件并执行转换或清洗，减少 Token 消耗，也方便重复使用。

#### 示例：让 AI 生成 JSON 转 CSV 脚本

本次数据处理使用的 Prompt：

```text
帮我生成一个 Node.js 脚本，能够把
`d:\虚拟C盘\workspace\ai-coding\memorize-vocabulary\vocabulary-admin\temp\PEPXiaoXue3_1.json`
处理成为 CSV 格式，并保存在统计目录下，这是一个 JSON 示例数据。

CSV 的列包括：`wordRank`、`headWord`、`content`、`bookId`，
将 `content` 作为 JSON 保存。
```

示例数据文件：

`vocabulary-admin/temp/PEPXiaoXue3_1.json`（引用第 1～2 条数据作为示例）

示例数据可以帮助 AI 理解：

- 每条单词数据的整体结构。
- 目标字段位于 JSON 的哪一层。
- 哪些字段需要提取到 CSV 的独立列中。
- 哪些复杂字段需要作为完整 JSON 保存。

本次生成的脚本位于 `vocabulary-admin/scripts/json2csv.mjs`，负责在本地读取完整 JSON，并生成 CSV 文件。这样既减少了 AI 的 Token 消耗，也方便以后重复处理其他单词数据。

### RLS

- `words` 表保存公共单词数据，通常允许用户读取，不需要按用户限制数据行。
- 用户的背单词记录属于个人数据，需要开启 RLS，并配置策略，使用户只能查看和修改自己的记录。

简单来说：公共单词数据重点是控制写入权限，个人学习记录重点是限制数据访问范围。

### 让 ai 了解 Supabase 中已有表的表结构

如果你在 Supabase 中手动建表，想让 AI 在项目中同步定义 schema，可以这样交流：

> 我在 Supabase 后台建立了一个表，请你帮我定义该表的 schema，这里是表的定义：

```
create table public.words (
  id bigint generated by default as identity not null,
  "wordRank" integer null,
  "headWord" text null,
  content json null,
  "bookId" text null,
  constraint words_pkey primary key (id)
) TABLESPACE pg_default;
```

- SQL 建表语句可以在 Supabase 控制台查看：Table Editor → 选中表 → Definition 标签
- 后续开发 `books` 表、`user-progress` 表等也可以用同样的方式与 AI 协作  

### 单词书删除与级联删除

删除单词书时，需要同时删除该单词书关联的所有单词数据，避免 `words` 表中残留无主数据。

#### 什么是外键约束

在关系型数据库中，外键（Foreign Key）用来建立两张表之间的关联关系。例如 `words.bookId` 引用 `books.book_id`，意思是：`words` 表中的每一条单词记录，都必须属于 `books` 表中的某一本单词书。

外键有两个核心作用：

- **数据完整性**：插入或修改 `words` 时，`bookId` 的值必须在 `books` 表中存在，否则数据库会拒绝操作。
- **级联行为**：当 `books` 表中的数据被删除或更新时，`words` 表中关联的数据应该怎么处理。这个行为由 `ON DELETE` 和 `ON UPDATE` 来定义。

#### ON DELETE 的几种策略

| 策略 | 含义 |
|---|---|
| `NO ACTION`（默认） | 如果 `words` 中还有属于该单词书的单词，则禁止删除 `books` 中的记录 |
| `RESTRICT` | 与 `NO ACTION` 类似，禁止删除 |
| `CASCADE` | 删除 `books` 记录时，自动删除 `words` 中所有关联的单词 |
| `SET NULL` | 删除 `books` 记录时，将 `words` 中关联的 `bookId` 设为 `NULL` |
| `SET DEFAULT` | 删除 `books` 记录时，将 `words` 中关联的 `bookId` 设为默认值 |

#### 本项目为什么选 CASCADE

以本项目为例：

- `books` 表有一本单词书，`bookId = "PEPXiaoXue3_1"`
- `words` 表中有 4 条单词，`bookId` 都是 `"PEPXiaoXue3_1"`

如果删除这本单词书：
- 选 `NO ACTION` → 数据库报错，不允许删除（因为 words 还有数据依赖它）
- 选 `SET NULL` → 单词还在，但 `bookId` 变成空，成了"孤儿数据"
- 选 `CASCADE` → 单词书和 4 条单词一起删除，干干净净

对于单词书与单词这种"主从关系"（单词离开单词书没有意义），`CASCADE` 是最合适的选择。

对应的 SQL：

```sql
ALTER TABLE "words" ADD CONSTRAINT "words_bookId_books_book_id_fk"
  FOREIGN KEY ("bookId") REFERENCES "public"."books"("book_id")
  ON DELETE CASCADE
  ON UPDATE no action;
```

在 Drizzle schema 中的写法：

```ts
bookId: text("bookId").references(() => books.bookId, { onDelete: "cascade" })
```

#### 数据库 CASCADE + 代码事务 = 双重保障

本项目同时使用了两种方式：

- **数据库层面**：外键 `ON DELETE CASCADE`，由数据库引擎自动处理，效率高、不会遗漏。
- **代码层面**：API 接口中用事务手动先删 `words` 再删 `books`，即使 CASCADE 迁移还未执行也能正常工作。

两种方式互不冲突，删除结果一致，代码中的手动删除可视为数据库 CASCADE 的补充保障。

### Prompt 颗粒度
- 上下文一定要准确且清晰
- 规则或规范，表单字段，业务场景，功能描述
  详细表达，不能让llm去猜
- llm 擅长的，比如生成代码，不要约束太多，让他自己去跑

## 多端适配

- **PC 端**
  - 网页版，SEO 友好，适合办公场景
- **移动端**
  - H5 手机网页端
  - 手机端适配
- **客户端**
  - Android / iOS
  - React Native / Flutter：一套代码，多端运行
- **桌面端**
  - Electron：用 Web 技术打包桌面软件

## h5 web 应用

### nextjs templates

Next.js 官方提供了一系列开箱即用的项目模板（templates），适合快速启动不同类型的项目，不需要从零搭建。

查看和获取模板的方式：

- **GitHub**：[github.com/nextjs](https://github.com/nextjs) 上有官方维护的所有模板
- **命令行创建**：`pnpm create next-app --example <模板名>`/`npx create-next-app@latest --example <模板名>`

常用官方模板：

- `saas-starter`：Next.js + Postgres + Stripe + shadcn/ui，SaaS 起步
- `deploy-github-pages`：部署到 GitHub Pages 的静态站
- `deploy-render`：部署到 Render 的 Node.js 服务
- `deploy-google-cloud-run`：部署到 Google Cloud Run（Docker）

社区也有丰富的第三方模板，如电商模板（Shopify 集成）、博客模板、后台管理模板等，可以在 GitHub 上按 `nextjs-template` 标签搜索。

初始化：

```bash
npx create-next-app nextjs-typescript-starter --example "https://github.com/vercel/nextjs-postgres-auth-starter"
```

### clear/compact 上下文

什么时候需要 clear/compact 上下文？

- 当需要清除或重置模型的上下文时，例如在处理敏感信息或需要重新开始生成时。
- 当模型的上下文长度超过其最大限制时，需要清除旧的上下文以保持模型的性能和稳定性。
- 当模型的上下文包含不相关或不准确的信息时，需要清除或重置上下文以确保模型的输出更符合预期。

### 开始生成与生产部署

本项目采用 SDD（Specification-Driven Development，规范驱动开发）推进 H5 功能。先沉淀需求和技术边界，再实现数据库、服务端动作和页面，最后按验收清单验证，避免边开发边改变数据模型。

#### 开发流程

1. **需求建模**：在 [`docs/proposal.md`](nextjs-typescript-starter/docs/proposal.md) 明确页面、路由、登录态、学习流程和验收标准。
2. **技术设计**：在 [`docs/design.md`](nextjs-typescript-starter/docs/design.md) 固化表结构、数据流、权限边界、异常处理和性能策略。
3. **数据库迁移**：按 `migrations/001_*.sql` 到 `005_*.sql` 顺序执行，使用 `schema_migrations` 记录已执行文件；其中 `004` 负责兼容 `books.tags` 数组类型，`005` 创建单词级学习进度表。
4. **服务端实现**：通过 `app/db.ts` 提供查询，通过 `app/actions/` 提供认证和学习进度 Server Action；用户身份始终从服务端 session 获取。
5. **前端实现**：首页、我的、学习页和详情页使用 Server Component；弹窗、底部 Tab、学习卡片切换使用 Client Component。
6. **验收验证**：执行类型检查、Lint、进度逻辑自检和生产构建，再进行游客访问、登录回跳和断点续学验证。

#### 常用验证命令

```bash
cd nextjs-typescript-starter
npm run db:migrate -- --dry-run
npx tsc --noEmit
npm run lint
npm run test:progress
npm run build
```

如果使用 PowerShell 设置环境变量，可先在当前终端执行 `$env:POSTGRES_URL="你的 PostgreSQL 连接串"`；bash/zsh 可使用 `export POSTGRES_URL="你的 PostgreSQL 连接串"`。不要把真实连接串、密码或 `AUTH_SECRET` 提交到 Git。

#### 生产部署检查

部署前需要在平台配置 `POSTGRES_URL` 和 NextAuth 使用的密钥变量，不要把 `.env` 提交到仓库。推荐顺序如下：

```bash
npm ci
npm run db:migrate
npm run build
npm start
```

迁移完成后，确认 `books.word_count` 与 `words` 实际数量一致；再检查 `/`、`/me`、`/study/[bookId]` 和详情页的匿名访问、登录回跳、进度保存及退出登录流程。生产环境还应在反向代理层为登录接口增加按 IP 和邮箱的限流。

#### H5 运行流程

```text
首页 → 选择单词书 →（游客）我的页登录弹窗 → 学习页
学习页 → 批次加载 words → 点击单词查看详情
      → 点击下一个 → Server Action 校验并同步两张进度表
      → 最近学习 API 返回当前用户的书级进度
```

关键接口和数据表：

| 用途 | 地址/表 | 说明 |
|---|---|---|
| 单词书列表 | `books` | 首页读取摘要、标签和总词数 |
| 学习单词 | `words` | 按 `wordRank ASC, id ASC` 稳定排序，分批加载 |
| 书级进度 | `user_book_progress` | 保存断点、已学数量、完成状态和最近学习时间 |
| 单词级进度 | `user_word_progress` | 保存当前周期已成功推进的单词，唯一键防重复 |
| 最近学习 | `GET /api/progress/recent` | 只读取当前 session 用户，默认返回最近 3 本 |

#### 发布前验收清单

- [x] 游客首页只显示单词书，点击学习会进入我的页并打开登录弹窗。
- [x] 登录用户可以查看邮箱、学习进度、最近学习并继续学习。
- [x] 学习页从断点的下一个单词开始，批次耗尽前后台预取下一批。
- [x] 点击“下一个”后立即切换，服务端事务同步书级和单词级进度。
- [x] 单词详情按需加载完整 JSON，英式/美式发音按钮调用有道接口。
- [x] 已执行数据库迁移，并通过类型检查、Lint、进度自检和生产构建。

当前明确不包含：社交登录、找回密码、邮箱验证、背诵算法、错题本、收藏和排行榜。需要这些能力时，应新增独立的数据模型和验收标准，不直接扩展当前进度字段。

#### 需求文档
帮我写一个需求文档，放到docs/proposal.md 目录中，我希望做一个h5的学英语单词的项目，要求：

1.底部有2个tab栏，分别是首页，我的

2.【首页】如果用户已经登录，展示【最近学习】模快，也就是最近学习单词书（如果没有数据不显示该模块），点击后用户可以继续学习，【最近学习】下方，是所有单词书，展示所有单词。

3.【首页】如果用户没有登陆，只展示单词书，用户点击跳转到【我的】页面，弹出登录的popup，输入邮箱和密码实现登录和注册，登录和注册的代码参考已有逻辑#app/login/page.tsx和#app/register/page.tsx

4.【我的】页面显示用户邮箱、退出登录、包括学习进度

5.用户点击进入单词学习后，从最近学习的单词的下一个开始进入学习，以单词卡片的方式，用户可以点击下一个按钮实现切换，单词的json的完整数据如下：
```json
{
    "wordRank": 1,
    "headWord": "ruler",
    "content": {
      ...
    },
    "bookId": "PEPXiaoXue3_1"
}
```

请你选择合适的字段实现渲染，单词卡片要尽可能的简单，只展示一个示例，详细学习可以点击单词，进入到单词详情页渲染。
```json
    "content": {
      ...
    },
```

这是详情页需要的content字段内容。

请你帮我写一个详细的需求文档，并对各个页面画线框图展示UI布局。

#### 技术设计文档

接下来请你帮我编写/docs/design.md ，这是技术文档，要求：

1.目前数据库已有两个数据表，分别是words单词数据表，和books单词书数据表。表定义分别是：

```sql
create table public.words (
  ...
) TABLESPACE pg_default;
```

和
```sql
create table public.books (
  ...
) TABLESPACE pg_default;
```

2. 根据/docs/proposal.md，完成用户背单词的其他表的设计工作
3. 认真完成一份涉及前后端的技术设计文档

#### 数据库迁移脚本

完成数据库迁移脚本，实现表的schema的设计和迁移。

#### 前端页面开发

现在请你根据/docs/proposal.md实现前端的UI页面开发，完成现在的需求文档中的所有页面，数据结构可以参考/docs/design.md的数据表中的表结构代替

### 优化

#### 单词切换卡顿

**现象**：点击“下一个”后需要等待几秒，连续学习体验不稳定。

**原因**：旧流程每次点击都会执行进度事务，随后调用 `router.refresh()` 重新渲染学习页。远程 PostgreSQL 的网络往返被重复放大；数据库热连接单次查询约 100ms，首次建立连接可能超过 1s。

**解决方案**：采用“轻量卡片预取 + 批次内客户端切换 + 服务端进度校验”。

- 学习页首次从断点开始查询最多 10 张卡片，只返回单词、音标、首条释义和首条例句，不把完整词典 JSON 发到浏览器。
- 当前批次内点击“下一个”时，客户端立即切换内存中的下一张卡片；`advanceStudy` 在服务端事务中校验用户、单词归属和连续顺序，并持久化进度。
- 学习到批次还剩 3 张时，客户端通过受保护的 `prefetchStudy` 在后台加载下一批 10 张卡片，减少批次边界等待。
- 保存失败时恢复到原卡片并显示错误；按钮仍保持 disabled，防止重复提交。
- 只有预取失败或批次耗尽时才刷新学习页获取下一批；冲突或登录失效时同样刷新/跳转处理。
- 详情页继续按 `bookId + words.id` 单词级按需查询，避免首屏加载整本书的详细内容。

相关实现：[`app/db.ts`](nextjs-typescript-starter/app/db.ts)、[`app/actions/study.ts`](nextjs-typescript-starter/app/actions/study.ts)、[`app/components/study-session.tsx`](nextjs-typescript-starter/app/components/study-session.tsx)。

**后续可选优化**：如果真实用户数据表明批次边界仍有明显等待，再将单词卡片摘要放入短 TTL 缓存；在没有性能数据前不引入全局状态库、消息队列或整本书缓存。
