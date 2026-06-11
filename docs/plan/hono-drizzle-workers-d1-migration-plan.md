# Hono + Drizzle + Cloudflare Workers + D1 Migration Plan

## 1. Goal

The goal is to fully migrate the backend of this project from the current PHP + MySQL implementation to a modern serverless TypeScript backend:

```txt
Current backend:
PHP + PDO + MySQL

Final backend:
Hono + Drizzle ORM + Cloudflare Workers + Cloudflare D1
```

The final project should not depend on PHP or MySQL. The PHP backend can be used as a behavior reference during migration, but it should be removed or archived after the Hono backend passes all functional checks.

Nuxt should remain the frontend layer only. Nuxt Nitro server routes should stay disabled unless there is a clear frontend-only reason to use them.

## 2. Final Architecture

```txt
Browser
  |
  | HTTP requests with HttpOnly cookie
  v
Nuxt 3 frontend
  |
  | REST API
  v
Cloudflare Worker
  |
  | Hono routes / middleware / controllers
  v
Services
  |
  | Drizzle queries
  v
Cloudflare D1
```

Final backend responsibilities:

- Public post list and post detail APIs.
- Tags API.
- User registration and login.
- Admin login and admin-only post management.
- Session-aware JWT authentication through HttpOnly cookies.
- D1-backed sessions for per-device logout.
- `token_version` for emergency/global user token invalidation.
- Comment list, creation, and logical deletion.
- Markdown to HTML rendering.
- TOC generation from rendered headings.

## 3. Main Technology Choices

| Area | Final Choice | Reason |
| --- | --- | --- |
| Web framework | Hono | Lightweight, Express-like, TypeScript-friendly, works well on Workers |
| Runtime | Cloudflare Workers | Serverless edge runtime, no self-managed server |
| Database | Cloudflare D1 | Serverless SQL database based on SQLite semantics |
| ORM | Drizzle ORM | SQL-like, type-safe, works with D1 |
| Validation | Zod | Request validation and typed payloads |
| Auth | JWT + HttpOnly cookies + D1 sessions | Supports safer token handling and per-device logout |
| Password hashing | Workers-compatible hashing strategy | Must avoid Node-only native modules |
| Markdown | Pure JavaScript markdown pipeline | Must avoid Node-only or DOM-dependent libraries |

## 4. Important Migration Difference: MySQL to D1

D1 uses SQLite semantics, so the current MySQL schema cannot be copied directly.

Examples of required changes:

| MySQL Style | D1 / SQLite Style |
| --- | --- |
| `BIGINT UNSIGNED AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `ENUM('user', 'admin')` | `TEXT CHECK(role IN ('user', 'admin'))` |
| `DATETIME` | `TEXT` ISO datetime or `INTEGER` timestamp |
| `ON UPDATE CURRENT_TIMESTAMP` | update manually in application code |
| MySQL JSON type | `TEXT` storing JSON string, parsed in service layer |

Recommended final tables:

```txt
users
posts
tags
post_tags
comments
sessions
```

The table names can remain close to the current backend to reduce frontend and service migration cost.

## 5. Development Cycle Overview

```txt
Phase 0: Preparation and API contract freeze
Phase 1: Create Hono Workers backend skeleton
Phase 2: Design D1 schema and Drizzle setup
Phase 3: Implement shared backend infrastructure
Phase 4: Migrate public read APIs
Phase 5: Migrate authentication APIs
Phase 6: Migrate admin post write APIs
Phase 7: Migrate comments APIs
Phase 8: Connect Nuxt frontend to the new backend
Phase 9: Deploy to Cloudflare
Phase 10: Remove PHP/MySQL legacy backend
```

## 6. Phase 0: Preparation and API Contract Freeze

Purpose: make sure migration is controlled and testable.

Tasks:

- List all existing PHP API routes.
- Confirm which routes should remain unchanged for the frontend.
- Define the response format used by the new backend.
- Define error response format.
- Confirm cookie name, JWT payload fields, and auth behavior.
- Decide whether admin and normal login share the same login implementation.

Current API routes to preserve:

```txt
GET    /api/health
GET    /api/tags
GET    /api/posts
GET    /api/posts/:slug
GET    /api/posts/:id/comments
POST   /api/posts/:id/comments
DELETE /api/comments/:id

POST   /api/register
POST   /api/login
POST   /api/logout
GET    /api/me

POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/me
POST   /api/admin/posts
POST   /api/admin/posts/:id/update
DELETE /api/admin/posts/:id
```

Recommended response shape:

```ts
type ApiSuccess<T> = {
  status: 200
  message: string
  data: T
}

