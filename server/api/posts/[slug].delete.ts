import { deletePost } from "~~/server/services/post.service";
import { success } from "../../utils/api/response";
import { requireAdmin } from "../../utils/api/requireAdmin";
import type { H3Event } from 'h3'

export default defineEventHandler(async (e: H3Event) => {
  requireAdmin(e)

  const slug = getRouterParam(e, 'slug')

  if (!slug) throw createError({
    message: 'post slug require',
    statusCode: 400
  })

  const result = await deletePost(slug)

  return success(result)
})