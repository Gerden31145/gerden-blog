import { sql } from 'drizzle-orm'
import {
  check, index, integer, primaryKey, sqliteTable, text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('active'),
  tokenVersion: integer('token_version').notNull().default(0),
  createdAt:
    text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt:
    text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('users_username_unique').on(table.username),
  uniqueIndex('users_email_unique').on(table.email),
  check('users_role_check', sql`${table.role} in ('user', 'admin')`),
  check('users_status_check', sql`${table.status} in ('active', 'disabled')`),
])

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  summary: text('summary'),
  content: text('content').notNull(),
  contentHtml: text('content_html').notNull(),
  toc: text('toc').notNull().default('[]'),
  postStatus: text('post_status').notNull().default('draft'),
  publishedAt: text('published_at'),
  createdAt:
    text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt:
    text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('posts_slug_unique').on(table.slug),
  index('posts_status_idx').on(table.postStatus),
  check('posts_status_check', sql`${table.postStatus} in ('draft', 'published', 'hidden')`),
])

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  createdAt:
    text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('tags_name_unique').on(table.name),
  uniqueIndex('tags_slug_unique').on(table.slug),
])

export const postTags = sqliteTable('post_tags', {
  postId: integer('post_id').notNull().references(() => posts.id,
    { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id,
    { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.postId, table.tagId] }),
])

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id,
    { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id,
    { onDelete: 'cascade' }),
  content: text('content').notNull(),
  status: text('status').notNull().default('visible'),
  createdAt:
    text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt:
    text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('comments_post_id_idx').on(table.postId),
  check('comments_status_check', sql`${table.status} in ('visible', 'deleted')`),
])

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id,
    { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),
  status: text('status').notNull().default('active'),
  createdAt:
    text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt:
    text('last_used_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
  uniqueIndex('sessions_refresh_token_hash_unique').on(table.refreshTokenHash),
  check('sessions_status_check', sql`${table.status} in ('active', 'revoked')`),
])

export const postSlugRedirects =
  sqliteTable('post_slug_redirects', {
    oldSlug:
      text('old_slug').primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id,
        { onDelete: 'cascade' }),
    createdAt:
      text('created_at').notNull().default
        (sql`CURRENT_TIMESTAMP`)
  })