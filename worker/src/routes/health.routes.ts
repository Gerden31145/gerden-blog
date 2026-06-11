import { Hono } from 'hono'
import { success } from '../utils/response'

export const healthRoutes = new Hono()

healthRoutes.get('/health', (c) => {
  return c.json(
    success({
      ok: true,
      service: 'worker' as const
    })
  )
})