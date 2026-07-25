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
import { sendPostRender } from '../services/render-queue.service'
import { RenderPostMessage } from '../types/render-job'
import { markPostRenderFailed, markRenderJobFailed } from '../repositories/render-jobs.repository'

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

export async function createAdminPost(db: Db, queue: Queue<RenderPostMessage>, input: AdminPostInput) {
  const now = new Date().toISOString()

  const contentHash = await sha256Hex(input.content)

  const jobId = crypto.randomUUID()

  const post = await createPostWithTags(db, {
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

  if (!post) throw new AppError(500, '文章创建失败')

  try {
    await sendPostRender({
      jobId,
      postId: post.id,
      contentHash: post.contentHash,
      reason: 'create'
    }, queue)
  } catch (err) {
    const message = `Queue send failed: ${toErrorMessage(err)}`
    await markRenderJobFailed(db, jobId, message, 0)
    await markPostRenderFailed(db, post.id, post.contentHash, message)
    throw new AppError(500, '文章已保存，但渲染任务入队失败')
  }

  return post
}

export async function updateAdminPost(db: Db, id: number, queue: Queue<RenderPostMessage>, input: UpdatePostInput) {
  const existing = await findAdminPostById(db, id)
  if (!existing) throw new AppError(404, 'Not Found')

  const contentHash = await sha256Hex(input.content)

  const jobId = crypto.randomUUID()

  const post = await updatePostWithTags(db, {
    title: input.title,
    summary: input.summary ?? '',
    content: input.content,
    contentHTML: existing.contentHtml,
    toc: existing.toc,
    post_status: input.post_status,
    published_at: input.post_status ===
      'published'
      ? existing.publishedAt ?? new
        Date().toISOString()
      : null,
    post_tags: input.post_tags,
    content_hash: contentHash
  }, id, jobId)

  if (!post) throw new AppError(500, '文章更新失败')

  if (contentHash === existing.contentHash) return existing // 如果文章内容没变，无需重新渲染

  try {
    await sendPostRender({
      jobId,
      postId: post.id,
      contentHash,
      reason: 'update'
    }, queue)
  } catch (err) {
    const message = `Queue send failed: ${toErrorMessage(err)}`
    await markRenderJobFailed(db, jobId, message, 0)
    await markPostRenderFailed(db, post.id, post.contentHash, message)
    throw new AppError(500, '文章已保存，但渲染任务入队失败')
  }

  return post
}

export async function
  removeAdminPost(db: Db, id: number) {
  const existing = await
    findAdminPostById(db, id)
  if (!existing) throw new
    AppError(404, '文章不存在')

  await deletePostById(db, id)
}