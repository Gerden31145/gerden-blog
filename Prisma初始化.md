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

# 如何写Nuxt接口

写 Nuxt 接口时，Prisma 最常用的语法可以先记成一个固定模板：

```
await prisma.模型名.操作方法({
  where: {},
  select: {},
  include: {},
  orderBy: {},
  skip: 0,
  take: 10,
  data: {}
})
```

比如你的数据库里有 `posts` 表，Prisma introspect 后如果生成的是：

```
model posts {
  id      Int    @id @default(autoincrement())
  title   String
  content String
}
```

那么调用就是：

```
prisma.posts.findMany()
```

如果模型叫：

```
model Post {
  id      Int    @id @default(autoincrement())
  title   String
}
```

那么调用就是：

```
prisma.post.findMany()
```

Prisma Client 是根据 `schema.prisma` 自动生成的类型安全查询客户端，所以模型名、字段名都会来自你的 schema。修改 schema 后通常需要重新执行 `npx prisma generate`。Prisma 官方文档也把 Prisma Client 定义为基于 Prisma Schema 自动生成、类型安全的 query builder。([Prisma](https://www.prisma.io/docs/orm/prisma-client?utm_source=chatgpt.com))

------

最核心的 CRUD 是这几个：

```
prisma.posts.findMany()     // 查询多条
prisma.posts.findUnique()   // 根据唯一字段查一条
prisma.posts.findFirst()    // 按条件查第一条
prisma.posts.create()       // 新增
prisma.posts.update()       // 修改
prisma.posts.delete()       // 删除
prisma.posts.count()        // 统计数量
```

Prisma 官方 CRUD 文档也是围绕 Create、Read、Update、Delete 这些操作展开的。([Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting?utm_source=chatgpt.com))

------

## 1. 查询文章列表：`findMany`

最简单：

```
const posts = await prisma.posts.findMany()
```

常见写法：

```
const posts = await prisma.posts.findMany({
  orderBy: {
    created_at: 'desc'
  }
})
```

意思是：

```
查 posts 表的多条数据，并按 created_at 倒序排列
```

在 Nuxt 接口里可以这样写：

```
// server/api/posts/index.get.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  const posts = await prisma.posts.findMany({
    orderBy: {
      created_at: 'desc'
    }
  })

  return posts
})
```

------

## 2. 查询单篇文章：`findUnique`

如果根据 `id` 查文章：

```
const post = await prisma.posts.findUnique({
  where: {
    id: 1
  }
})
```

注意：`findUnique` 的 `where` 里面必须是唯一字段，比如 `id`、`slug`，或者你在 Prisma 里标了 `@unique` 的字段。

比如你的文章 slug 是唯一的：

```
const post = await prisma.posts.findUnique({
  where: {
    slug: 'vue3-prisma-blog'
  }
})
```

放到 Nuxt 动态接口里：

```
// server/api/posts/[id].get.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '文章 id 不合法'
    })
  }

  const post = await prisma.posts.findUnique({
    where: {
      id
    }
  })

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: '文章不存在'
    })
  }

  return post
})
```

------

## 3. 条件查询：`where`

`where` 就相当于 SQL 里的 `WHERE`。

比如查已发布文章：

```
const posts = await prisma.posts.findMany({
  where: {
    post_status: 'published'
  }
})
```

模糊搜索标题：

```
const posts = await prisma.posts.findMany({
  where: {
    title: {
      contains: 'Vue'
    }
  }
})
```

多个条件：

```
const posts = await prisma.posts.findMany({
  where: {
    post_status: 'published',
    title: {
      contains: 'Vue'
    }
  }
})
```

这相当于：

```
WHERE post_status = 'published'
AND title LIKE '%Vue%'
```

Prisma 的过滤和排序主要就是通过 `where`、`orderBy` 这些字段完成的，也支持组合条件和关系过滤。([Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting?utm_source=chatgpt.com))

------

## 4. 只返回部分字段：`select`

默认情况下，Prisma 会返回整条记录。接口开发时，经常不想把所有字段都返回给前端，比如文章列表不需要 `content` 全文。

```
const posts = await prisma.posts.findMany({
  select: {
    id: true,
    title: true,
    slug: true,
    summary: true,
    created_at: true
  }
})
```

返回结果里就只有这些字段。

这个在博客列表接口里很常用：

```
// server/api/posts/index.get.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  const posts = await prisma.posts.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      cover_image: true,
      published_at: true
    },
    where: {
      post_status: 'published'
    },
    orderBy: {
      published_at: 'desc'
    }
  })

  return posts
})
```

这比直接返回 `content` 更合理，因为文章正文可能很大。

------

## 5. 排序：`orderBy`

按创建时间倒序：

```
const posts = await prisma.posts.findMany({
  orderBy: {
    created_at: 'desc'
  }
})
```

按浏览量倒序：

```
const posts = await prisma.posts.findMany({
  orderBy: {
    view_count: 'desc'
  }
})
```

多个排序条件：

```
const posts = await prisma.posts.findMany({
  orderBy: [
    {
      post_status: 'asc'
    },
    {
      created_at: 'desc'
    }
  ]
})
```

------

## 6. 分页：`skip` 和 `take`

这是接口里非常常用的。

```
const posts = await prisma.posts.findMany({
  skip: 0,
  take: 10
})
```

意思是：

```
跳过 0 条，取 10 条
```

如果前端传：

```
/api/posts?page=2&pageSize=10
```

接口可以这样写：

```
// server/api/posts/index.get.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const page = Number(query.page || 1)
  const pageSize = Number(query.pageSize || 10)

  const posts = await prisma.posts.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      created_at: 'desc'
    }
  })

  const total = await prisma.posts.count()

  return {
    page,
    pageSize,
    total,
    list: posts
  }
})
```

Prisma 分页常用两类方式：一种是 `skip` / `take` 这种 offset pagination，另一种是基于 cursor 的分页。普通博客后台、文章列表先用 `skip` / `take` 就够了。([Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/pagination?utm_source=chatgpt.com))

------

## 7. 新增数据：`create`

创建文章：

```
const post = await prisma.posts.create({
  data: {
    title: '我的第一篇文章',
    slug: 'my-first-post',
    summary: '文章摘要',
    content: '文章正文',
    post_status: 'draft'
  }
})
```

放到 Nuxt POST 接口里：

```
// server/api/posts/index.post.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.title || !body.content) {
    throw createError({
      statusCode: 400,
      statusMessage: '标题和内容不能为空'
    })
  }

  const post = await prisma.posts.create({
    data: {
      title: body.title,
      slug: body.slug,
      summary: body.summary,
      content: body.content,
      post_status: body.post_status || 'draft',
      cover_image: body.cover_image || null
    }
  })

  return post
})
```

`data` 就是要插入数据库的数据。

你可以把它类比成 SQL：

```
INSERT INTO posts (title, slug, summary, content)
VALUES (...)
```

------

## 8. 修改数据：`update`

根据 `id` 修改文章：

```
const post = await prisma.posts.update({
  where: {
    id: 1
  },
  data: {
    title: '新的标题',
    content: '新的内容'
  }
})
```

放到接口里：

```
// server/api/posts/[id].put.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '文章 id 不合法'
    })
  }

  const post = await prisma.posts.update({
    where: {
      id
    },
    data: {
      title: body.title,
      slug: body.slug,
      summary: body.summary,
      content: body.content,
      post_status: body.post_status,
      cover_image: body.cover_image
    }
  })

  return post
})
```

注意，`update` 的 `where` 也必须是唯一字段。

------

## 9. 删除数据：`delete`

根据 `id` 删除文章：

```
await prisma.posts.delete({
  where: {
    id: 1
  }
})
```

接口：

```
// server/api/posts/[id].delete.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '文章 id 不合法'
    })
  }

  await prisma.posts.delete({
    where: {
      id
    }
  })

  return {
    message: '删除成功'
  }
})
```

------

## 10. 批量操作：`createMany`、`updateMany`、`deleteMany`

批量插入：

```
await prisma.tags.createMany({
  data: [
    {
      name: 'Vue',
      slug: 'vue'
    },
    {
      name: 'Nuxt',
      slug: 'nuxt'
    }
  ]
})
```

批量修改：

```
await prisma.posts.updateMany({
  where: {
    post_status: 'draft'
  },
  data: {
    post_status: 'published'
  }
})
```

批量删除：

```
await prisma.posts.deleteMany({
  where: {
    post_status: 'draft'
  }
})
```

注意，`updateMany` 和 `deleteMany` 很猛，条件写错可能会影响很多数据。真实项目里后台接口最好谨慎用。

------

## 11. 关联查询：`include`

假设你的文章和标签有关联，Prisma schema 里如果已经有关系字段，比如：

```
model posts {
  id        Int         @id @default(autoincrement())
  title     String
  post_tags post_tags[]
}

model tags {
  id        Int         @id @default(autoincrement())
  name      String
  post_tags post_tags[]
}

model post_tags {
  post_id Int
  tags_id Int

  posts posts @relation(fields: [post_id], references: [id])
  tags  tags  @relation(fields: [tags_id], references: [id])
}
```

那查询文章时可以带上标签关联：

```
const post = await prisma.posts.findUnique({
  where: {
    id: 1
  },
  include: {
    post_tags: {
      include: {
        tags: true
      }
    }
  }
})
```

返回结构大概是：

```
{
  id: 1,
  title: '文章标题',
  post_tags: [
    {
      post_id: 1,
      tags_id: 2,
      tags: {
        id: 2,
        name: 'Vue'
      }
    }
  ]
}
```

`include` 是用来把关联数据一起查出来的；`select` 是用来控制返回哪些字段的。Prisma 官方关系查询文档里也提到，可以用 `select` 或 `include` 返回相关联的数据，并且可以在关系字段内部继续过滤和排序。([Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries?utm_source=chatgpt.com))

------

## 12. 创建文章 + 创建关联表：事务 `$transaction`

你的博客大概率会有这种需求：

```
创建文章
同时给文章绑定多个标签
```

这不是一条 SQL 能简单完成的。通常要：

```
1. 插入 posts
2. 拿到新文章 id
3. 插入 post_tags 关联表
```

为了避免第一步成功、第三步失败导致脏数据，最好用事务。

```
const result = await prisma.$transaction(async (tx) => {
  const post = await tx.posts.create({
    data: {
      title: body.title,
      slug: body.slug,
      summary: body.summary,
      content: body.content,
      post_status: body.post_status || 'draft'
    }
  })

  await tx.post_tags.createMany({
    data: body.tagIds.map((tagId: number) => ({
      post_id: post.id,
      tags_id: tagId
    }))
  })

  return post
})
```

完整接口：

```
// server/api/posts/index.post.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.title || !body.content) {
    throw createError({
      statusCode: 400,
      statusMessage: '标题和内容不能为空'
    })
  }

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.posts.create({
      data: {
        title: body.title,
        slug: body.slug,
        summary: body.summary,
        content: body.content,
        post_status: body.post_status || 'draft',
        cover_image: body.cover_image || null
      }
    })

    if (Array.isArray(body.tagIds) && body.tagIds.length > 0) {
      await tx.post_tags.createMany({
        data: body.tagIds.map((tagId: number) => ({
          post_id: createdPost.id,
          tags_id: tagId
        }))
      })
    }

    return createdPost
  })

  return post
})
```

Prisma 官方文档说明，事务是一组读写操作，要么整体成功，要么整体失败；Prisma 支持嵌套写入、`$transaction([])` 和交互式事务等方式。([Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/transactions?utm_source=chatgpt.com))

这个语法你后面一定会用到，尤其是文章、标签、分类、用户权限这种多表操作。

------

## 13. 常见查询组合：博客列表接口实战版

这个比较接近你后面真正会写的接口：

```
// server/api/posts/index.get.ts

import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const page = Number(query.page || 1)
  const pageSize = Number(query.pageSize || 10)
  const keyword = String(query.keyword || '')
  const status = String(query.status || 'published')

  const where = {
    post_status: status,
    ...(keyword
      ? {
          title: {
            contains: keyword
          }
        }
      : {})
  }

  const [list, total] = await prisma.$transaction([
    prisma.posts.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        cover_image: true,
        post_status: true,
        published_at: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),

    prisma.posts.count({
      where
    })
  ])

  return {
    page,
    pageSize,
    total,
    list
  }
})
```

这里用到了几个关键 Prisma 语法：

```
where      // 查询条件
select     // 返回哪些字段
orderBy    // 排序
skip       // 跳过多少条
take       // 取多少条
count      // 统计总数
$transaction // 同时执行列表查询和总数查询
```

这基本就是后台列表接口的标准形态。

------

## 14. 你现在最该记住的 Prisma 参数

写接口时先记这几个就够了：

```
where
```

用来写查询条件。

```
data
```

用来写新增或修改的数据。

```
select
```

控制返回哪些字段。

```
include
```

查询关联数据。

```
orderBy
```

排序。

```
skip / take
```

分页。

```
$transaction
```

事务，多表操作时用。

------

你可以把 Prisma API 和 SQL 粗略对应成这样：

```
prisma.posts.findMany()      ≈ SELECT * FROM posts
where                        ≈ WHERE
select                       ≈ SELECT id, title, ...
orderBy                      ≈ ORDER BY
skip / take                  ≈ OFFSET / LIMIT
create                       ≈ INSERT
update                       ≈ UPDATE
delete                       ≈ DELETE
include                      ≈ JOIN / 关联查询
$transaction                 ≈ BEGIN / COMMIT / ROLLBACK
```

目前你写 Nuxt 博客接口，先重点掌握：

```
findMany()
findUnique()
create()
update()
delete()
count()
where
data
select
include
orderBy
skip
take
$transaction()
```

这一套就够你完成文章 CRUD、标签 CRUD、文章分页、文章搜索、文章详情、后台管理面板的大部分接口了。