import { and, eq } from 'drizzle-orm'
import { sessions, users } from '../db/schema'
import type { Db } from '../db/client'

export async function findUserByUsername(db: Db, username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  return user ?? null
}

export async function findUserByEmail(db: Db,
  email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  return user ?? null
}

export async function findUserById(db: Db, id:
  number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  return user ?? null
}

export async function createUser(
  db: Db,
  input: {
    username: string; email: string;
    passwordHash: string
  }
) {
  const [user] = await db
    .insert(users)
    .values({
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      role: 'user',
      status: 'active'
    })
    .returning()

  return user
}

// 创建活跃会话
export async function createSession(
  db: Db,
  input: {
    id: string
    userId: number
    refreshTokenHash: string
    userAgent?: string
    expiresAt: string
  }
) {
  await db.insert(sessions).values({
    id: input.id,
    userId: input.userId,
    refreshTokenHash: input.refreshTokenHash,
    userAgent: input.userAgent,
    status: 'active',
    expiresAt: input.expiresAt
  })
}

export async function findActiveSessionById(db:
  Db, sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId),
      eq(sessions.status, 'active')))
    .limit(1)

  return session ?? null
}

export async function revokeSession(db: Db, sessionsId: string) {
  await db
    .update(sessions)
    .set({
      status: 'revoked',
      revokedAt: new Date().toISOString()
    })
    .where(eq(sessions.id, sessionsId))
}