export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event)

  if (!body.password) throw createError({
    statusCode: 400,
    message: '请输入需要加密的密码'
  })

  if (typeof body.password !== 'string') throw createError({
    statusCode: 400,
    message: `请输入字符串类型的密码，当前类型：${typeof body.password}`
  })

  const hash = await hashPassword(body.password)

  return {
    hash
  }
})