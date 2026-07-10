import type { CommentItem, CommentStatus, CreatedComment } from '../types/comment'
import { and, desc, eq } from 'drizzle-orm'
import { comments, users } from '../db/schema'
import type { Db } from '../db/client'
import { findUserById } from '../repositories/auth.repository'

export async function findVisibleCommentsById(db: Db, id: number): Promise<CommentItem[]> {
  const rows = await db.select({
    id: comments.id,
    post_id: comments.postId,
    user_id: users.id,
    user: {
      id: users.id,
      username: users.username
    },
    content: comments.content,
    status: comments.status,
    created_at: comments.createdAt,
    updated_at: comments.updatedAt
  })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.postId, id), eq(comments.status, 'visible')))

  const result: CommentItem[] = rows.map((c) => ({
    id: String(c.id),
    post_id: String(c.post_id),
    user_id: String(c.user_id),
    user: {
      id: String(c.user_id),
      username: c.user!.username
    },
    content: c.content,
    status: c.status as CommentStatus,
    created_at: c.created_at,
    updated_at: c.updated_at
  }))

  return result

}

export async function findCommentById(
  db: Db,
  id: number
): Promise<CommentItem | null> {
  const [row] = await db.select({
    id: comments.id,
    postId: comments.postId,
    userId: comments.userId,
    content: comments.content,
    status: comments.status,
    createdAt: comments.createdAt,
    updatedAt: comments.updatedAt,
    username: users.username
  })
    .from(comments)
    .innerJoin(users,
      eq(comments.userId, users.id))
    .where(eq(comments.id, id))
    .limit(1)

  if (!row) return null

  return {
    id: String(row.id),
    post_id: String(row.postId),
    user_id: String(row.userId),
    content: row.content,
    status: row.status as
      CommentStatus,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    user: {
      id: String(row.userId),
      username: row.username
    }
  }
}

export async function createComment(db: Db, input: CreatedComment) {
  const [comment] = await db.insert(comments)
    .values({
      postId: Number(input.post_id),
      userId: Number(input.user_id),
      content: input.content,
      status: 'visible',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning({
      id: comments.id
    })

  return findCommentById(db, comment.id)
}

export async function softDeleteCommentById(db: Db, id: number) {
  await db.update(comments).set({
    status: 'deleted',
    updatedAt: new Date().toISOString()
  }).where(eq(comments.id, id))
}