export type CommentStatus = 'visible' | 'hidden' | 'deleted'

export interface CommentUser {
  id: string
  username: string
}

export interface CommentItem {
  id: string
  post_id: string
  user_id: string
  content: string
  status: CommentStatus
  created_at: string
  updated_at: string
  user: CommentUser
}
