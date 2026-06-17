import type { Db } from '../db/client'
import type { AdminPostInput } from
  '../types/post'
import { markdownToHTML } from './markdown.service'
import { uniqueSlug } from '../utils/slug'
import { AppError } from '../utils/error'
import {
  createPostWithTags,
  deletePostById,
  findAdminPostById,
  updatePostWithTags
} from '../repositories/posts.repository'

export async function createAdminPost(db: Db, input: AdminPostInput) {
  const rendered = await markdownToHTML(input.content)
  const now = new Date().toISOString()

  return createPostWithTags(db, {
    title: input.title,
    summary: input.summary ?? '',
    content: input.content,
    contentHTML: rendered.html,
    toc: JSON.stringify(rendered.toc),
    post_status: input.postStatus,
    published_at: input.postStatus ===
      'published' ? now : null,
    post_tags: input.tags
  })
}

export async function updateAdminPost(db: Db, id: number, input: AdminPostInput) {
  const existing = await findAdminPostById(db, id)
  if (!existing) throw new AppError(404, 'Not Found')

  const rendered = await markdownToHTML(input.content)

  return updatePostWithTags(db, id, {
    title: input.title,
    slug: input.title ===
      existing.title
      ? existing.slug
      : uniqueSlug(input.title, id),
    summary: input.summary ?? '',
    content: input.content,
    contentHtml: rendered.html,
    toc: JSON.stringify(rendered.toc),
    postStatus: input.postStatus,
    publishedAt: input.postStatus ===
      'published'
      ? existing.publishedAt ?? new
        Date().toISOString()
      : null,
    tags: input.tags
  })
}

export async function
  removeAdminPost(db: Db, id: number) {
  const existing = await
    findAdminPostById(db, id)
  if (!existing) throw new
    AppError(404, '文章不存在')

  await deletePostById(db, id)
}