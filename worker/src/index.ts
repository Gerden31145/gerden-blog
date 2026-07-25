import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health.routes'
import { tagsRoutes } from './routes/tags.routes'
import { postsRoutes } from './routes/posts.routes'
import { authRoutes } from './routes/auth.routes'
import { adminPostsRoutes } from './routes/admin-posts.routes'
import { commentsRoutes } from './routes/comments.routes'
import { success, error } from './utils/response'
import { AppEnv } from './types/app'
import { AppBindings } from './types/app'
import { AppError } from './utils/error'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import type { RenderPostMessage } from './types/render-job'
import { handlePostRenderBatch } from './queues/render-post.consumer'

const app = new Hono<AppEnv>()

app.use('/api/*',
  cors({
    origin: [
      'http://localhost:3000',
      'https://gerden-blog.pages.dev',
      'https://gerden-shop.cn',
      'https://www.gerden-shop.cn'
    ],
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS', 'DELETE']
  })
)

app.route('/api', healthRoutes)
app.route('/api', tagsRoutes)
app.route('/api', postsRoutes)
app.route('/api', authRoutes)
app.route('/api', adminPostsRoutes)
app.route('/api', commentsRoutes)

app.notFound((c) => {
  return c.json(error(404, 'Not found'), 404)
})

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(error(err.status, err.message), err.status as ContentfulStatusCode)
  }

  console.error(err)
  return c.json(error(500, 'Internal server error'), 500)
})

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx)
  },
  async queue(batch, env, ctx) {
    await handlePostRenderBatch(env, batch)
  }
} satisfies ExportedHandler<AppBindings, RenderPostMessage>
