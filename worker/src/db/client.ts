import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'
import type { AppBindings } from '../types/app'

export function getDB(env: AppBindings) {
  return drizzle(env.DB, { schema })
}

export type Db = ReturnType<typeof getDB>