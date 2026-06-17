import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types/app'
import { requireAdmin } from '../middlewares/auth'
import { getDB } from '../db/client'
import { parseJSON } from '../utils/validation'
import { success } from '../utils/response'
import { AppError } from '../utils/error'
import {
  createAdminPost,
  removeAdminPost,
  updateAdminPost
} from '../services/post.services'

export const adminPostsRoutes = new Hono<AppEnv>()

const postSchema = z.object({
  title:
    z.string().trim().min(1).max(120),
  summary:
    z.string().trim().max(500).optional(),
  content: z.string().min(1),
  post_status: z.enum(['draft', 'published', 'hidden']),
  post_tags:
    z.array(z.string().trim().min(1).max(40)).default([]),
})

adminPostsRoutes.post('/admin/posts', requireAdmin, async (c) => {
  const body = await parseJSON(c, postSchema)

  const post = await createAdminPost(getDB(c.env), body)

  return c.json(success(post, '文章创建成功'), 201)
})

adminPostsRoutes.post('/admin/posts/:id/update', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError(400, '文章ID无效')

  const body = await parseJSON(c, postSchema)
  const post = await updateAdminPost(getDB(c.env), id, body)

  return c.json(success(post, '文件更新成功'), 201)
})

adminPostsRoutes.delete('/admin/posts/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError(400, '文章 ID无效')

  await removeAdminPost(getDB(c.env), id)

  return c.json(success({ ok: true },
    '文章删除成功'))
})