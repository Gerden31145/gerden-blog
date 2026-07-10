# API Contract

## 1. Purpose

This document freezes the API contract for the migration from the legacy PHP backend to the final Hono + Drizzle + Cloudflare Workers + D1 backend.

The new backend should preserve the current frontend behavior where practical, while changing post creation and update from Markdown file upload to JSON payloads containing Markdown text.

## 2. Base URL

Local development:

```txt
Nuxt frontend: http://localhost:3000
Worker API:    http://localhost:8787/api
```

Frontend configuration:

```txt
NUXT_PUBLIC_API_BASE=http://localhost:8787/api
```

All frontend API requests should include credentials so HttpOnly cookies are sent:

```ts
credentials: 'include'
```

## 3. Response Format

Success response:

```ts
type ApiSuccess<T> = {
  status: 200
  message: string
  data: T
}
```

Error response:

```ts
type ApiError = {
  status: number
  message: string
}
```

Rules:

- Successful requests return HTTP 2xx and the success body.
- Failed requests return the matching HTTP error status and the error body.
- Validation errors should use HTTP 400.
- Unauthenticated requests should use HTTP 401.
- Authenticated but unauthorized requests should use HTTP 403.
- Missing resources should use HTTP 404.
- Unexpected server errors should use HTTP 500.

## 4. Shared Types

```ts
type UserRole = 'user' | 'admin'
type UserStatus = 'active' | 'disabled'
type PostStatus = 'draft' | 'published' | 'hidden'
type CommentStatus = 'visible' | 'hidden' | 'deleted'
```

```ts
type User = {
  id: string
  username: string
  email: string
  role: UserRole
}
```

```ts
type TocItem = {
  id: string
  text: string
  depth: number
}
```

```ts
type PostListItem = {
  id: string
  title: string
  slug: string
  summary?: string
  coverImage?: string
  published_at: string | null
  tags: string[]
  post_status: PostStatus
}
```

```ts
type PostDetail = {
  id: string
  title: string
  slug: string
  summary?: string
  content: string
  contentHTML: string
  post_status: PostStatus
  coverImage?: string
  published_at: string | null
  post_tags: string[]
  toc: TocItem[]
}
```

```ts
type CommentItem = {
  id: string
  post_id: string
  user_id: string
  content: string
  status: CommentStatus
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
  }
}
```

Date and time fields should use ISO strings.

## 5. Authentication Contract

The final backend uses session-aware JWT authentication.

### Cookie Strategy

Cookies:

```txt
access_token
refresh_token
```

Cookie requirements:

- `HttpOnly: true`
- `Secure: true` in production
- `SameSite: Lax` for same-site frontend/API deployments
- `SameSite: None` and `Secure: true` if the frontend and API are deployed on different sites
- `Path: /`

Recommended lifetime:

```txt
access_token: 15-30 minutes
refresh_token: 30 days
```

### JWT Payload

```ts
type AccessTokenPayload = {
  sub: number
  sid: string
  role: 'user' | 'admin'
  tokenVersion: number
  exp: number
}
```

Payload rules:

- `sub` is the user id.
- `sid` is the session id.
- `role` is copied from the user record.
- `tokenVersion` is copied from the user record.
- `exp` is the access token expiration timestamp.

### Sessions

Refresh tokens are opaque random strings. Store only a hash of the refresh token in D1.

Recommended `sessions` table fields:

```txt
id
user_id
refresh_token_hash
user_agent
ip_hash
status
created_at
last_used_at
expires_at
revoked_at
```

Session status:

```ts
type SessionStatus = 'active' | 'revoked'
```

### Protected Request Flow

For routes requiring login:

