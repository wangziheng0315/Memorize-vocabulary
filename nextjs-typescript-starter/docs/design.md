# H5 学英语单词技术设计

## 1. 目标与边界

本文是 [`proposal.md`](./proposal.md) 的实现设计，覆盖 H5 前端、Next.js 服务端、认证和 PostgreSQL 数据模型。

本期要解决的状态只有“某个用户在某本书学到哪里了”。因此采用一张 `user_book_progress` 表保存单词书级断点；**不**创建单词级学习记录、学习流水、复习计划或独立 API 服务。这些数据对当前的“下一个单词”和学习进度展示都不是必需的，后续增加错题本或间隔复习时再单独设计。

本设计不直接执行数据库迁移，也不修改既有 `words` 与 `books` 数据。

## 2. 现状与技术决策

### 2.1 已有实现

| 范围 | 现状 | 本期处理 |
| --- | --- | --- |
| Web 框架 | Next.js 14 App Router + React 18 | 保持 App Router，不新增独立后端 |
| UI | Tailwind CSS | 使用现有依赖实现移动端页面和弹窗 |
| 身份认证 | NextAuth v5 Credentials Provider | 复用邮箱/密码登录和 Cookie 会话 |
| 密码 | `bcrypt-ts` 哈希、`compare` 校验 | 保持；客户端不保存密码 |
| 数据访问 | `postgres` + Drizzle ORM | 在现有数据库访问层增加查询和进度写入 |
| 内容数据 | PostgreSQL `public.words`、`public.books` | 保持为单词和单词书的唯一来源 |
| 用户 | `app/db.ts` 会在首次注册创建 `public."User"` | 将其固化为受迁移管理的认证用户表 |

### 2.2 关键决策

1. 页面读数据由 Server Component 查询；只有登录弹窗、底部 Tab、学习“下一个”按钮是 Client Component。
2. 变更数据使用 Next.js Server Actions，不再为本期新增 REST API Route。这样会话校验和数据库访问始终留在服务端。
3. `words.id` 是单词页面和进度写入使用的稳定主键；JSON 中的 `content.word.wordId` 只视为来源数据标识，不作为关系键。
4. 单词在书内的固定顺序为 `wordRank ASC NULLS LAST, id ASC`。`id` 是 `wordRank` 重复或为空时的稳定兜底排序。
5. 运行时学习页以 `COUNT(words)` 作为书内实际总数；`books.word_count` 是导入时维护的列表缓存，导入后必须与实际数量一致。

## 3. 总体架构

```text
浏览器（H5）
  ├─ Server Component：首页 / 我的 / 学习页 / 详情页
  └─ Client Component：BottomTabs、AuthModal、NextButton
                         │ Server Action 调用
Next.js App Router       ▼
  ├─ auth() / NextAuth Credentials ── public."User"
  ├─ 单词书与单词查询             ── public.books / public.words
  └─ 学习进度事务                 ── public.user_book_progress
                                      │
                                   PostgreSQL
```

浏览器永远不直接连接数据库，也不接收其他用户的进度。单词内容不属于个人数据，但本期仍只从已登录的学习页和详情页提供；学习页、进度查询和进度写入均必须在服务端通过 `auth()` 确认当前用户。

## 4. 数据库设计

### 4.1 既有内容表

#### `public.books`

该表是一册单词书的元数据，`book_id` 是业务主键；进度表和单词表都以它关联，而不是 UUID `id`。

| 字段 | 用途 | 规则 |
| --- | --- | --- |
| `id` | 内部 UUID 主键 | 保持原样，不用于 URL 或进度关联 |
| `book_id` | 单词书业务 ID | 唯一、不可变，例如 `PEPXiaoXue3_1` |
| `title` | 首页和我的页的书名 | 必填 |
| `word_count` | 首页书卡的显示数量 | 由导入任务维护，必须等于该书 `words` 行数 |
| `cover_url` | 封面地址 | 可选；为空时使用纯色/首字母占位 |
| `tags` | 展示标签 | 当前按普通文本展示，不做筛选条件 |
| `created_at`、`updated_at` | 内容审计 | 保持原样 |

#### `public.words`

该表一行对应一个单词，`content` 保留原始 JSON；不拆分例句、短语等内容到新表。

