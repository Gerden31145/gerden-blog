import { sign, verify } from 'hono/jwt'
import type { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import type { AppEnv, UserRole } from '../types/app'
import type { AccessTokenPayload, PublicUser }
  from '../types/auth'

export const ACCESS_COOKIE = 'access_token'
export const REFRESH_COOKIE = 'refresh_token'

const ACCESS_TTL = 60 * 60
const REFRESH_TTL = 60 * 60 * 24 * 30

export function toPublicUser(user: {
  id: number
  username: string
  email: string
  role: string
}): PublicUser {
  return {
    id: String(user.id),
    username: user.username,
    email: user.email,
    role: user.role === 'admin' ? 'admin' :
      'user'
  }
}

export function createRefreshToken() {
  const bytes = crypto.getRandomValues(new
    Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export async function hashRefreshToken(token: string) {
  const data = new TextEncoder().encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2,
      '0'))
    .join('')
}

export async function createAccessToken(
  input: {
    userId: number
    sessionId: string
    role: UserRole
    tokenVersion: number
  },
  secret: string
) {
  const now = Math.floor(Date.now() / 1000)

  return sign(
    {
      sub: input.userId,
      sid: input.sessionId,
      role: input.role,
      tokenVersion: input.tokenVersion,
      iat: now,
      exp: now + ACCESS_TTL
    },
    secret,
    'HS256'
  )
}

export async function verifyAccessToken(token:
  string, secret: string) {
  const payload = await verify(token, secret,
    'HS256')

  if (
    typeof payload.sub !== 'number' ||
    typeof payload.sid !== 'string' ||
    (payload.role !== 'user' && payload.role !==
      'admin') ||
    typeof payload.tokenVersion !== 'number'
  ) {
    throw new Error('Invalid token payload')
  }

  return payload as AccessTokenPayload
}

function cookieOptions(c: Context<AppEnv>,
  maxAge: number) {
  const isHttps = new URL(c.req.url).protocol
    === 'https:'

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'Lax' as const,
    path: '/',
    maxAge
  }
}

export function setAuthCookies(
  c: Context<AppEnv>,
  accessToken: string,
  refreshToken: string
) {
  setCookie(c, ACCESS_COOKIE, accessToken,
    cookieOptions(c, ACCESS_TTL))
  setCookie(c, REFRESH_COOKIE, refreshToken,
    cookieOptions(c, REFRESH_TTL))
}

export function clearAuthCookies(c:
  Context<AppEnv>) {
  deleteCookie(c, ACCESS_COOKIE, { path: '/' })
  deleteCookie(c, REFRESH_COOKIE, { path: '/' })
}

export function refreshExpiresAt() {
  return new Date(Date.now() + REFRESH_TTL *
    1000).toISOString()
}