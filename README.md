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
- ORM（对象关系映射）
  不用写 SQL，用代码操作数据库
  - 例如：`todos.save()` 就可以把对象保存到数据库
  - 本质：将代码里的对象和数据库里的一条记录对应起来

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
- 注册一个系统管理员，一个人 （一个账号,给老板）
- 添加管理员

第一次访问 / ——> 注册系统管理员页面 ——> 登录 
已有系统管理员账号  访问 / ——> 登录页 ——> 跳转到单词书管理



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

## supabase 
BAAS 数据库 云服务
-  性能、安全、可扩展性、部署成本  几乎为 0 
- 等于psql  支持 embedding + 关系数据库

## git 提交
  可以在编译器的源代码管理中 提交代码
  - feat: [新增功能] 
  `feat:完成前端UI开发` 使用的是 **Conventional Commits（约定式提交）** 风格。`feat` 表示新增功能，冒号后面是本次提交内容的简短说明。
  常见类型还有：
  - `fix` 修复问题、
  - `docs` 修改文档、
  - `style` 调整样式、
  - `refactor` 重构代码、
  - `test` 添加测试、
  - `chore` 架构变更、
  * 建议冒号后加空格：`feat: 完成前端 UI 开发`。

  这是coding agent 内置的 git 提交


## ORM（Drizzle）

> 给该 Next.js 项目，安装并引入 Drizzle ORM 的相关依赖和配置，我需要集成我的 Supabase 的数据库。
> 我已经在项目中创建了 `.env` 文件，并且设置了 `DATABASE_URL` 环境变量。
> 注意：只安装依赖并引入相关配置，不要给我默认创建额外的表。

- Supabase 数据库已在云端创建，连接地址写在 `.env` 的 `DATABASE_URL` 中
- Drizzle 通过 `.env` 连接数据库，接手所有数据库操作

- 为什么需要 ORM？—— 两种语言的鸿沟：
  - Next.js 用的是 TypeScript，属于**高级语言**（贴近人类思维，用对象和类来组织代码）
  - 数据库只懂 SQL（如 `SELECT`、`INSERT`），属于**低级语言**（贴近机器，人类直接读写很费劲）
  - 两者之间天然存在一道鸿沟，你不可能在代码里直接写 SQL 字符串，又麻烦又容易出错

- 面向对象映射 —— 填平鸿沟的桥梁：
  - 数据库里的一张表 → 代码里的一个类（Class，即一张"图纸"）
  - 表里的一行数据 → 代码里的一个对象（即按图纸造出来的"实例"）
  - 例如：`user.save()` 这行代码，Drizzle 自动翻译成 `INSERT INTO users ...` 发给数据库
  - 本质：你在代码里操作对象，Drizzle 在背后帮你翻译成 SQL，结果再翻译回对象还给你

- 不需要手动建表：
  - 在代码里定义 schema（表结构，描述表有哪些字段、什么类型）
  - 通过 `migrate`（数据表迁移）自动在数据库里创建对应的表
  - 你只管写代码，表结构 Drizzle 帮你同步到数据库

> 安装 Drizzle ORM 依赖并配置 `.env` 连接 Supabase，未创建任何数据表，仅完成基础集成。

## Drizzle 项目结构与命令

Drizzle 在项目中的文件结构以及配套的常用命令。

### 项目目录

- `db/index.ts`：数据库连接配置
  - 读取 `.env` 中的 `DATABASE_URL`，连接 Supabase 数据库
  - 导出 `db` 对象，之后所有数据库操作（查询、插入、更新、删除）都通过它进行
- `db/schema.ts`：数据库表结构定义
  - 用代码描述表有哪些字段、什么类型、什么约束
  - 一个表对应一个 Drizzle 对象定义

### 配套命令

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
   
