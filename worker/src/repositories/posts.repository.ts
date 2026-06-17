import { and, desc, eq } from 'drizzle-orm'
import { posts, postTags, tags } from '../db/schema'
import type { Db } from '../db/client'
import type {
  PostDetail, PostListItem, PostStatus,
  TocItem, AdminPostInput, AdminPostResult,
  CreatePostInput,
  UpdatePostInput
} from '../types/post'
import { slugify, uniqueSlug } from '../utils/slug'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

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

export async function findAdminPostById(db: Db, id: number) {
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)

  return post ?? null
}

export async function createPostWithTags(db: Db, input: CreatePostInput) {
  const id = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({
        title: input.title,
        slug: `pending-${crypto.randomUUID()}`,
        summary: input.summary,
        content: input.content,
        contentHtml: input.contentHTML,
        toc: input.toc,
        postStatus: input.post_status,
        publishedAt: input.published_at ?? null
      })
      .returning()

    const baseSlug = slugify(input.title)
    const slug = uniqueSlug(baseSlug, post.id)

    await tx.update(posts)
      .set({
        slug,
        publishedAt: input.published_at ? new Date().toISOString() : null
      })
      .where(eq(posts.id, post.id))

    await syncPostTags(tx, post.id, input.post_tags)

    return post.id
  })

  return findAdminPostById(db, id)
}

export async function updatePostWithTags(db: Db, input: CreatePostInput, id: number) {
  await db.transaction(async (tx) => {
    await tx.update(posts).set({
      title: input.title,
      summary: input.summary,
      content: input.content,
      contentHtml:
        input.contentHTML,
      toc: input.toc,
      postStatus: input.post_status,
      updatedAt: new
        Date().toISOString(),
      publishedAt: input.published_at
    })
      .where(eq(posts.id, id))

    await tx.delete(postTags).where(eq(postTags.postId, id))
    await syncPostTags(tx, id, input.post_tags)
  })

  return findAdminPostById(db, id)
}

export async function deletePostById(db: Db, id: number) {
  await
    db.delete(posts).where(eq(posts.id, id))
}

// 将tag与post关联
async function syncPostTags(tx: Tx, postId: number, names: string[]) {
  const uniqueName = [
    ...new Set(names.map(tag => tag.trim()).filter(Boolean))
  ]

  for (const name of uniqueName) {
    const slug = slugify(name)
    await tx
      .insert(tags)
      .values({
        name,
        slug
      })
      .onConflictDoNothing()

    const [tag] = await tx
      .select()
      .from(tags)
      .where(eq(tags.name, name))

    if (tag) {
      await tx
        .insert(postTags)
        .values({
          postId,
          tagId: tag.id
        })
        .onConflictDoNothing()
    }
  }
}