export type CommentStatus = 'visible' | 'deleted'

export type CommentItem = {
  id: string,
  post_id: string
  user_id: string
  content: string
  status: CommentStatus
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
  }
}

export type CreatedComment =
  Pick<CommentItem, 'post_id' | 'content' | 'user_id'>