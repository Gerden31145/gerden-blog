import { asc, eq } from 'drizzle-orm'
import { postTags, posts, tags } from '../db/schema'
import type { Db } from '../db/client'
import type { TagItem } from '../types/post'

export async function findPublicTags(db: Db): Promise<TagItem[]> {
  const rows = await db.select({
    id: tags.id,
    name: tags.name,
    slug: tags.slug
  })
    .from(tags)
    .innerJoin(postTags, eq(tags.id, postTags.tagId))
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(eq(posts.postStatus, 'published'))
    .orderBy(asc(tags.name))

  const tagMap = new Map<number, TagItem>()

  for (const row of rows) {
    if (!tagMap.has(row.id)) {
      tagMap.set(row.id, {
        id: String(row.id),
        name: row.name,
        slug: row.slug
      })
    }
  }

  return Array.from(tagMap.values())
}

async function findTagsByName(db: Db, tagName: string): Promise<TagItem | null> {
  const rows = db
    .select()
    .from(tags)
    .where(eq(tags.name, tagName))

  if (!rows) return null
  return rows[0]
}

export async function findOrCreateTags(db: Db, tagsList: TagItem[]) {
  for (const tag of tagsList) {
    if (await bd)
  }
}