```txt
1. Read access_token from cookie.
2. Verify JWT signature and exp.
3. Read sub, sid, role, and tokenVersion from payload.
4. Query users by sub.
5. Reject if user does not exist.
6. Reject if user.status is not active.
7. Reject if payload.tokenVersion does not match users.token_version.
8. Query sessions by sid.
9. Reject if session does not exist.
10. Reject if session.user_id does not match sub.
11. Reject if session.status is not active.
12. Reject if session.expires_at is expired.
13. Attach auth user to request context.
```

### Logout Behavior

Current-device logout:

```txt
POST /api/logout
POST /api/admin/logout
```

Rules:

- Revoke only the current `sid` session.
- Clear `access_token` and `refresh_token` cookies.
- Do not increment `users.token_version`.

All-device logout:

```txt
POST /api/logout-all
```

Rules:

- Revoke all active sessions for the current user.
- Clear `access_token` and `refresh_token` cookies.
- This route can be added after the core migration if the UI needs it.

Emergency global invalidation:

```txt
users.token_version += 1
```

This invalidates every existing access token for the user.

## 6. Public APIs

### GET /api/health

Purpose: check whether the Worker API is running.

Response:

```ts
ApiSuccess<{
  ok: true
  service: 'worker'
}>
```

### GET /api/tags

Purpose: return all tags used by posts.

Response:

```ts
ApiSuccess<Array<{
  id: string
  name: string
  slug: string
}>>
```

### GET /api/posts

Purpose: return the public post list.

Rules:

- Only return posts where `post_status = 'published'`.
- Return tags as `tags`.
- Sort by `published_at` descending, then `created_at` descending.

Response:

```ts
ApiSuccess<PostListItem[]>
```

### GET /api/posts/:slug

Purpose: return public post detail by slug.

Rules:

- Only return posts where `post_status = 'published'`.
- Parse `toc` from JSON string before returning.
- Return rendered HTML as `contentHTML`.
- Return tag names as `post_tags`.

Response:

```ts
ApiSuccess<PostDetail>
```

Errors:

```txt
404 Post not found
```

## 7. Auth APIs

### POST /api/register

Request:

```ts
{
  username: string
  email: string
  password: string
}
```

Rules:

- `username` must be unique.
- `email` must be unique.
- Password must be hashed before storing.
- New users use `role = 'user'`.
- New users use `status = 'active'`.
- This route does not need to automatically log in the user unless explicitly implemented.

Response:

```ts
ApiSuccess<User>
```

### POST /api/login

Request:

```ts
{
  username: string
  password: string
}
```

Rules:

- Accept username login.
- Reject disabled users.
- Create a new session.
- Issue `access_token` and `refresh_token` cookies.

Response:

```ts
ApiSuccess<{
  ok: true
  user: User
}>
```

### POST /api/logout

Rules:

- Requires the current session if a valid token exists.
- Revoke only the current session.
- Clear auth cookies.
- Should still clear cookies even if the access token is already expired.

Response:

```ts
ApiSuccess<{
  ok: true
}>
```

### GET /api/me

Rules:

- Requires login.
- Normal users and admin users can both use this route.

Response:

```ts
ApiSuccess<User>
```

### POST /api/admin/login

Request:

```ts
{
  username: string
  password: string
}
```

Rules:

- Reuse the normal login logic.
- After password verification, require `role = 'admin'`.
- Create a new session.
- Issue `access_token` and `refresh_token` cookies.

Response:

```ts
ApiSuccess<{
  ok: true
  user: User
}>
```

Errors:

```txt
401 Invalid username or password
403 Admin permission required
```

### POST /api/admin/logout

Rules:

- Same behavior as `POST /api/logout`.
- Kept for frontend compatibility.

Response:

```ts
ApiSuccess<{
  ok: true
}>
```

### GET /api/admin/me

Rules:

- Requires login.
- Requires `role = 'admin'`.

Response:

```ts
ApiSuccess<User>
```

## 8. Comment APIs

### GET /api/posts/:id/comments

Purpose: return visible comments for a post.

Rules:

- Only return comments where `status = 'visible'`.
- Join with users and return `user.id` and `user.username`.
- Sort by `created_at` ascending.

