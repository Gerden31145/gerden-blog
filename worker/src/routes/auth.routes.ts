import { Hono } from 'hono'
import type { Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { z } from 'zod'
import type { AppEnv } from '../types/app'
import { getDB } from '../db/client'
import { success } from '../utils/response'
import { AppError } from '../utils/error'
import { parseJSON } from '../utils/validation'
import { hashPassword, verifyPassword } from
  '../utils/password'
import {
  createSession,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  revokeSession
} from '../repositories/auth.repository'
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
  setAuthCookies,
  toPublicUser,
  verifyAccessToken
} from '../services/auth.service'
import { requireAdmin, requireAuth } from
  '../middlewares/auth'

export const authRoutes = new Hono<AppEnv>()

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
})

async function login(c: Context<AppEnv>, adminOnly = false) {
  const body = await parseJSON(c, loginSchema)
  const db = getDB(c.env)

  const user = await findUserByUsername(db, body.username)

  if (!user || !await verifyPassword(body.password, user.passwordHash))
    throw new AppError(401, '用户名或密码错误')

  if (user.status !== 'active')
    throw new AppError(403, '用户已被禁用')

  if (adminOnly && user.role !== 'admin')
    throw new AppError(403, '无后台访问权限')

  const sessionId = crypto.randomUUID()
  const refreshToken = createRefreshToken()

  await createSession(db,
    {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: await
        hashRefreshToken(refreshToken),
      userAgent: c.req.header('User-Agent'),
      expiresAt: refreshExpiresAt()
    }
  )

  const role = user.role === 'admin' ? 'admin' : 'user'

  const accessToken = await createAccessToken(
    {
      userId: user.id,
      sessionId,
      role,
      tokenVersion: user.tokenVersion
    },
    c.env.JWT_SECRET
  )

  setAuthCookies(c, accessToken, refreshToken)

  return c.json(success({
    ok: true,
    user: toPublicUser(user)
  }, '登录成功'))
}

const registerSchema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_]+$/),
  email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()),
  password: z.string().min(6).max(128)
})

authRoutes.post('/register', async (c) => {
  const body = await parseJSON(c, registerSchema)
  const db = getDB(c.env)

  if (await findUserByUsername(db, body.username))
    throw new AppError(409, '用户名已存在')

  if (await findUserByEmail(db, body.email))
    throw new AppError(409, '邮箱已存在')

  const user = await createUser(db, {
    username: body.username,
    email: body.email,
    passwordHash: await hashPassword(body.password)
  })

  return c.json(success(toPublicUser(user), '注册成功'), 201)
})

authRoutes.post('/login', (c) => login(c))
authRoutes.post('/admin/login', (c) => login(c, true))

authRoutes.get('/me', requireAuth, async (c) => {
  const db = getDB(c.env)

  const user = await findUserById(db, c.get('user').id)

  if (!user) throw new AppError(401, 'Unauthorized')

  return c.json(success(toPublicUser(user), '登录成功'))
})

authRoutes.get('/admin/me', requireAdmin,
  async (c) => {
    const db = getDB(c.env)
    const user = await findUserById(db,
      c.get('user').id)

    if (!user) throw new AppError(401,
      'Unauthorized')

    return c.json(success(toPublicUser(user),
      '管理员已登录'))
  })

async function logout(c: Context<AppEnv>) {
  const db = getDB(c.env)
  const token = getCookie(c, ACCESS_COOKIE)

  if (token) {
    try {
      const payload = await verifyAccessToken(token, c.env.JWT_SECRET)
      await revokeSession(db, payload.sid)
    } catch { }
  }

  clearAuthCookies(c)

  return c.json(success({ ok: true }, '登出成功'))
}

authRoutes.post('/logout', logout)
authRoutes.post('/admin/logout', logout)
