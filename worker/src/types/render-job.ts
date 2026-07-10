export type RenderStatus = 'pending' | 'rendering' | 'ready'
  | 'failed'

export type RenderPostMessage = {
  jobId: string,
  postId: number,
  contentHash: string,
  reason: 'create' | 'update'
}