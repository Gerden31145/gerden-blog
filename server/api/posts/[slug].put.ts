import type { APIResponse } from "~/types/api";
import { success, error } from "../../utils/api/response";
import { updatePost } from "~~/server/services/post.service";
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({
    message: 'slug required'
  })
  const result = await updatePost(event, slug)
  return success(result)

})