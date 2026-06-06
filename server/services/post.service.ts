// 1. zod类型约束
// 2. 限制文件大小
// 3. 读取formData，处理各种字段，包括tags
// 4. 传入zod
// 5. 构建事务，写入数据库
// 6. 返回处理的结果

import { z } from "zod";
import { createError, getHeader, readFormData } from 'h3'
import type { H3Event, MultiPartData } from "h3";
import markdownToHTML from '../utils/markdown/markdown'
import { generateSlug } from "../utils/slug";
import { prisma } from "../utils/prisma";
import { PostList } from "~/types/posts";

interface ResJSON {
  title: string,
  slug?: string,
  tags: string[],
  summary: string,
  post_status: 'draft' | 'published' | 'hidden',
  published_at: string
}

const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题过长'),
  summary: z.string().max(300, '概览内容不能过长').optional(),
  slug: z.string().min(0, 'slug过短').max(100, 'slug过长').optional(),
  post_status: z.enum(['draft', 'published', 'hidden']).default('draft'),
  tags: z.array(z.string().min(1)).default([]),
  published_at: z.date().default(new Date())
})

function getString(parts: ResJSON, key: keyof ResJSON) {
  return parts[key] ? parts[key] : undefined
}

function getTags(parts: ResJSON) {
  const value = parts.tags

  if (!value) return []

  try {
    if (!Array.isArray(value)) throw new Error('tags期望数组类型')
    return value
  } catch {
    throw new Error('处理formData的tags数组出现错误')
  }
}

async function generateOnlyPostSlug(baseSlug: string) {
  let slug = baseSlug
  let count = 1

  while (true) {
    const existed = await prisma.posts.findUnique({
      where: {
        slug: slug
      }
    })

    if (!existed) return slug

    slug = `${baseSlug}-${count}`
    count++
  }
}

async function generateOnlyTagSlug(baseSlug: string) {
  let slug = baseSlug
  let count = 1

  while (true) {
    const existed = await prisma.tags.findUnique({
      where: {
        slug: slug
      }
    })

    if (!existed) return slug

    slug = `${baseSlug}-${count}`
    count++
  }
}

async function updateSlug(updatedSlug: string, title: string) {

  const post = await prisma.posts.findUnique({
    where: {
      slug: updatedSlug
    }
  })

  if (!post) throw createError({
    message: 'Can not find the post when updating the slug'
  })

  if (post.title === title) return post.slug
  else return generateOnlyPostSlug(title)
}

export async function createPost(event: H3Event) {
  const parts = await readMultipartFormData(event)

  if (!parts) {
    throw createError({
      statusCode: 400,
      message: 'FormData is empty'
    })
  }

  const filePart = parts?.find(p => p.name === 'file')

  const meta = parts.find(p => p.name === 'meta')

  if (!filePart || !filePart.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please upload file'
    })
  }

  if (!(filePart.filename.endsWith('.md'))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please upload md file'
    })
  }

  const contentMd = filePart.data.toString('utf-8')

  if (!meta) throw createError({
    statusCode: 400,
    message: 'meta is empty'
  })

  const metaData = JSON.parse(meta.data.toString())

  const payload = createPostSchema.parse({
    title: getString(metaData, 'title'),
    summary: getString(metaData, 'summary'),
    slug: getString(metaData, 'slug'),
    post_status: getString(metaData, 'post_status'),
    tags: getTags(metaData)
  })

  const { html: contentHTML, toc } = await markdownToHTML(contentMd)

  let slug = payload.slug || generateSlug(payload.title)
  slug = await generateOnlyPostSlug(slug)

  // 数据库写入事务
  await prisma.$transaction(async (tx) => {
    const createdPost = await tx.posts.create({
      data: {
        title: payload.title,
        summary: payload.summary,
        slug: slug,
        post_status: payload.post_status,
        content: contentMd,
        content_html: contentHTML,
        toc: JSON.parse(JSON.stringify(toc)) as object,
        published_at: payload.post_status === 'published' ? new Date() : null
      }
    })

    for (const tagName of payload.tags) {
      const tag = await tx.tags.upsert({
        where: {
          name: tagName
        },
        create: {
          name: tagName,
          slug: await generateOnlyTagSlug(generateSlug(tagName))
        },
        update: {
        }
      })

      await tx.post_tags.create({
        data: {
          post_id: createdPost.id,
          tags_id: tag.id
        }
      })
    }
  })

  return {
    message: '创建文章成功'
  }
}

export async function deletePost(slug: string) {
  const post = await prisma.posts.findUnique({
    where: {
      slug
    }
  })

  if (!post) throw createError({
    statusCode: 404,
    message: 'Post not found'
  })

  await prisma.posts.delete({
    where: {
      slug
    }
  })

  return {
    message: 'delete success'
  }
}

export async function updatePost(event: H3Event) {
  const parts = await readMultipartFormData(event)

  if (!parts) throw createError({
    statusCode: 400,
    message: 'FormData is empty'
  })

  const filePart = parts.find(p => p.name === 'file')
  const meta = parts.find(p => p.name === 'meta')

  if (!filePart || !filePart.filename) throw createError({
    message: 'Please upload file'
  })

  if (!filePart.filename.endsWith('.md')) throw createError({
    message: 'Please upload md file',
    statusCode: 400
  })

  if (!meta) throw createError({
    message: 'meta is empty'
  })

  const metaData = JSON.parse(meta.data.toString())

  const result = createPostSchema.safeParse({
    title: getString(metaData, 'title'),
    summary: getString(metaData, 'summary'),
    slug: getString(metaData, 'slug'),
    post_status: getString(metaData, 'post_status'),
    tags: getTags(metaData),
    published_at: metaData.published_at ? new Date(metaData.published_at)
      : new Date()
  })

  if (!result.success) throw createError({
    message: 'Parameter validation failed',
    statusCode: 400
  })

  const payload = result.data

  if (!metaData.id) throw createError({
    message: 'post id required',
    statusCode: 400
  })

  const id = BigInt(metaData.id)

  const slug = await updateSlug(
    id,
    payload.title
  )

  const content = filePart.data.toString('utf-8')
  const { html: contentHTML, toc } = await markdownToHTML(content)

  await prisma.$transaction(async (tx) => {
    const updatedPost = await tx.posts.update({
      data: {
        title: payload.title,
        summary: payload.summary,
        slug,
        post_status: payload.post_status,
        content: content,
        content_html: contentHTML,
        toc: JSON.parse(JSON.stringify(toc)) as object,
        published_at:
          payload.post_status === 'published' ?
            payload.published_at : null,
        updated_at: new Date()
      },
      where: {
        id
      }
    })

    await tx.post_tags.deleteMany({
      where: {
        post_id: id
      }
    })

    for (const tagName of payload.tags) {
      const tag = await tx.tags.upsert({
        where: {
          name: tagName
        },
        create: {
          name: tagName,
          slug: await generateOnlyTagSlug(generateSlug(tagName))
        },
        update: {
        }
      })

      await tx.post_tags.create({
        data: {
          post_id: updatedPost.id,
          tags_id: tag.id
        }
      })
    }

  })
  return {
    message: 'Update success'
  }
}
