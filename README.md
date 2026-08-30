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
- 注册一个超级管理员，一个人 （一个账号,给老板）
- 添加管理员

第一次访问 / ——> 注册超级管理员页面 ——> 登录 
已有超级管理员账号  访问 / ——> 登录页 ——> 跳转到单词书管理



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

## supabase 
BAAS 数据库 云服务
-  性能、安全、可扩展性、部署成本  几乎为 0 
- 等于psql  支持 embedding + 关系数据库

* git 提交
  可以在编译器的源代码管理中 提交代码
  feat: [提交的内容，即commit]