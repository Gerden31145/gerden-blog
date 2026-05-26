import { H3Event } from "h3";

export async function requireAdmin(event: H3Event) {
  const session = await requireUserSession(event)

  if (session.user?.role !== 'admin') throw createError({
    statusCode: 403,
    message: '没有管理员用户权限'
  })

  return session
}