| 字段 | 用途 | 规则 |
| --- | --- | --- |
| `id` | PostgreSQL 单词行主键 | 详情路由和进度锚点使用此值 |
| `bookId` | 所属书的业务 ID | 应关联 `books.book_id` |
| `wordRank` | 书内推荐顺序 | 查询按升序；空值排到最后 |
| `headWord` | 卡片和详情标题的优先来源 | 为空时回退 JSON 内 `wordHead` |
| `content` | 词典详情 JSON | 服务端适配为受控 DTO，前端不直接深取字段 |

本期页面使用的 JSON 路径如下：

| 页面区块 | 优先字段 |
| --- | --- |
| 学习卡片标题 | `headWord`，回退 `content.word.wordHead` |
| 学习卡片音标 | `content.word.content.usphone`、`ukphone` |
| 学习卡片释义 | `content.word.content.trans[0].tranCn` |
| 学习卡片例句 | `content.word.content.sentence.sentences[0].sContent`、`sCn` |
| 详情释义 | `content.word.content.trans[]` |
| 详情例句/短语/同近/同根/记忆 | `sentence`、`phrase`、`syno`、`relWord`、`remMethod` 对应数组/字段 |

`content` 的列类型保持 `json`。本期不按 JSON 内部字段筛选或建立 JSON 索引，因此没有迁移到 `jsonb` 的收益；如数据导入需要按 JSON 内容检索，再单独评估。

### 4.2 认证用户表

当前 starter 的 `app/db.ts` 会动态创建带大写表名的 `public."User"`：`id`、`email`、`password`。本期继续使用该表，避免同时存在两套账户数据；但要从“运行时建表”改为显式迁移管理。

目标约束如下：

| 字段/约束 | 设计 |
| --- | --- |
| `id` | `serial` 主键；与进度表的 `user_id integer` 对应 |
| `email` | `varchar(254) NOT NULL UNIQUE`；注册和登录前执行 `trim().toLowerCase()` |
| `password` | `varchar(64) NOT NULL`；仅存 bcrypt 哈希（当前 bcrypt 哈希长度为 60） |
| 用户资料 | 本期直接从 `email` 读取头像首字母；不新增 profile 表 |

应用启动时不应再执行 `CREATE TABLE`。迁移完成后，`app/db.ts` 只声明 Drizzle schema 和查询函数。这样可避免多实例同时首次注册时的建表竞争，也能让约束在部署前被审查。

### 4.3 新增表：`public.user_book_progress`

一行代表一位用户在一本书中的当前学习周期。`last_learned_word_id` 的语义是“最后一次点击下一个/完成时，已成功标记完成的单词”；没有进度时为 `NULL`。因此下次展示的是该单词的下一个，而不是重复展示它。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `bigint identity` | 技术主键 |
| `user_id` | `integer` | 指向 `"User".id` |
| `book_id` | `text` | 指向 `books.book_id` |
| `last_learned_word_id` | `bigint NULL` | 指向 `words.id`；未学时为空 |
| `learned_count` | `integer` | 当前学习周期已完成数量；从 0 开始 |
| `is_completed` | `boolean` | 是否完成当前学习周期 |
| `started_at` | `timestamptz` | 当前学习周期开始时间 |
| `last_studied_at` | `timestamptz` | 最近一次有效推进时间；“最近学习”排序字段 |
| `completed_at` | `timestamptz NULL` | 完成时写入；重新学习时清空 |
| `created_at`、`updated_at` | `timestamptz` | 行审计时间 |

约束和索引：

- `UNIQUE (user_id, book_id)`：每位用户每本书仅一行进度。
- `CHECK (learned_count >= 0)`：避免非法负数。
- `CHECK` 保证 `is_completed` 与 `completed_at` 一致。
- `(user_id, last_studied_at DESC)`：支持首页最近学习和“我的”进度排序。
- `book_id` 的普通索引：满足书数据维护时的外键检查。

不在表中存 `next_index` 或 JSON 里的 `wordId`：前者与“最后已学单词”重复且容易不一致，后者不在关系列中。下一张卡片的下标由当前书的稳定排序和 `last_learned_word_id` 推导。

### 4.4 关系与状态

```text
"User" 1 ──── * user_book_progress * ──── 1 books
                         │
                         └── 0..1 words（last_learned_word_id）

books 1 ──── * words
```

进度状态迁移：

