import type { Db } from '../db/client'
import type { RenderPostMessage } from '../types/render-job'
import { markdownToHTML } from './markdown.service'
import {
  findPostForRender,
  markPostRenderFailed,
  markPostRenderRunning,
  markRenderJobFailed,
  markRenderJobRunning,
  markRenderJobSkipped,
  markRenderJobSucceeded,
  writeRenderedPost,
} from '../repositories/render-jobs.repository'

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

export async function processPostRenderJob(
  db: Db,
  message: RenderPostMessage,
  attempts: number
) {
  const start = Date.now()

  const post = await findPostForRender(db, message.postId)

  if (!post) {
    await markRenderJobSkipped(db, message.jobId, 'Post not found')
    return
  }

  if (post.contentHash !== message.contentHash) {
    await markRenderJobSkipped(db, message.jobId, 'Stale content hash')
    return
  }

  // 开始执行异步渲染
  await markRenderJobRunning(db, message.jobId, attempts)
  await markPostRenderRunning(db, message.postId, message.contentHash)

  try {
    const rendered = await markdownToHTML(post.content)

    const updated = await writeRenderedPost(db, post.id, post.contentHash, rendered.html, rendered.toc)

    if (!updated) {
      await markRenderJobSkipped(db, message.jobId, 'Post changed while rendering')
      return
    }

    await markRenderJobSucceeded(db, message.jobId)

    console.log(JSON.stringify({
      event: 'post_render_succeeded',
      jobId: message.jobId,
      postId: message.postId,
      reason: message.reason,
      attempts,
      elapsedMs: Date.now() - start,
    }))
  } catch (err) {
    const errorMessage = toErrorMessage(err)

    await markPostRenderFailed(db, post.id, post.contentHash, errorMessage)
    await markRenderJobFailed(db, message.jobId, errorMessage, attempts)

    console.error(JSON.stringify({
      event: 'post_render_failed',
      jobId: message.jobId,
      postId: message.postId,
      reason: message.reason,
      attempts,
      error: errorMessage,
    }))

    throw err
  }
}