import type { Db } from '../db/client'
import type { AdminPostInput, UpdatePostInput } from
  '../types/post'
import { markdownToHTML } from './markdown.service'
import { uniqueSlug } from '../utils/slug'
import { AppError } from '../utils/error'
import { sha256Hex } from '../utils/hash'
import {
  createPostWithTags,
  deletePostById,
  findAdminPostById,
  updatePostWithTags
} from '../repositories/posts.repository'

export async function createAdminPost(db: Db, input: AdminPostInput) {
  const now = new Date().toISOString()

  const contentHash = await sha256Hex(input.content)

  const jobId = crypto.randomUUID()

  return createPostWithTags(db, {
    title: input.title,
    summary: input.summary ?? '',
    content: input.content,
    contentHTML: '',
    toc: '[]',
    post_status: input.post_status,
    published_at: input.post_status ===
      'published' ? now : null,
    post_tags: input.post_tags,
    content_hash: contentHash
  },
    jobId
  )
}

export async function updateAdminPost(db: Db, id: number, input: UpdatePostInput) {
  const existing = await findAdminPostById(db, id)
  if (!existing) throw new AppError(404, 'Not Found')

  const contentHash = await sha256Hex(input.content)

  return updatePostWithTags(db, {
    title: input.title,
    summary: input.summary ?? '',
    content: input.content,
    contentHTML: '',
    toc: '[]',
    post_status: input.post_status,
    published_at: input.post_status ===
      'published'
      ? existing.publishedAt ?? new
        Date().toISOString()
      : null,
    post_tags: input.post_tags,
    content_hash: contentHash
  }, id)
}

export async function
  removeAdminPost(db: Db, id: number) {
  const existing = await
    findAdminPostById(db, id)
  if (!existing) throw new
    AppError(404, '文章不存在')

  await deletePostById(db, id)
}