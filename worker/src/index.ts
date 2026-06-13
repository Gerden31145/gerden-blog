import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health.routes'
import { debugRoute } from './routes/debug.routes'
import { success, error } from './utils/response'
import { AppEnv } from './types/app'

const app = new Hono<AppEnv>()

app.use('/api/*',
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS', 'DELETE']
  })
)

app.route('/api', healthRoutes)
app.route('/api', debugRoute)

app.notFound((c) => {
  return c.json(error(404, 'Not found'), 404)
})

app.onError((err, c) => {
  console.error(err)
  return c.json(error(500, 'Internal server error'), 500)
})

export default app