type ApiError = {
  status: number
  message: string
}
```

Deliverables:

- API checklist document or issue list.
- Confirmed final route list.
- Confirmed success/error response format.

Acceptance criteria:

- Every old PHP route has a corresponding migration decision.
- The frontend does not need large API shape changes.

## 7. Phase 1: Create Hono Workers Backend Skeleton

Purpose: create a standalone backend that can run locally and deploy to Cloudflare Workers.

Recommended structure:

```txt
worker/
  src/
    index.ts
    routes/
      health.routes.ts
      tags.routes.ts
      posts.routes.ts
      auth.routes.ts
      comments.routes.ts
    controllers/
    services/
    repositories/
    middlewares/
    db/
      schema.ts
      client.ts
    utils/
    types/
  drizzle/
  drizzle.config.ts
  wrangler.jsonc
  package.json
  tsconfig.json
```

Tasks:

- Create a new backend directory, preferably `worker/` or `backend-worker/`.
- Initialize Hono with Cloudflare Workers target.
- Add TypeScript configuration.
- Add Wrangler configuration.
- Add basic `/api/health` route.
- Add CORS and cookie handling strategy.

Recommended local dev command:

```txt
npm run dev
```

Deliverables:

- Hono app starts locally.
- `/api/health` returns a JSON response.

Acceptance criteria:

- The Worker backend can run without PHP.
- The Worker backend does not depend on MySQL.

## 8. Phase 2: Design D1 Schema and Drizzle Setup

Purpose: replace the MySQL schema with a D1-compatible schema.

Tasks:

- Create D1 database locally and remotely.
- Define Drizzle schema in TypeScript.
- Generate D1 migrations.
- Apply migrations locally.
- Apply migrations to the remote D1 database after local testing.

Recommended D1 schema direction:

```txt
users
- id
- username
- email
- password_hash
- role
- status
- token_version
- created_at
- updated_at

posts
- id
- title
- slug
- summary
- content
- content_html
- toc
- post_status
- published_at
- created_at
- updated_at

tags
- id
- name
- slug
- created_at

post_tags
- post_id
- tag_id

comments
- id
- post_id
- user_id
- content
- status
- created_at
- updated_at

sessions
- id
- user_id
- refresh_token_hash
- user_agent
- ip_hash
- status
- created_at
- last_used_at
- expires_at
- revoked_at
```

Important D1 decisions:

- Store `toc` as JSON string in `TEXT`.
- Use `TEXT` for datetime values, preferably ISO strings.
- Use application code to maintain `updated_at`.
- Use `TEXT CHECK(...)` constraints for enum-like values.
- Keep `post_tags` composite primary key.

Deliverables:

- `src/db/schema.ts`
- `drizzle.config.ts`
- Initial migration files
- Local D1 database with all tables

Acceptance criteria:

- Drizzle can query all tables locally.
- Migrations can be applied through Wrangler.
- No MySQL-only SQL remains in the new backend.

## 9. Phase 3: Shared Backend Infrastructure

Purpose: build reusable backend foundations before moving business logic.

Tasks:

- Create a Drizzle D1 client helper.
- Create response helpers.
- Create error handling middleware.
- Create validation helpers with Zod.
- Create cookie utilities.
- Create auth middleware.
- Create role middleware for admin-only routes.
- Create slug utility.
- Create datetime utility.

Suggested files:

```txt
src/utils/response.ts
src/utils/errors.ts
src/utils/slug.ts
src/utils/time.ts
src/middlewares/auth.ts
src/middlewares/admin.ts
src/db/client.ts
```

Recommended JWT payload:

```ts
type JwtPayload = {
  sub: number
  sid: string
  role: 'user' | 'admin'
  tokenVersion: number
  exp: number
}
```

Deliverables:

- Consistent success and error responses.
- Centralized auth middleware.
- Centralized database access.

Acceptance criteria:

- Route handlers do not manually duplicate response formatting.
- Auth middleware can read cookie, verify JWT, query D1 user, compare `token_version`, and verify the D1 session.

## 10. Phase 4: Migrate Public Read APIs

Purpose: migrate low-risk read features first.

Routes:

```txt
GET /api/tags
GET /api/posts
GET /api/posts/:slug
```

Tasks:

- Implement tags repository.
- Implement posts list repository.
- Implement post detail repository.
- Join posts with tags through `post_tags`.
- Parse `toc` JSON string before returning detail data.
- Return only published posts in public APIs.

Deliverables:

- Tags API.
- Published post list API.
- Post detail API.

Acceptance criteria:

- Frontend post list page works with the Hono backend.
- Frontend post detail page works with the Hono backend.
- TOC and `contentHTML` render correctly.

## 11. Phase 5: Migrate Authentication APIs

Purpose: restore user session behavior on the new backend.

Routes:

```txt
POST /api/register
POST /api/login
POST /api/logout
GET  /api/me

POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/me
```

Tasks:

- Implement register validation.
- Implement password hashing.
- Implement login.
- Implement admin login using the same user table and role check.
- Implement access JWT creation.
- Implement opaque refresh token generation and hashing.
- Store access and refresh tokens in HttpOnly cookies.
- Create D1 session records on login.
- Implement logout by revoking only the current session.
- Keep `token_version` available for emergency/global invalidation.
- Implement `/api/me` for normal login status.
- Implement `/api/admin/me` for admin-only login status.

Important Workers compatibility point:

- Avoid password libraries that require native Node.js modules.
- Prefer a Workers-compatible solution. If using Web Crypto, document the hashing design clearly.

Deliverables:

- Register API.
- Login API.
- Logout API.
- Me API.
- Admin me API.

Acceptance criteria:

- Normal user can register and log in.
- Admin user can log in through admin login.
- Logout invalidates only the current session.
- All-device logout can revoke all active sessions for the current user.
- Disabled users cannot log in.
- Non-admin users cannot access admin-only APIs.

## 12. Phase 6: Migrate Admin Post Write APIs

Purpose: migrate the most important content management workflow.

Routes:

```txt
POST   /api/admin/posts
POST   /api/admin/posts/:id/update
DELETE /api/admin/posts/:id
```

Tasks:

- Implement multipart or JSON-based post creation strategy.
- Decide final post editor payload format.
- Render Markdown into HTML.
- Generate TOC from rendered headings.
- Generate slug.
- Insert post in transaction.
- Upsert tags.
- Insert `post_tags`.
- Update post by id.
- Keep slug unchanged if title does not change.
- Regenerate slug when title changes.
- Hard delete post or keep current hard-delete behavior.

Recommended payload decision:

For a resume project, prefer a JSON-based API if the frontend editor owns the Markdown content:

```json
{
  "title": "Post Title",
  "summary": "Short summary",
  "content": "# Markdown content",
  "postStatus": "published",
  "tags": ["vue", "nuxt"]
}
```

This is cleaner than forcing file upload on every update.

Deliverables:

- Admin create post API.
- Admin update post API.
- Admin delete post API.

Acceptance criteria:

- Admin can create a post from the frontend.
- Admin can update title, summary, content, status, and tags.
- Admin can delete a post.
- Tags and `post_tags` remain consistent after updates.

## 13. Phase 7: Migrate Comments APIs

Purpose: restore comment functionality and permissions.

Routes:

```txt
GET    /api/posts/:id/comments
POST   /api/posts/:id/comments
DELETE /api/comments/:id
```

Tasks:

- Implement visible comment list.
- Join comments with users to return username.
- Require login for creating comments.
- Validate comment content.
- Use logical delete by setting `status = 'deleted'`.
- Allow comment owner to delete their own comment.
- Allow admin to delete any comment.

Deliverables:

- Comment list API.
- Create comment API.
- Delete comment API.

Acceptance criteria:

- Logged-out users can view visible comments.
- Logged-out users cannot create comments.
- Normal users can delete their own comments.
- Admin can delete any comment.
- Deleted comments are not returned in the visible list.

## 14. Phase 8: Connect Nuxt Frontend to New Backend

Purpose: switch the frontend from PHP backend to Worker backend.

Tasks:

- Update `NUXT_PUBLIC_API_BASE`.
- Confirm `$api` still uses `credentials: 'include'`.
- Confirm CORS allows the Nuxt dev origin.
- Confirm cookie settings work in local and deployed environments.
- Update post creation/update frontend payload if moving from file upload to JSON.
- Re-test Pinia user store.
- Re-test route middleware.

Local examples:

```txt
Nuxt dev server:
http://localhost:3000

Hono Worker local server:
http://localhost:8787