| 当前状态 | 用户动作 | 服务端写入后的状态 |
| --- | --- | --- |
| 无记录 | 在第一张卡点击“下一个” | 新建记录，`learned_count=1`，记录第一词 ID |
| 学习中 | 在第 N 张卡点击“下一个” | `learned_count=N`，记录第 N 词 ID |
| 学习中 | 在最后一张点击“完成本书” | `learned_count=total`，`is_completed=true`，设置 `completed_at` |
| 已完成 | 再次进入并从第一张点击“下一个” | 清空完成状态后开始新周期，`learned_count=1` |

只打开卡片或查看详情不会写进度；只有“下一个/完成本书”成功后写入。这确保“最近学习”表示用户至少推进过一次。

### 4.5 迁移 SQL

先在预发布数据库执行以下检查。第 1 项只在 `public."User"` 已由现有 starter 创建时执行；新数据库可跳过它，直接执行后续建表迁移。前两项有结果时先清理数据再迁移；第 3 项用于核对导入状态，迁移会以实际 `words` 行数回填 `books.word_count`。

实际迁移文件位于 [`migrations/`](../migrations)，由已安装的 `postgres` 驱动执行并记录到 `public.schema_migrations`。先运行 `npm run db:migrate -- --dry-run` 检查发现顺序，再在目标环境设置好 `POSTGRES_URL` 后执行 `npm run db:migrate`。运行器以 PostgreSQL advisory lock 串行化迁移；单个文件与迁移记录在同一事务中提交。

```sql
-- 1. 用户邮箱在增加唯一约束前必须无重复或空值。
select lower(trim(email)) as normalized_email, count(*)
from public."User"
group by lower(trim(email))
having lower(trim(email)) is null or count(*) > 1;

-- 2. 每个单词必须关联一个存在的单词书。
select w.id, w."bookId"
from public.words w
left join public.books b on b.book_id = w."bookId"
where w."bookId" is null or b.book_id is null;

-- 3. 导入数量必须和书表缓存一致。
select b.book_id, b.word_count, count(w.id) as actual_word_count
from public.books b
left join public.words w on w."bookId" = b.book_id
group by b.book_id, b.word_count
having b.word_count <> count(w.id);
```

通过检查后，按以下顺序执行迁移。`public."User"` 可能尚未存在，所以先显式创建其最小结构；若它已由 starter 创建，则只补足约束和长度。

```sql
-- 001_auth_user.sql
create table if not exists public."User" (
  id serial primary key,
  email varchar(254) not null,
  password varchar(64) not null
);

alter table public."User"
  alter column email type varchar(254),
  alter column email set not null,
  alter column password set not null;

-- 迁移前已将 email 规范化为 trim + lowercase，才可安全建立唯一索引。
create unique index if not exists "User_email_unique"
  on public."User" (email);

-- 002_word_book_integrity.sql
update public.books b
set word_count = counts.actual_word_count,
    updated_at = now()
from (
  select b.id, count(w.id)::integer as actual_word_count
  from public.books b
  left join public.words w on w."bookId" = b.book_id
  group by b.id
) counts
where b.id = counts.id
  and b.word_count is distinct from counts.actual_word_count;

alter table public.words
  alter column "bookId" set not null;

alter table public.words
  add constraint words_book_id_fkey
  foreign key ("bookId") references public.books(book_id)
  on update restrict on delete restrict;

create index if not exists words_book_rank_id_idx
  on public.words ("bookId", "wordRank", id);

-- 003_user_book_progress.sql
create table public.user_book_progress (
  id bigint generated by default as identity primary key,
  user_id integer not null,
  book_id text not null,
  last_learned_word_id bigint null,
  learned_count integer not null default 0,
  is_completed boolean not null default false,
  started_at timestamptz not null default now(),
  last_studied_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_book_progress_user_book_unique unique (user_id, book_id),
  constraint user_book_progress_learned_count_check check (learned_count >= 0),
  constraint user_book_progress_completion_check check (
    (is_completed and completed_at is not null)
    or (not is_completed and completed_at is null)
  ),
  constraint user_book_progress_user_fkey
    foreign key (user_id) references public."User"(id)
    on update restrict on delete restrict,
  constraint user_book_progress_book_fkey
    foreign key (book_id) references public.books(book_id)
    on update restrict on delete restrict,
  constraint user_book_progress_last_word_fkey
    foreign key (last_learned_word_id) references public.words(id)
    on update restrict on delete restrict
);

create index user_book_progress_user_recent_idx
  on public.user_book_progress (user_id, last_studied_at desc);

create index user_book_progress_book_idx
  on public.user_book_progress (book_id);
```

