## 完整解析：markdown转html服务+数据库写入文件

### 总览

这是一个后端服务模块，用于实现用户上传博客md文件，转换为html文件之后，将完整数据写入数据的业务。其中涉及运行时类型检查、文件大小限制、字段合法性检查、文件类型检查、slug唯一性检查和修改以及数据库写入的功能

### 模块解析

#### 1. zod实例

下面的zod规范（shema）声明了一个zod对象，用于在运行时对属性进行检查

```ts
const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题太长'),
  slug: z.string().min(1).max(150).optional(),
  summary: z.string().max(300, 'summary 太长').optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  tags: z.array(z.string().min(1)).default([]),
})
```

#### 2. 字段处理函数

负责从formData里面安全地取字段，如果formData的字段不是string类型就返回undefined

```ts
function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : undefined
}
```

#### 3. tags数组处理函数

前端传过来的tags数组的json字符串，需要转换成js数组才能进一步处理

```ts
function getTags(formData: FormData) {
  const value = formData.get('tags')

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  try {
    const tags = JSON.parse(value)

    if (!Array.isArray(tags)) {
      return []
    }

    return tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}
```

#### 4. slug唯一性保证

使用数据库查询slug，如果唯一，直接返回，否则+1

```ts
async function createUniqueSlug(baseSlug: string) {
  let slug = baseSlug
  let count = 1

  while (true) {
    const existed = await prisma.posts.findUnique({
      where: { slug },
    })

    if (!existed) return slug

    count++
    slug = `${baseSlug}-${count}`
  }
}
```

#### 5. 主services函数

1. 从formData里面获取文件，并校验文件类型

   ```ts
   const file = formData.get('file')

     if (!(file instanceof File)) {
       throw createError({
         statusCode: 400,
         statusMessage: '请上传 Markdown 文件',
       })
     }

     if (!file.name.endsWith('.md')) {
       throw createError({
         statusCode: 400,
         statusMessage: '只允许上传 .md 文件',
       })
     }
   ```

2. 将文件异步文本化

   ```ts
   const contentMd = await file.text()

     if (!contentMd.trim()) {
       throw createError({
         statusCode: 400,
         statusMessage: 'Markdown 内容不能为空',
       })
     }
   ```

3. 使用zod进行表单验证并处理slug

   ```ts
   const payload = createPostSchema.parse({
       title: getString(formData, 'title'),
       slug: getString(formData, 'slug'),
       summary: getString(formData, 'summary'),
       status: getString(formData, 'status') ?? 'draft',
       tags: getTags(formData),
     })

     const baseSlug = payload.slug || generateSlug(payload.title)
     const slug = await createUniqueSlug(baseSlug)
   ```

4. 将md转换为html

   ```ts
   const contentHtml = await markdownToHtml(contentMd)
   ```

5. 定义prisma事物，插入数据库，并将结果返回给post变量

   ```ts
   const post = await prisma.$transaction(async (tx) => {
       const createdPost = await tx.posts.create({
         data: {
           title: payload.title,
           slug,
           summary: payload.summary ?? '',
           content_md: contentMd,
           content_html: contentHtml,
           post_status: payload.status,
           published_at: payload.status === 'published' ? new Date() : null,
         },
       })

       for (const tagName of payload.tags) {
         const tag = await tx.tags.upsert({
           where: {
             name: tagName,
           },
           update: {},
           create: {
             name: tagName,
           },
         })

         await tx.post_tags.create({
           data: {
             post_id: createdPost.id,
             tags_id: tag.id,
           },
         })
       }

       return createdPost
     })
   ```

6. 将处理完的结果返回

   ```ts
   return {
       id: post.id.toString(),
       title: post.title,
       slug: post.slug,
       summary: post.summary,
       status: post.post_status,
     }
   ```

   ​

### 完整代码

```typescript
// server/services/post.service.ts
import { z } from 'zod'
import type { H3Event } from 'h3'
import { assertBodySize, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { markdownToHtml } from '~/server/utils/markdown'
import { generateSlug } from '~/server/utils/slug'

const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题太长'),
  slug: z.string().min(1).max(150).optional(),
  summary: z.string().max(300, 'summary 太长').optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  tags: z.array(z.string().min(1)).default([]),
})

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : undefined
}

function getTags(formData: FormData) {
  const value = formData.get('tags')

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  try {
    const tags = JSON.parse(value)

    if (!Array.isArray(tags)) {
      return []
    }

    return tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

async function createUniqueSlug(baseSlug: string) {
  let slug = baseSlug
  let count = 1

  while (true) {
    const existed = await prisma.posts.findUnique({
      where: { slug },
    })

    if (!existed) return slug

    count++
    slug = `${baseSlug}-${count}`
  }
}

export async function createPostFromMarkdownForm(event: H3Event) {
  // 限制请求体大小，比如 2MB
  await assertBodySize(event, 2 * 1024 * 1024)

  const formData = await event.req.formData()

  const file = formData.get('file')

  if (!(file instanceof File)) {
    throw createError({
      statusCode: 400,
      statusMessage: '请上传 Markdown 文件',
    })
  }

  if (!file.name.endsWith('.md')) {
    throw createError({
      statusCode: 400,
      statusMessage: '只允许上传 .md 文件',
    })
  }

  const contentMd = await file.text()

  if (!contentMd.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Markdown 内容不能为空',
    })
  }

  const payload = createPostSchema.parse({
    title: getString(formData, 'title'),
    slug: getString(formData, 'slug'),
    summary: getString(formData, 'summary'),
    status: getString(formData, 'status') ?? 'draft',
    tags: getTags(formData),
  })

  const baseSlug = payload.slug || generateSlug(payload.title)
  const slug = await createUniqueSlug(baseSlug)

  const contentHtml = await markdownToHtml(contentMd)

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.posts.create({
      data: {
        title: payload.title,
        slug,
        summary: payload.summary ?? '',
        content_md: contentMd,
        content_html: contentHtml,
        post_status: payload.status,
        published_at: payload.status === 'published' ? new Date() : null,
      },
    })

    for (const tagName of payload.tags) {
      const tag = await tx.tags.upsert({
        where: {
          name: tagName,
        },
        update: {},
        create: {
          name: tagName,
        },
      })

      await tx.post_tags.create({
        data: {
          post_id: createdPost.id,
          tags_id: tag.id,
        },
      })
    }

    return createdPost
  })

  return {
    id: post.id.toString(),
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    status: post.post_status,
  }
}
```

