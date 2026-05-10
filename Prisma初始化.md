下面这份可以直接当成你的 Prisma 入门笔记记录下来。

# Nuxt 项目中初始化 Prisma 笔记

## 1. Prisma 是什么？

Prisma 是 Node.js / TypeScript 生态里常用的 ORM 工具。

ORM 可以简单理解为：

```txt
数据库表  →  TypeScript 对象
SQL 查询  →  Prisma 方法调用
```

比如原来你可能写：

```sql
SELECT * FROM posts WHERE id = 1;
```

用 Prisma 后可以写：

```ts
const post = await prisma.posts.findUnique({
  where: {
    id: 1,
  },
})
```

它的好处是：

```txt
1. 少写很多手动 SQL
2. 有 TypeScript 类型提示
3. 查询结果类型更清晰
4. 可以管理数据库表结构变化
5. 适合和 Nuxt / Express / Next.js 这类后端服务配合
```

---

## 2. Nuxt 中 Prisma 应该放在哪里？

Prisma **不能直接放在 Vue 页面组件里使用**。

错误思路：

```vue
<script setup lang="ts">
const posts = await prisma.posts.findMany()
</script>
```

原因是：Vue 页面可能会运行在浏览器端，而数据库账号密码绝对不能暴露给浏览器。

正确结构应该是：

```txt
浏览器页面
   ↓ 请求
/api/posts
   ↓
Nuxt server/api
   ↓
Prisma
   ↓
MySQL 数据库
```

也就是：

```txt
pages/index.vue 或 components/PostList.vue
    ↓ useFetch('/api/posts')

server/api/posts.get.ts
    ↓ prisma.posts.findMany()

MySQL
```

---

## 3. 全新项目初始化 Prisma

如果你是一个全新的数据库，还没有表，可以用：

```bash
npm install @prisma/client
npm install -D prisma

npx prisma init --datasource-provider mysql
```

执行后会生成：

```txt
prisma/
  schema.prisma

.env
```

`.env` 里配置数据库地址：

```env
DATABASE_URL="mysql://root:你的密码@localhost:3306/blog_db"
```

然后在 `prisma/schema.prisma` 里写模型：

```prisma
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  slug      String   @unique
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

接着执行迁移：

```bash
npx prisma migrate dev --name init
```

最后生成 Prisma Client：

```bash
npx prisma generate
```

---

## 4. 已经有数据库和表时怎么办？

如果你已经有数据库，也已经有表，就不要一上来执行：

```bash
npx prisma migrate dev --name init
```

因为这样可能会尝试重新建表，容易和已有表冲突。

已有数据库应该使用：

```bash
npx prisma db pull
```

这叫 **introspection / 内省**。

它的作用是：

```txt
读取已有数据库结构
    ↓
自动生成 prisma/schema.prisma
```

你的情况就是这种。

完整流程是：

```bash
npx prisma init --datasource-provider mysql
```

配置 `.env`：

```env
DATABASE_URL="mysql://用户名:密码@localhost:3306/blog_db"
```

然后执行：

```bash
npx prisma db pull
```

成功后再执行：

```bash
npx prisma generate
```

之后就可以用 Prisma 查询已有表了。

---

## 5. db pull 和 generate 分别干什么？

### `prisma db pull`

作用是：**从数据库读取表结构，生成 Prisma schema**。

也就是：

```txt
MySQL 里的 posts / tags / post_tags
        ↓
prisma/schema.prisma 里的 model posts / model tags / model post_tags
```

比如数据库里有 `posts` 表，Prisma 可能会生成：

```prisma
model posts {
  id          Int      @id @default(autoincrement())
  title       String
  slug        String
  content     String   @db.Text
  post_status String?
}
```

### `prisma generate`

作用是：**根据 schema.prisma 生成 Prisma Client**。

也就是让你代码里可以写：

```ts
await prisma.posts.findMany()
```

所以顺序通常是：

```bash
npx prisma db pull
npx prisma generate
```

---

## 6. 什么是迁移 migration？

迁移可以理解为：

> 数据库结构的版本管理。

就像 Git 管代码变化：

```txt
第一次提交：创建 posts 表
第二次提交：给 posts 表添加 summary 字段
第三次提交：创建 tags 表
第四次提交：创建 post_tags 关联表
```

数据库迁移就是把这些表结构变化保存成一份份 SQL 文件。

比如你给模型新增字段：

```prisma
model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String
  views   Int    @default(0)
}
```

然后执行：

```bash
npx prisma migrate dev --name add_post_views
```

Prisma 可能会生成类似 SQL：

```sql
ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
```

这份 SQL 会被保存到：

```txt
prisma/migrations/
  20260510123456_add_post_views/
    migration.sql
