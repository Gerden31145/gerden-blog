export default defineEventHandler(async (event) => {
  const formData = await readFormData(event)

  const title = formData.get('title')
  const file = formData.get('file')

  return {
    ok: true,
    title,
    fileIsFile: file instanceof File,
    fileName: file instanceof File ? file.name : null,
  }
})