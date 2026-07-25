import { and, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { posts, renderJobs } from '../db/schema'

// find the post for rendering
export async function findPostForRender(db: Db, postId: number) {
  const [post] = await db.select({
    id: posts.id,
    content: posts.content,
    contentHash: posts.contentHash
  }).from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  return post ?? null
}

// marking
export async function markRenderJobRunning(db: Db, jobId: string, attempts: number) {
  await db.update(renderJobs)
    .set({
      status: 'running',
      attempts,
      updatedAt: new Date().toISOString()
    })
    .where(eq(renderJobs.id, jobId))
}

export async function markRenderJobSucceeded(db: Db, jobId: string) {
  await db.update(renderJobs)
    .set({
      status: 'succeeded',
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(renderJobs.id, jobId))
}

export async function markRenderJobSkipped(
  db: Db,
  jobId: string,
  reason: string
) {
  await db.update(renderJobs)
    .set({
      status: 'skipped',
      lastError: reason,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(renderJobs.id, jobId))
}

export async function markRenderJobFailed(
  db: Db,
  jobId: string,
  message: string,
  attempts: number
) {
  await db.update(renderJobs)
    .set({
      status: 'failed',
      lastError: message,
      attempts,
      updatedAt: new Date().toISOString()
    })
    .where(eq(renderJobs.id, jobId))
}

export async function markPostRenderRunning(
  db: Db,
  postId: number,
  contentHash: string
) {
  await db.update(posts)
    .set({
      renderStatus: 'rendering',
      renderError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(posts.id, postId),
      eq(posts.contentHash, contentHash),
    ))
}

export async function markPostRenderFailed(
  db: Db,
  postId: number,
  contentHash: string,
  message: string
) {
  await db.update(posts)
    .set({
      renderStatus: 'failed',
      renderError: message,
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(posts.id, postId),
      eq(posts.contentHash, contentHash),
    ))
}

export async function writeRenderedPost(
  db: Db,
  postId: number,
  contentHash: string,
  html: string,
  toc: unknown[]
) {
  const rows = await db.update(posts)
    .set({
      contentHtml: html,
      toc: JSON.stringify(toc),
      renderStatus: 'ready',
      renderError: null,
      renderedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(posts.id, postId),
      eq(posts.contentHash, contentHash),
    ))
    .returning({ id: posts.id })

  return rows.length > 0
}