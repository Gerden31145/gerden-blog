export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)

  const filePart = parts?.find(p => p.name === 'file')

  const meta = parts?.find(p => p.name === 'meta')

  if (!meta) throw createError({
    message: 'meta 内容为空',
    statusCode: 400
  })

  const metaData = meta ? meta.data.toString() : ''

  return {
    ok: true,
    // mdContent,
    fileName: filePart?.filename,
    data: metaData
  }
})