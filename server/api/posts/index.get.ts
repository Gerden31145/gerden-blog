import { prisma } from "../../utils/prisma"
import serializeBigInt from "~~/server/utils/api/serializeBigInt"
import { success, error } from "~~/server/utils/api/response"

import type { APIResponse } from '~/types/api'
import type { PostList } from '~/types/posts'

export default defineEventHandler(async (): Promise<APIResponse<PostList[]>> => {
  const posts = await prisma.posts.findMany({
    select: {
      id: true,
      title: true,
      summary: true,
      slug: true,
      published_at: true,
      post_status: true,
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
    where: {
      post_status: 'published'
    }
  })

  const result: PostList[] = posts.map((item) => ({
    id: item.id.toString(),
    title: item.title,
    summary: item.summary ?? '',
    published_at: item.published_at!.toISOString(),
    slug: item.slug,
    tags: item.post_tags.map((item) => (item.tags.name)),
    post_status: item.post_status
  }))

  return success<PostList[]>(result)
})