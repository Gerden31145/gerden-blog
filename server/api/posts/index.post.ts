import type { APIResponse } from "~/types/api";
import { success, error } from '../../utils/api/response'
import { createPost } from "~~/server/services/post.service";
import { requireAdmin } from "~~/server/utils/api/requireAdmin";

export default defineEventHandler(async (e) => {
  await requireAdmin(e)

  const post = await createPost(e)

  return success(post)
}) 