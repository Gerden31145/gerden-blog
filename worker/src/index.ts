import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health.routes'
import { success, error } from './utils/response'

const app = new Hono()

app.use('/api/*',
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS', 'DELETE']
  })
)

app.route('/api', healthRoutes)

app.notFound((c) => {
  return c.json(error(404, 'Not found'))
})

app.onError((err, c) => {
  console.error(err)
  return c.json(error(500, 'Internal server error'))
})

export default app
