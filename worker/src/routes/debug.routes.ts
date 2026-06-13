import { Hono } from 'hono'
import { tags } from '../db/schema'
import { getDB } from '../db/client'
import { success } from '../utils/response'
import type { AppEnv } from '../types/app'

export const debugRoute = new Hono<AppEnv>()

debugRoute.get('/debug/tags', async (c) => {
  const db = getDB(c.env)

  const rows = await db.select({
    id: tags.id,
    name: tags.name,
    slug: tags.slug
  }).from(tags).limit(20)

  return c.json(success({ tags: rows }, 'tag 查询成功'))
})