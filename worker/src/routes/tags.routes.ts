import { Hono } from 'hono'
import type { AppEnv } from '../types/app'
import { getDB } from '../db/client'
import { success } from '../utils/response'
import { findPublicTags } from '../repositories/tags.repository'

export const tagsRoutes = new Hono<AppEnv>()

tagsRoutes.get('/tags', async (c) => {
  const db = getDB(c.env)
  const rows = await findPublicTags(db)

  return c.json(success(rows, 'tags 获取成功'))
})