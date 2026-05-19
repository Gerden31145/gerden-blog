import type { APIResponse } from "~/types/api";
import { success, error } from '../../utils/api/response'
import { createPost } from "~~/server/services/post.service";

export default defineEventHandler(async (e) => {
  const post = await createPost(e)

  return success(post)
}) 