Response:

```ts
ApiSuccess<CommentItem[]>
```

### POST /api/posts/:id/comments

Request:

```ts
{
  content: string
}
```

Rules:

- Requires login.
- `content` cannot be empty.
- Store comment with `status = 'visible'`.
- Return the created comment with user information.

Response:

```ts
ApiSuccess<CommentItem>
```

### DELETE /api/comments/:id

Rules:

- Requires login.
- Normal users can delete only their own comments.
- Admin users can delete any comment.
- Use logical delete by setting `status = 'deleted'`.

Response:

```ts
ApiSuccess<null>
```

Errors:

```txt
403 Permission denied
404 Comment not found
```

## 9. Admin Post APIs

Admin post write APIs require login and `role = 'admin'`.

### POST /api/admin/posts

Purpose: create a post.

Request:

```ts
{
  title: string
  summary?: string
  content: string
  postStatus: 'draft' | 'published' | 'hidden'
  tags: string[]
}
```

Rules:

- `content` is Markdown text, not an uploaded `.md` file.
- Generate `slug` from title with a timestamp/hash suffix to avoid conflicts.
- Render Markdown to HTML in the backend.
- Generate TOC from rendered headings in the backend.
- Store original Markdown as `posts.content`.
- Store rendered HTML as `posts.content_html`.
- Store TOC as a JSON string in D1.
- Upsert tags.
- Insert `post_tags`.
- If `postStatus = 'published'`, set `published_at` if it is currently empty.

Response:

```ts
ApiSuccess<{
  id: string
  slug: string
}>
```

### POST /api/admin/posts/:id/update

Purpose: update a post by id.

Request:

```ts
{
  title: string
  summary?: string
  content: string
  postStatus: 'draft' | 'published' | 'hidden'
  tags: string[]
}
```

Rules:

- Update by `id`, not by `slug`.
- If title changes, regenerate `slug`.
- If title does not change, keep existing `slug`.
- Always update `updated_at`.
- Re-render Markdown to HTML when `content` changes.
- Regenerate TOC when `content` changes.
- Replace old `post_tags` with the new tag set.
- If a draft becomes published and `published_at` is empty, set `published_at`.

Response:

```ts
ApiSuccess<{
  id: string
  slug: string
}>
```

Errors:

```txt
404 Post not found
```

### DELETE /api/admin/posts/:id

Purpose: delete a post.

Rules:

- Requires admin role.
- Preserve current behavior unless changed during implementation.
- If hard deleting, delete related `post_tags` first.
- Comments can either be deleted with the post or kept depending on D1 foreign key design.

Response:

```ts
ApiSuccess<null>
```

Errors:

```txt
404 Post not found
```

## 10. Frontend Migration Notes

The current frontend post service still uses `FormData`, `meta`, and uploaded Markdown files. During the Hono migration, change it to JSON:

```ts
await $api('admin/posts', {
  method: 'POST',
  body: {
    title,
    summary,
    content,
    postStatus,
    tags
  }
})
```

For update:

```ts
await $api(`admin/posts/${id}/update`, {
  method: 'POST',
  body: {
    title,
    summary,
    content,
    postStatus,
    tags
  }
})
```

If the UI still allows importing a `.md` file, read it in the browser first:

```ts
const content = await file.text()
```

Then submit the text as `content`.

## 11. Migration Acceptance Checklist

- Every route in this document has a Hono implementation.
- Public post APIs return only published posts.
- Admin post APIs require admin role.
- Comment creation requires login.
- Comment deletion allows owner or admin only.
- Access token is stored in an HttpOnly cookie.
- Refresh token is stored as an HttpOnly cookie and hashed in D1.
- Logout revokes only the current session.
- All-device logout revokes all active sessions when implemented.
- Frontend no longer uploads Markdown files to create or update posts.
- Frontend API services match this contract.
