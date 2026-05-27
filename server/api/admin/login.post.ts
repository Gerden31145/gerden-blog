import { success, error } from '../../utils/api/response'
import type { APIResponse } from '~/types/api';

export default defineEventHandler(async (event): Promise<APIResponse<{ ok: boolean }>> => {
  const body = await readBody<{ password?: string; username?: string }>(event)

  const password = body.password ? body.password.trim() : ''
  const username = body.username?.trim() ?? ''

  if (!password || !username) throw createError({
    statusCode: 400,
    message: '请输入用户名或密码'
  })

  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD_HASH) throw createError({
    statusCode: 500,
    message: '服务端用户名或密码未配置'
  })

  const adminName = username === process.env.ADMIN_USER
  const adminPsw = await verifyPassword(process.env.ADMIN_PASSWORD_HASH, password)

  if (!adminName || !adminPsw) throw createError({
    statusCode: 401,
    message: '用户名或密码错误'
  })

  await setUserSession(event, {
    user: {
      id: 'admin',
      name: 'admin',
      role: 'admin'
    }
  })

  return success({ ok: true })

})