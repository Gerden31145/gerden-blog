import type { APIResponse } from "~/types/api";
import { H3Event, success, error } from "#imports";
import { updatePost } from "~~/server/services/post.service";

export default defineEventHandler(async (event: H3Event) => {
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  try {
    const result = await updatePost(slug)
    return success(result)
  } catch (err) {
    if (err instanceof Error)
      return error('500', err.message)
  }
})