`last_learned_word_id` 的书籍归属无法仅凭这个外键验证；写入动作必须额外限定 `words.id = wordRowId AND words."bookId" = bookId`。这是下面服务端事务的第一步。

## 5. 服务端设计

### 5.1 路由与访问控制

| 路由 | 渲染 | 是否要求登录 | 未登录行为 |
| --- | --- | --- | --- |
| `/` | Server Component | 否 | 展示单词书，不查用户进度 |
| `/me` | Server Component + 客户端弹窗 | 否 | 显示登录引导；`auth=login` 时打开弹窗 |
| `/study/[bookId]` | Server Component | 是 | 跳至 `/me?auth=login&returnTo=...` |
| `/study/[bookId]/word/[wordId]` | Server Component | 是 | 同上 |
| `/login`、`/register` | 兼容兜底页 | 否 | 复用与弹窗相同的认证 action |

保留 `middleware.ts` 作为第一道路由保护，但 `auth.config.ts` 的 `authorized` 回调只应拒绝 `/study/*` 的匿名请求。必须移除现有“已登录用户一律重定向到 `/protected`”的逻辑；首页和我的页对两种会话状态都合法。

所有受保护页面和所有写入 Action 仍需调用 `auth()`。中间件只改善跳转体验，不能作为数据库授权的唯一防线。

### 5.2 认证设计

1. 登录和注册表单共用现有邮箱/密码字段 UI（`app/form.tsx`）。将登录、注册服务端逻辑提为可被弹窗和备用路由共同调用的 action。
2. 注册 action 对邮箱做 `trim().toLowerCase()`、格式校验和密码长度校验（至少 6 位），再通过数据库唯一约束处理并发注册。
3. 登录 action 采用同一邮箱规范化规则；错误提示统一为“邮箱或密码不正确”，不暴露账户是否存在。
4. 密码只在 action 内传给 `createUser`/`signIn`；日志、URL、客户端状态和 Action 返回值不得包含密码或哈希。
5. 当前 NextAuth 没有 Adapter，因此会话使用签名 Cookie/JWT，不需要新增 Auth.js 的 session、account 或 verification token 表。
6. `returnTo` 仅接受本站以 `/study/` 开头的路径；其他值回退 `/`，防止开放重定向。
7. 登录端点应由部署平台或反向代理按 IP + 邮箱实施限流；应用内不保存登录失败历史，避免为了本期功能新增安全敏感表。

### 5.3 读模型与查询函数

查询函数放在服务端数据库模块中，返回页面 DTO，而不是把 Drizzle 行和未处理 JSON 直接交给组件。

| 函数 | 调用方 | 查询/返回 |
| --- | --- | --- |
| `getBookSummaries()` | 首页 | 全部 `books` 的书名、封面、标签、`word_count` |
| `getRecentBooks(userId)` | 首页登录态 | 进度联结单词书，按 `last_studied_at DESC` 取 3 本 |
| `getMyProgress(userId)` | 我的 | 该用户所有进度，联结书名/封面，按最近学习排序 |
| `getStudyContext(userId, bookId)` | 学习页 | 书信息、真实总词数、从断点开始的一批卡片、完成提示 |
| `getWordDetail(bookId, wordRowId)` | 详情页 | 限定书 ID 的单词详情 DTO |

`getStudyContext` 不应把整本书的 JSON 发到 H5。它根据 `last_learned_word_id` 在固定顺序中定位下一项，返回从该位置开始最多 10 张经过 JSON 适配的卡片、首张卡片的 `position` 和 `total`。卡片只包含单词、音标、首条释义和首条例句，不包含详情页的完整词典结构。查询可使用窗口函数产生连续位置：

```sql
select
  w.id,
  w."headWord",
  w.content,
  row_number() over (order by w."wordRank" asc nulls last, w.id asc) - 1 as position,
  count(*) over () as total
from public.words w
where w."bookId" = $1;
```

服务端再由 `last_learned_word_id` 找到其位置，选择下一位置开始的 10 行。书中没有单词时返回 `EMPTY_BOOK`，页面显示“该单词书暂无单词”，不渲染学习卡片。客户端在批次还剩 3 张时通过受保护的只读 Action 后台预取下一批；只有预取失败、批次耗尽或发生进度冲突时才刷新学习页。

