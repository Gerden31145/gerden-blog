import { and, desc, eq } from 'drizzle-orm'
import { posts, postTags, tags } from '../db/schema'
import type { Db } from '../db/client'
import type {
  PostDetail, PostListItem, PostStatus,
  TocItem
} from '../types/post'

function parseToc(value: string): TocItem[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Invalid toc JSON', err)
    return []
  }
}

export async function findPublishedPosts(db: Db): Promise<PostListItem[]> {
  const rows = await db.select({
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    summary: posts.summary,
    published_at: posts.publishedAt,
    post_status: posts.postStatus,
    tagName: tags.name,
  })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(posts.postStatus, 'published'))

  const postMap = new Map<number, PostListItem>()

  for (const row of rows) {
    if (!postMap.has(row.id)) {
      postMap.set(row.id, {
        id: String(row.id),
        title: row.title,
        summary: row.summary ?? '',
        slug: row.slug,
        published_at: row.published_at,
        post_status: row.post_status as PostStatus,
        tags: row.tagName ? [row.tagName] : []
      })
    } else {
      const post = postMap.get(row.id)

      if (row.tagName) {
        post?.tags.push(row.tagName)
      }
    }
  }

  return Array.from(postMap.values())

}

export async function findPublishedPostBySlug(db: Db, slug: string): Promise<PostDetail | null> {
  const rows = await db.select({
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    summary: posts.summary,
    content: posts.content,
    contentHTML: posts.contentHtml,
    toc: posts.toc,
    postStatus: posts.postStatus,
    publishedAt: posts.publishedAt,
    tagName: tags.name,
  })
    .from(posts)
    .leftJoin(postTags, eq(postTags.postId, posts.id))
    .leftJoin(tags, eq(tags.id, postTags.tagId))
    .where(and(
      eq(posts.slug, slug),
      eq(posts.postStatus, 'published')
    ))

  if (rows.length === 0) return null

  const first = rows[0]

  return {
    id: String(first.id),
    title: first.title,
    slug: first.slug,
    summary: first.summary ?? '',
    content: first.content,
    contentHTML: first.contentHTML,
    post_status: first.postStatus as PostStatus,
    published_at: first.publishedAt,
    post_tags: rows
      .map((row) => row.tagName)
      .filter((name): name is string =>
        Boolean(name)),
    toc: parseToc(first.toc),
  }
}

