import { z } from 'zod'
import type { Context } from 'hono'
import { AppError } from './error'

export async function parseJSON<TSchema extends z.ZodType>(
  c: Context,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let data: unknown = null
  try {
    data = await c.req.json()
  } catch {
    throw new AppError(400, 'Invalid JSON')
  }

  const result = schema.safeParse(data)

  if (!result.success) {
    throw new AppError(400, 'Validation fail', z.flattenError(result.error))
  }

  return result.data
}