import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types/app'
import { requireAdmin, requireAuth } from '../middlewares/auth'
import { getDB } from '../db/client'
import { parseJSON } from '../utils/validation'
import { success } from '../utils/response'
import { AppError } from '../utils/error'
import { getCommentsList, createCommentById, removeComment } from '../services/comment.service'
import { findAdminPostById } from '../repositories/posts.repository'
import { softDeleteCommentById } from '../repositories/comments.repository'

const commentSchema = z.object({
  content:
    z.string().trim().min(1).max(1000)
})

export const commentsRoutes = new Hono<AppEnv>()

commentsRoutes.get('/posts/:id/comments', async (c) => {
  const postId = c.req.param('id')
  if (!postId) throw new AppError(400, '文章id无效')

  const rows = await getCommentsList(getDB(c.env), Number(postId))

  return c.json(success(rows, '获取评论列表成功'))
})

commentsRoutes.post('/posts/:id/comments', requireAuth, async (c) => {
  const postId = c.req.param('id')
  if (!postId) throw new AppError(400, '文章id无效')

  const body = await parseJSON(c, commentSchema)

  const result = await createCommentById(getDB(c.env), {
    content: body.content,
    user_id: String(c.get('user').id),
    post_id: postId
  })

  return c.json(success(result, '评论发布成功'), 201)
})

commentsRoutes.delete('/comments/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  if (!id) throw new AppError(400, '评论id无效')

  await removeComment(getDB(c.env), Number(id), c.get('user'))

  return c.json(success({ ok: true }, '评论删除成功'))
})