import { and, eq, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { posts, postSlugRedirects, postTags, renderJobs, tags } from '../db/schema'
import type { Db } from '../db/client'
import type {
  PostDetail, PostListItem, PostStatus,
  TocItem, CreatePostInput
} from '../types/post'
import { slugify, uniqueSlug } from '../utils/slug'
import { AppError } from '../utils/error'

type D1BatchItem = BatchItem<'sqlite'>

function parseToc(value: string): TocItem[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Invalid toc JSON', err)
    return []
  }
}

function normalizeTagNames(names: string[]) {
  return [...new Set(names.map((tag) => tag.trim()).filter(Boolean))]
}

function createPostSlug(title: string) {
  return uniqueSlug(title, crypto.randomUUID().slice(0, 8))
}

function buildTagInsertStatements(db: Db, names: string[]): D1BatchItem[] {
  return names.map((name) => db
    .insert(tags)
    .values({
      name,
      slug: slugify(name)
    })
    .onConflictDoNothing())
}

function buildCreatePostTagStatements(
  db: Db,
  postSlug: string,
  names: string[]
): D1BatchItem[] {
  return names.map((name) => db
    .insert(postTags)
    .select(sql`
      select ${posts.id}, ${tags.id}
      from ${posts}, ${tags}
      where ${posts.slug} = ${postSlug}
        and ${tags.name} = ${name}
    `)
    .onConflictDoNothing())
}

function buildUpdatePostTagStatements(
  db: Db,
  postId: number,
  names: string[]
): D1BatchItem[] {
  return names.map((name) => db
    .insert(postTags)
    .select(sql`
      select ${postId}, ${tags.id}
      from ${tags}
      where ${tags.name} = ${name}
    `)
    .onConflictDoNothing())
}

function buildRenderQueueMessageStatements(
  db: Db,
  jobId: string,
  postSlug: string,
  contentHash: string
): D1BatchItem {
  return db.insert(renderJobs)
    .select(
      sql`
        select
        ${jobId},
        ${posts.id},
        'post_render',
        ${contentHash},
        'queued',
        0,
        null,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
        from ${posts}
        where ${posts.slug} = ${postSlug}
      `)
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
    .where(
      and(eq(posts.postStatus, 'published'), eq(posts.renderStatus, 'ready'))
    )

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
      eq(posts.postStatus, 'published'),
      eq(posts.renderStatus, 'ready')
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

export async function createPostWithTags(db: Db,
  input: CreatePostInput,
  jobId: string
) {
  const tagNames = normalizeTagNames(input.post_tags)
  const slug = createPostSlug(input.title)

  const statements: [D1BatchItem, ...D1BatchItem[]] = [
    db.insert(posts)
      .values({
        title: input.title,
        slug,
        summary: input.summary,
        content: input.content,
        contentHtml: input.contentHTML,
        toc: input.toc,
        postStatus: input.post_status,
        publishedAt: input.published_at ?? null,
        contentHash: input.content_hash,
        renderStatus: 'pending'
      })
      .returning({ id: posts.id }),
    ...buildTagInsertStatements(db, tagNames),
    ...buildCreatePostTagStatements(db, slug, tagNames),
    buildRenderQueueMessageStatements(db, jobId, slug, input.content_hash)
  ]

  const [insertResult] = await db.batch(statements)
  const [post] = insertResult as { id: number }[]

  if (!post) throw new AppError(500, '文章创建失败')

  return findAdminPostById(db, post.id)
}

export async function updatePostWithTags(db: Db, input: CreatePostInput, id: number, jobId: string) {
  const post = await findAdminPostById(db, id)
  if (!post) throw new AppError(404, '文章不存在')

  const tagNames = normalizeTagNames(input.post_tags)
  let newSlug: string | undefined
  const statements: D1BatchItem[] = []

  if (post.title !== input.title) {
    // 更新 slug，把旧的 slug 写入 slug-redirect 表。
    newSlug = createPostSlug(input.title)

    if (newSlug !== post.slug) {
      // 避免主键冲突（新 slug 与旧 slug 重复）。
      statements.push(
        db.delete(postSlugRedirects)
          .where(eq(postSlugRedirects.oldSlug, newSlug))
      )

      statements.push(
        db.insert(postSlugRedirects).values({
          oldSlug: post.slug,
          postId: id,
          createdAt: new Date().toISOString()
        })
      )
    }
  }

  statements.push(
    db.update(posts).set({
      title: input.title,
      summary: input.summary,
      content: input.content,
      slug: newSlug ?? post.slug,
      contentHash: input.content_hash,
      renderStatus: 'pending',
      contentHtml: input.contentHTML,
      toc: input.toc,
      postStatus: input.post_status,
      updatedAt: new
        Date().toISOString(),
      publishedAt: input.published_at
    })
      .where(eq(posts.id, id))
  )

  statements.push(db.delete(postTags).where(eq(postTags.postId, id)))
  statements.push(...buildTagInsertStatements(db, tagNames))
  statements.push(...buildUpdatePostTagStatements(db, id, tagNames))
  statements.push(buildRenderQueueMessageStatements(db, jobId, newSlug ?? post.slug, input.content_hash))

  await db.batch(statements as [D1BatchItem, ...D1BatchItem[]])

  return findAdminPostById(db, id)
}

export async function deletePostById(db: Db, id: number) {
  await
    db.delete(posts).where(eq(posts.id, id))
}

export async function getNewSlug(db: Db, slug: string) {
  const [oldSlug] = await db.select().from(postSlugRedirects)
    .where(eq(postSlugRedirects.oldSlug, slug))

  if (!oldSlug) return null

  const [post] = await db.select({
    newSlug: posts.slug
  }).from(posts).where(and(eq(posts.id, oldSlug.postId), eq(posts.postStatus, 'published')))

  if (!post) return null

  return {
    redirect_to: post.newSlug
  }
}