### 5.4 JSON 适配层

`words.content` 是外部导入的可空 JSON，不能在 JSX 中假设 `content.word.content.trans[0]` 必定存在。适配函数应逐层检查对象和数组，只输出页面实际要用的字段。

```ts
type WordCardDTO = {
  id: string; // words.id，适合 URL 和 action 入参
  headWord: string;
  usPhone?: string;
  ukPhone?: string;
  meaning?: string;
  example?: { en: string; zh?: string };
};

type WordDetailDTO = WordCardDTO & {
  translations: Array<{ zh?: string; en?: string }>;
  examples: Array<{ en: string; zh?: string }>;
  phrases: Array<{ text: string; zh?: string }>;
  synonyms: Array<{ partOfSpeech?: string; meaning?: string; words: string[] }>;
  relatedWords: Array<{ partOfSpeech?: string; words: Array<{ word: string; meaning?: string }> }>;
  memoryTip?: string;
};
```

缺失数据以空数组或 `undefined` 表达。组件仅在数组非空、字符串非空时渲染区块；不要用 `as any` 后直接访问深层 JSON。所有词典内容以 React 文本节点输出，不使用 `dangerouslySetInnerHTML`。

### 5.5 推进学习进度的 Server Action

客户端提交 `{ bookId, wordRowId }`，其中 `wordRowId` 是当前卡片的 `words.id` 字符串。客户端传入的下标、总数、学习数量和完成状态均不可信，服务端自行计算。

Action `advanceStudy` 的事务步骤：

1. 调用 `auth()`；未登录返回 `AUTH_REQUIRED`。
2. 根据会话邮箱取得当前 `"User".id`，不接收客户端 `userId`。
3. 校验 `bookId` 存在，并查询 `words.id = wordRowId AND "bookId" = bookId`；否则返回 `WORD_NOT_IN_BOOK`。
4. 按 `wordRank ASC NULLS LAST, id ASC` 计算该词的连续位置和书内总数。
5. 先以默认空进度执行 `INSERT ... ON CONFLICT (user_id, book_id) DO NOTHING`，再 `SELECT ... FOR UPDATE` 锁定该用户、该书的进度行，防止两个页面首次同时推进产生唯一键竞争或回退。
6. 校验该单词是“预期下一词”；已成功写入同一词时视为幂等成功；跳过或过期卡片返回 `PROGRESS_CONFLICT`。
7. 若进度已完成且本次是第一词，清空完成时间并将 `started_at = now()` 以开启新周期；然后写入 `last_learned_word_id`、`learned_count = position + 1`、`last_studied_at = now()`、`updated_at = now()`。
8. 如果位置是最后一项，同一事务设置 `is_completed = true` 与 `completed_at = now()`。
9. 提交后 `revalidatePath('/')`、`revalidatePath('/me')`、`revalidatePath('/study/' + bookId)`；客户端在当前批次内直接切换已预取卡片，仅在批次耗尽或冲突时刷新学习页。

预期下一词校验让连续双击、网络重试和多标签页不会把进度倒退：

- 当前无进度时只接受位置 `0`。
- 当前最后完成位置为 `N` 时只接受 `N + 1`。
- 已完成时只接受位置 `0` 作为重新学习的第一步。
- 重复提交当前已保存位置返回成功但不重复累加。

Action 使用显式事务和行锁，不依赖“最后一次请求覆盖前一次请求”的偶然顺序。

### 5.6 Action 返回契约

页面 mutation 统一使用可判别结果，让前端可以显示提示而非猜测失败原因。

```ts
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      code:
        | 'AUTH_REQUIRED'
        | 'BOOK_NOT_FOUND'
        | 'WORD_NOT_IN_BOOK'
        | 'EMPTY_BOOK'
        | 'PROGRESS_CONFLICT'
        | 'INVALID_INPUT'
        | 'UNKNOWN_ERROR';
      message: string;
    };
```

`PROGRESS_CONFLICT` 时客户端调用 `router.refresh()` 获取服务端当前卡片；`AUTH_REQUIRED` 时跳转至带 `auth=login` 的我的页。预取失败不影响当前批次，批次耗尽时以学习页刷新作为兜底。网络错误保留当前卡片并重新启用按钮，让用户重试。

