// 1. zod类型约束
// 2. 限制文件大小
// 3. 读取formData，处理各种字段，包括tags
// 4. 传入zod
// 5. 构建事务，写入数据库
// 6. 返回处理的结果

import { z } from "zod";
import { createError, getHeader, readFormData } from 'h3'
import type { H3Event } from "h3";
import markdownToHTML from '../utils/markdown/markdown'
import { generateSlug } from "../utils/slug";
import { prisma } from "../utils/prisma";

const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题过长'),
  summary: z.string().max(300, '概览内容不能过长').optional(),
  slug: z.string().min(0, 'slug过短').max(100, 'slug过长').optional(),
  post_status: z.enum(['draft', 'published', 'hidden']).default('draft'),
  tags: z.array(z.string().min(1)).default([])
})

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

function getTags(formData: FormData) {
  const value = formData.get('tags')

  if (!value) return []
  if (typeof value !== 'string') throw new Error('数组类型错误')

  try {
    const tags = JSON.parse(value)

    if (!Array.isArray(tags)) throw new Error('tags期望数组类型')

    return tags.filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim())
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

async function readPostFormData(event: H3Event) {
  const contentType = getHeader(event, 'content-type')

  if (!contentType?.includes('multipart/form-data')) {
    throw createError({
      statusCode: 400,
      statusMessage: '请求体必须是 multipart/form-data，请使用 form-data 并上传 file 字段'
    })
  }

  try {
    return await readFormData(event)
  } catch (err) {
    const reason = err instanceof Error ? err.message : '未知错误'

    throw createError({
      statusCode: 400,
      statusMessage: `FormData 解析失败：请求头是 multipart/form-data，但请求体不是合法的 multipart 格式，或 boundary 与请求体不匹配。当前 Content-Type：${contentType}。原始错误：${reason}`
    })
  }
}

export async function createPost(event: H3Event) {
  const formData = await readPostFormData(event)
  const file = formData.get('file')

  if (!(file instanceof File)) {
    throw createError({
      statusCode: 400,
      statusMessage: '请上传文件'
    })
  }

  if (!(file.name.endsWith('.md'))) {
    throw createError({
      statusCode: 400,
      statusMessage: '请上传md文件'
    })
  }

  const contentMd = await file.text()

  const payload = createPostSchema.parse({
    title: getString(formData, 'title'),
    summary: getString(formData, 'summary'),
    slug: getString(formData, 'slug'),
    post_status: getString(formData, 'post_status'),
    tags: getTags(formData)
  })

  const contentHTML = await markdownToHTML(contentMd)

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
