import type { APIResponse } from "~/types/api";
import type { Posts } from '~/types/posts'
import { success, error } from '../../utils/api/response'

export default defineEventHandler(async (e): Promise<APIResponse<Posts>> => {
  const postSlug = getRouterParam(e, 'slug')
  const postDetail = await prisma.posts.findUnique({
    include: {
      post_tags: {
        select: {
          tags: {
            select: {
              name: true
            }
          }
        }
      }
    },
    where: { slug: postSlug }
  })

  if (!postDetail) {
    throw createError({
      message: '找不到文章',
      statusCode: 404,
      status: 404
    })
  }
  const result: Posts = {
    id: postDetail.id.toString(),
    title: postDetail.title,
    slug: postDetail.slug,
    summary: postDetail.summary ?? '',
    content: postDetail.content,
    post_status: postDetail.post_status,
    coverImage: postDetail.cover_image ?? '',
    published_at: postDetail.published_at?.toISOString()!,
    post_tags: postDetail.post_tags.map((tags) => tags.tags.name)
  }
  return success(result)
})
