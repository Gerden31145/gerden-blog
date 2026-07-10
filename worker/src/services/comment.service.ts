import type { Db } from '../db/client'
import { softDeleteCommentById, findCommentById, createComment, findVisibleCommentsById } from '../repositories/comments.repository'
import { findAdminPostById } from '../repositories/posts.repository'
import type { AuthUser } from '../types/app'
import { CommentItem, CreatedComment } from '../types/comment'
import { AppError } from '../utils/error'

export async function removeComment(db: Db, commentId: number, user: AuthUser) {
  const comment = await findCommentById(db, commentId)
  if (!comment || comment.status !== 'visible') throw new AppError(404, '评论不存在')

  const isOwner = String(user.id) === comment.user_id
  const isAdmin = user.role === 'admin'

  // 管理员可以删除任何评论 普通用户只能删除自己的评论
  if (!isOwner && !isAdmin) throw new AppError(403, '无权删除该评论')

  await softDeleteCommentById(db, commentId)
}

export async function getCommentsList(db: Db, postId: number): Promise<CommentItem[]> {
  const post = await findAdminPostById(db, postId)
  if (!post) throw new AppError(404, '文章不存在')
  if (post.postStatus !== 'published') throw new AppError(400, '文章未公开')

  return findVisibleCommentsById(db, postId)
}

export async function createCommentById(db: Db, input: CreatedComment) {
  const post = await findAdminPostById(db, Number(input.post_id))
  if (!post) throw new AppError(404, '文章不存在')
  if (post.postStatus !== 'published') throw new AppError(400, '文章未公开')

  return createComment(db, input)
}