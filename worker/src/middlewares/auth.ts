import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { getDB } from '../db/client'
import type { AppEnv } from '../types/app'
import { AppError } from '../utils/error'
import { ACCESS_COOKIE, verifyAccessToken } from '../services/auth.service'
import { findActiveSessionById, findUserById }
  from '../repositories/auth.repository'

// 1. 验证token合法性
// 2. 根据payload的id查询用户状态
// 3. 查看tokenVersion是否与payload一致
// 4. 验证session是否过期
// 5. 验证通过，将用户信息存入上下文
async function authenticate(c: Context<AppEnv>) {
  const token = getCookie(c, ACCESS_COOKIE)

  if (!token) throw new AppError(401, 'Unauthorized')

  let payload

  try {
    payload = await verifyAccessToken(token,
      c.env.JWT_SECRET)
  } catch {
    throw new AppError(401, 'Unauthorized')
  }

  const db = getDB(c.env)

  const user = await findUserById(db, payload.sub)

  if (!user || user.status !== 'active')
    throw new AppError(401, 'Unauthorized')

  if (user.tokenVersion !== payload.tokenVersion)
    throw new AppError(401, 'Unauthorized')

  const session = await findActiveSessionById(db, payload.sid)

  if (!session || session.expiresAt <= new Date().toISOString())
    throw new AppError(401, 'Unauthorized')

  c.set('user', {
    id: user.id,
    sessionId: payload.sid,
    role: payload.role,
    tokenVersion: user.tokenVersion
  })
}

// 鉴权中间件
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  await authenticate(c)
  await next()
})

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  await authenticate(c)

  if (c.get('user').role !== 'admin') throw new AppError(403, 'Forbidden')

  await next()
})