```

以后你换电脑、部署到服务器、团队协作时，就可以用这些 migration 文件同步数据库结构。

---

## 7. db pull 和 migrate dev 的区别

最重要的是分清楚这两个命令：

```txt
已有数据库 → db pull
新项目从 0 建表 → migrate dev
```

更具体一点：

| 场景                                | 应该用什么                |
| --------------------------------- | -------------------- |
| 数据库已经有表，只想让 Prisma 识别它们           | `prisma db pull`     |
| 新项目从 0 开始设计数据库                    | `prisma migrate dev` |
| 改了数据库表结构，然后让 Prisma 重新识别          | `prisma db pull`     |
| 改了 schema.prisma，然后让 Prisma 修改数据库 | `prisma migrate dev` |
| 生成可在代码中使用的 Prisma Client          | `prisma generate`    |

一句话：

```txt
db pull：数据库 → Prisma schema
migrate dev：Prisma schema → 数据库
generate：Prisma schema → TypeScript Client
```

这个方向一定要记住。

---

## 8. 已有数据库是否需要 migration？

刚开始不一定需要。

你目前的个人博客项目可以先这样：

```bash
npx prisma db pull
npx prisma generate
```

然后直接用 Prisma 查询已有表。

等你后面更熟悉 Prisma 之后，如果想让 Prisma 接管数据库结构变化，再考虑 migration。

如果已有数据库以后想使用 Prisma migration，需要做一件事叫 **baseline / 基线化**。

基线化的意思是：

```txt
告诉 Prisma：
当前数据库结构已经存在了，
不要重新创建这些表，
从现在之后的变化再交给 migration 管理。
```

否则 Prisma 可能会生成“创建 posts 表、创建 tags 表”的 SQL，但你的数据库里已经有这些表了，就会冲突。

---

## 9. Prisma schema 中表名和字段名的优化

`db pull` 后，Prisma 可能生成这种模型：

```prisma
model posts {
  id          Int     @id @default(autoincrement())
  post_status String?
  created_at  DateTime?
}
```

这样代码里就要写：

```ts
await prisma.posts.findMany()
```

可以用 `@@map` 和 `@map` 改成更符合 TypeScript 风格的写法：

```prisma
model Post {
  id         Int       @id @default(autoincrement())
  postStatus String?   @map("post_status")
  createdAt  DateTime? @map("created_at")

  @@map("posts")
}
```

这样数据库里还是：

```txt
posts 表
post_status 字段
created_at 字段
```

但是代码里可以写：

```ts
await prisma.post.findMany()
```

对象字段也可以写：

```ts
post.postStatus
post.createdAt
```

这就更符合前端 / TypeScript 的命名习惯。

---

## 10. Nuxt 中如何创建 Prisma 实例？

推荐放在：

```txt
server/utils/db.ts
```

示例：

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

这里使用 `globalThis` 是为了避免 Nuxt 开发环境热更新时重复创建太多数据库连接。

然后在 API 里使用：

```ts
export default defineEventHandler(async () => {
  const posts = await prisma.posts.findMany()

  return posts
})
```

路径：

```txt
server/api/posts.get.ts
```

前端页面中请求：

```vue
<script setup lang="ts">
const { data: posts } = await useFetch('/api/posts')
</script>

<template>
  <div>
    <div v-for="post in posts" :key="post.id">
      {{ post.title }}
    </div>
  </div>
</template>
```

---

## 11. 报错：Unknown authentication plugin `sha256_password`

你遇到过这个错误：

```txt
Error querying the database: Unknown authentication plugin `sha256_password`
```

意思是：

```txt
Prisma 连接 MySQL 时，
发现当前数据库用户使用的是 sha256_password 认证插件，
但 Prisma 当前连接方式不支持它。
```

这不是表结构问题，也不是数据库不存在，而是 **MySQL 用户认证方式问题**。

可以先查看用户认证插件：

```sql
SELECT user, host, plugin
FROM mysql.user;
```

推荐做法是：给项目单独创建一个用户。

```sql
CREATE USER 'blog_user'@'localhost'
IDENTIFIED WITH caching_sha2_password BY '你的密码';

GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'localhost';

FLUSH PRIVILEGES;
```

然后 `.env` 改成：

```env
DATABASE_URL="mysql://blog_user:你的密码@localhost:3306/blog_db"
```

再执行：

```bash
npx prisma db pull
```

---

## 12. 警告：database comments not yet fully supported

你还遇到了这个 warning：

```txt
These objects have comments defined in the database, which is not yet fully supported.
```

意思是：

```txt
你的 MySQL 表和字段里有 COMMENT 注释，
Prisma 发现了这些注释，
但 Prisma 目前不能完整支持同步这些数据库注释。
```

比如数据库里可能有：

```sql
title VARCHAR(255) COMMENT '文章标题'
```

Prisma 可以识别字段，但不会完整保留这些 comment。

这个 warning **不影响使用**。

最关键的是这句：

```txt
✔ Introspected 3 models and wrote them into prisma/schema.prisma
```

说明 introspect 已经成功了。

后续直接执行：

```bash
npx prisma generate
```

就行。

---

## 13. 当前你的项目推荐流程

因为你已经有了 `blog_db`，也已经有了这些表：

```txt
posts
tags
post_tags
```

所以你现在最适合的流程是：

```bash
npx prisma db pull
npx prisma generate
```

然后在 Nuxt 里写：

```txt
server/utils/db.ts
server/api/posts.get.ts
```

先跑通最简单的查询：

```ts
export default defineEventHandler(async () => {
  const posts = await prisma.posts.findMany()
  return posts
})
```

等查询跑通后，再考虑整理模型命名，比如把：

```prisma
model posts
```

改成：

```prisma
model Post {
  @@map("posts")
}
```

---

## 14. 最后记忆版

你可以只记这一小段：

```txt
Prisma 初始化分两种情况：

1. 新数据库、新项目：
   prisma init
   写 schema.prisma
   prisma migrate dev
   prisma generate

2. 已有数据库、已有表：
   prisma init
   配 DATABASE_URL
   prisma db pull
   prisma generate

db pull 是数据库 → schema.prisma
migrate dev 是 schema.prisma → 数据库
generate 是 schema.prisma → 可在代码里用的 Prisma Client

Nuxt 中 Prisma 只能放在 server 层，不能直接放到 Vue 页面组件里。
```

你现在这个博客项目属于第二种：**已有数据库、已有表，所以先 `db pull`，再 `generate`。**