## 6. 前端设计

### 6.1 文件职责

路由组不影响 URL，用于让应用外壳和底部 Tab 只维护一次：

```text
app/
  (app)/
    layout.tsx                         # 统一 H5 外壳、底部 Tab、safe-area
    page.tsx                           # 首页 /
    me/page.tsx                        # 我的 /me
    study/[bookId]/page.tsx            # 学习页
    study/[bookId]/word/[wordId]/page.tsx # 详情页，wordId = words.id
  actions/auth.ts                      # 登录、注册、退出
  actions/study.ts                     # advanceStudy
  components/
    bottom-tabs.tsx                    # 客户端 pathname 高亮
    auth-modal.tsx                     # 客户端弹窗、表单状态
    word-card.tsx                      # 只展示 WordCardDTO
    word-book-card.tsx                 # 单词书摘要
  db.ts                                # Drizzle 表定义和服务端查询
```

当前 `/login` 与 `/register` 可以保留为无 JavaScript 或直链访问的兼容页，但认证字段和 action 必须与 `AuthModal` 共用，不能形成两套登录逻辑。不要创建 service class、repository class 或全局状态库；当前数据流只需要 Server Component + Server Action。

### 6.2 页面数据流

| 页面 | 初始服务端数据 | 客户端行为 |
| --- | --- | --- |
| 首页 | 所有书；登录后额外读取最近 3 条进度 | 游客点击开始学习，导航至 `/me?auth=login&returnTo=...` |
| 我的 | `auth()`、邮箱、我的进度 | 弹窗登录/注册、退出、继续学习 |
| 学习页 | `getStudyContext` 的一批卡片和总数 | 点击卡片到详情；“下一个”调用 `advanceStudy` 并在批次内切换 |
| 详情页 | `getWordDetail` | 仅浏览和返回，不写进度 |

`AuthModal` 由 URL 查询参数驱动：`/me?auth=login&returnTo=%2Fstudy%2FPEPXiaoXue3_1`。弹窗关闭时使用 `router.replace('/me')` 去除参数；登录成功后经服务端校验 `returnTo` 再跳转。这样游客从首页点击书后刷新页面仍会保持正确的登录入口。

### 6.3 客户端状态和刷新

- `AuthModal`：仅保存打开状态、登录/注册模式、输入值、提交中和错误文案。
- `WordCard`：只接收服务端 DTO；不在浏览器缓存全书单词或进度。
- `StudySession`：维护当前批次游标，剩余 3 张时调用受保护的 `prefetchStudy` 追加下一批；批次内先切换卡片并调用 `advanceStudy`，保存失败回退游标，预取失败时在批次耗尽后以 `router.refresh()` 兜底。
- 读页面以 Server Component 为源，学习页仅缓存最多 10 张轻量卡片；`revalidatePath` 负责首页、我的和下一批数据的新鲜度。
- 所有页面底部预留 Tab 高度和 `env(safe-area-inset-bottom)`，学习卡片与按钮区域不被固定导航遮挡。

## 7. 数据访问与性能

| 场景 | 策略 | 索引/限制 |
| --- | --- | --- |
| 首页全部书 | 直接读取 `books` 摘要 | 书数量通常远小于单词数，不读取 `content` |
| 最近学习 | 按用户过滤进度、联结书表、倒序取 3 | `user_book_progress_user_recent_idx` |
| 我的进度 | 按用户过滤、联结书表 | 同上；不查询其他用户 |
| 学习卡片 | 查询断点开始最多 10 行轻量卡片和真实总数 | `words_book_rank_id_idx` |
| 详情 | 以 `words.id + bookId` 查询一行 | 主键查找后校验书归属 |

单词书 JSON 不在首页、最近学习、我的进度接口中返回。详情页一次只返回一个词；这比把 2,000 个单词内容放进浏览器更简单且不会放大 H5 首屏体积。

单词导入/更新完成后必须执行 4.5 的数量校验。若 `books.word_count` 与实际不一致，列表显示和完成百分比可能不同；上线前应修正 `word_count`，而不是在前端猜测。

## 8. 安全、异常与数据一致性

### 8.1 安全边界

