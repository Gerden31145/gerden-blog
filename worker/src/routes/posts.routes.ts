import { Hono } from 'hono'
import type { AppEnv } from '../types/app'
import { getDB } from '../db/client'
import { success } from '../utils/response'
import { AppError } from '../utils/error'
import {
  findPublishedPostBySlug,
  findPublishedPosts,
} from '../repositories/posts.repository'

export const postsRoutes = new Hono<AppEnv>()

postsRoutes.get('/posts', async (c) => {
  const db = getDB(c.env)

  const rows = await findPublishedPosts(db)

  return c.json(success(rows, '博客列表查询成功'))
})

postsRoutes.get('/posts/:slug', async (c) => {
  const db = getDB(c.env)
  const slug = c.req.param('slug')

  const post = await findPublishedPostBySlug(db, slug)

  if (!post) throw new AppError(404, '文章不存在')

  return c.json(success(post, '文章获取成功'))
})