NUXT_PUBLIC_API_BASE:
http://localhost:8787/api
```

Deliverables:

- Frontend points to Hono Worker API.
- Admin post workflow works against D1.
- Normal user login and comments work against D1.

Acceptance criteria:

- No frontend feature still depends on PHP.
- No frontend API request points to `localhost:8000` by default in the final configuration.

## 15. Phase 9: Deploy to Cloudflare

Purpose: make the new backend publicly available.

Tasks:

- Create remote D1 database.
- Apply remote migrations.
- Configure Worker environment bindings.
- Configure JWT secret.
- Configure allowed frontend origin.
- Deploy Worker.
- Test production API.
- Update frontend production API base.

Required Cloudflare resources:

```txt
Cloudflare Workers
Cloudflare D1
Worker environment variables / secrets
```

Optional future resources:

```txt
Cloudflare R2 for images or uploaded assets
Cloudflare Pages for frontend deployment
```

Deliverables:

- Deployed Worker API.
- Remote D1 database.
- Production environment variables.

Acceptance criteria:

- Production frontend can call production Worker API.
- Cookie auth works in production.
- D1 data persists after deployment.

## 16. Phase 10: Remove PHP/MySQL Legacy Backend

Purpose: complete the migration and make the final architecture clean.

Tasks:

- Stop using PHP backend locally.
- Remove or archive `backend/`.
- Remove PHP documentation from main project documentation or move it to legacy notes.
- Remove MySQL-specific setup instructions.
- Remove Prisma/MySQL artifacts if they are no longer used.
- Update `docs/project-documentation.md` to describe Hono + Workers + D1 as the real backend.
- Update diagrams.
- Update README.
- Update `.env.example`.
- Confirm Nuxt Nitro server routes remain disabled.

Items to review:

```txt
backend/
prisma/
server/
package.json dependencies
nuxt.config.ts runtimeConfig
docs/project-documentation.md
README.md
```

Final acceptance criteria:

- Project can run without PHP installed.
- Project can run without MySQL installed.
- No production code depends on `backend/`.
- No final documentation describes PHP/MySQL as the active backend.
- `server/*` remains ignored as a legacy Nuxt Nitro API area unless intentionally reintroduced.

## 17. Suggested Timeline

| Day | Work |
| --- | --- |
| Day 1 | Phase 0 and Phase 1: route contract, Hono Worker skeleton, health API |
| Day 2 | Phase 2: D1 schema, Drizzle setup, migrations |
| Day 3 | Phase 3 and Phase 4: shared infrastructure, tags/posts read APIs |
| Day 4 | Phase 5: auth, JWT cookie, register/login/logout/me |
| Day 5 | Phase 6: admin post create/update/delete |
| Day 6 | Phase 7 and Phase 8: comments and frontend integration |
| Day 7 | Phase 9 and Phase 10: deployment, cleanup, documentation update |

This timeline assumes the frontend UI does not receive major redesign work during the backend migration. If the post editor is changed from file upload to JSON Markdown editing, reserve extra time for frontend editor cleanup.

## 18. Risk List

| Risk | Impact | Mitigation |
| --- | --- | --- |
| D1 differs from MySQL | Schema and query changes required | Design D1 schema before writing repositories |
| Workers runtime differs from Node.js | Some packages may not run | Choose pure JS or Web API compatible libraries |
| Cookie auth in cross-origin dev | Login appears successful but session is lost | Test CORS, credentials, SameSite, Secure settings early |
| Markdown rendering libraries may need DOM APIs | Runtime error in Workers | Use a pure JS markdown pipeline |
| Password hashing compatibility | Native bcrypt may fail | Choose Workers-compatible password hashing |
| Large migration scope | Easy to break existing frontend | Migrate route by route and keep API shape stable |

## 19. Testing Checklist

Public APIs:

- `GET /api/health`
- `GET /api/tags`
- `GET /api/posts`
- `GET /api/posts/:slug`

Auth APIs:

- Register success.
- Register duplicate username/email.
- Login success.
- Login wrong password.
- Logout invalidates old token.
- `/api/me` returns current user.
- `/api/admin/me` rejects normal user.

Admin APIs:

- Create draft post.
- Create published post.
- Update title and regenerate slug.
- Update content and regenerate `content_html` and `toc`.
- Update tags.
- Delete post.

Comments APIs:

- List visible comments.
- Create comment as logged-in user.
- Reject comment as logged-out user.
- Delete own comment.
- Delete any comment as admin.
- Hide logically deleted comments.

Frontend flows:

- Blog list page.
- Blog detail page.
- TOC rendering.
- Login page.
- Register page.
- Admin login page.
- Admin post create/update/delete.
- Comment create/delete.

## 20. Resume-Oriented Project Highlights

After migration, the project can be described as:

```txt
Built a Nuxt 3 personal blog and admin CMS with a standalone Hono backend deployed on Cloudflare Workers.
Used Drizzle ORM with Cloudflare D1 to implement type-safe database access, session-aware JWT authentication with HttpOnly cookies, per-device logout, Markdown rendering with TOC generation, post/tag/comment management, and role-based admin permissions.
```

Frontend-focused highlight:

```txt
Implemented a Nuxt 3 frontend with Pinia-based user state, route middleware authorization, Markdown article rendering, TOC navigation, comment interactions, and admin content management workflows.
```

Backend-focused highlight:

```txt
Migrated a PHP + MySQL backend to a serverless TypeScript architecture using Hono, Drizzle ORM, Cloudflare Workers, and D1.
```
