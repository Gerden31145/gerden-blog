import type { AppBindings } from '../types/app'
import type { RenderPostMessage } from '../types/render-job'
import { getDB } from '../db/client'
import { processPostRenderJob } from '../services/render-jobs.service'

export async function handlePostRenderBatch(
  env: AppBindings,
  batch: MessageBatch<RenderPostMessage>
) {
  const db = getDB(env)
  for (const message of batch.messages) {
    try {
      await processPostRenderJob(db, message.body, message.attempts)
      message.ack()
    } catch {
      message.retry()
    }
  }
}