- 数据库连接串、NextAuth 密钥仅放环境变量；不得写入仓库、页面或日志。
- 进度读写均从服务端 session 推导用户身份；不信任 URL、隐藏字段或客户端 `userId`。
- 登录失败不区分“邮箱不存在”和“密码错误”；密码和哈希不写日志。
- 单词详情也按 `bookId + words.id` 限定查询，避免任意 ID 访问跨书路由。
- React 默认转义词典文本；不渲染词典 JSON 中的 HTML。
- 所有外部输入（路由参数、邮箱、密码、wordRowId、returnTo）在服务端校验类型、长度和归属。

### 8.2 异常处理

| 情况 | 服务端行为 | 页面行为 |
| --- | --- | --- |
| 不存在的书或词 | `notFound()` 或受控错误 | 404/“内容不存在”，可回首页 |
| 空单词书 | 返回 `EMPTY_BOOK` | 不显示卡片和下一步按钮 |
| JSON 字段缺失 | DTO 输出空值 | 隐藏对应详情区块；卡片显示“暂无释义” |
| 未登录写入 | `AUTH_REQUIRED` | 打开我的页登录弹窗 |
| 并发/旧卡推进 | `PROGRESS_CONFLICT` | 刷新当前学习页，不篡改本地进度 |
| 数据库写入失败 | `UNKNOWN_ERROR`，记录不含敏感内容的错误上下文 | 保留当前单词，允许重试 |

### 8.3 日志与可观测性

本期只记录服务端错误：action 名称、匿名请求 ID、`bookId`、`wordRowId`、错误码和数据库错误类别。不得记录邮箱、密码、会话 Cookie、完整单词 JSON 或 PostgreSQL 连接串。尚不引入埋点、队列或日志表；有明确运营指标需求后再设计。

## 9. 实施顺序

1. 在预发布库执行数据检查，建立认证用户约束、`words → books` 关系、索引和 `user_book_progress` 表。
2. 将 `app/db.ts` 的运行时建表替换为固定 Drizzle 声明，增加书、单词、进度查询和事务函数。
3. 调整 NextAuth 授权规则：仅保护 `/study/*`，移除已登录用户跳 `/protected` 的行为；实现共享认证 action。
4. 建立 `(app)` 路由组、底部 Tab、首页和我的页的服务端读模型，再接入 `AuthModal`。
5. 实现学习页、详情页、JSON DTO 适配和 `advanceStudy` 事务。
6. 按下列测试清单验证，再切换正式流量。

## 10. 验证清单

### 数据库与服务端

- [ ] 三个迁移前置检查均返回 0 行。
- [ ] 同邮箱并发注册最终只创建一个用户，且返回友好冲突信息。
- [ ] 未登录调用 `advanceStudy` 无法产生进度行。
- [ ] 用 A 用户的会话不能查询或更新 B 用户的进度。
- [ ] 提交不属于 `bookId` 的 `wordRowId` 返回 `WORD_NOT_IN_BOOK`。
- [ ] 重复提交同一张卡不重复加学习数量；跳过一词的提交返回冲突。
- [ ] 完成最后一个词后，进度为总数、`is_completed=true`、`completed_at` 非空。
- [ ] 完成后从第一词重新学习可创建新的进行中周期。

### H5 端到端

- [ ] 游客首页只读取和展示单词书；点击开始学习打开我的页登录弹窗。
- [ ] 登录成功后回到安全的 `returnTo`，并能从第一词开始。
- [ ] 点击下一个、刷新、关闭后重新进入，均展示最后已学词的下一词。
- [ ] 首页最近学习只在有有效进度时显示，且按最近时间倒序。
- [ ] 我的页显示邮箱、每本书已学数/总数、百分比、继续学习和退出登录。
- [ ] 详情页在 `pencil` 这类含短语数据时显示短语，在缺字段词上不显示空标题或 `undefined`。
- [ ] 390px 宽度、移动安全区、键盘弹出和弹窗焦点下，内容与固定 Tab 均可正常操作。

## 11. 明确不做的扩展

- 不新增 `user_word_progress`：当前需求只需要连续断点，不需要单词掌握度。
- 不新增 `study_events`：没有学习时长、分析或审计需求时，事件流水只会增加写入量和维护成本。
- 不新增缓存层、消息队列、搜索服务或全局状态库：当前 PostgreSQL 查询量和页面数量都不需要它们。
- 不播放 `ukspeech` / `usspeech`：它们目前只是来源标识，不是可直接播放的 URL；等音频资源服务明确后再接入。
