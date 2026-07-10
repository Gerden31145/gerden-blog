import { UserRole } from './app'

export type PublicUser = {
  id: string
  username: string
  email: string
  role: UserRole
}

export type AccessTokenPayload = {
  [key: string]: unknown,
  sub: number
  sid: string
  role: UserRole
  tokenVersion: number
  iat: number
  exp: number
}

