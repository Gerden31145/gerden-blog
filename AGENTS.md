# AGENTS.md

## Project Overview

This project is Gerden's personal blog and blog management system. It is intended to become a resume-level frontend-focused full-stack project.

The frontend is a Nuxt application that provides:

- Public blog homepage.
- Blog list and detail pages.
- Markdown article rendering with TOC navigation.
- User login and registration pages.
- Comment display, creation, and deletion.
- Admin login and post management workflows.

The backend is being migrated from the temporary PHP implementation to a serverless TypeScript architecture based on Hono, Drizzle ORM, Cloudflare Workers, and Cloudflare D1.

The final project should not require PHP or MySQL.

## Target Architecture

Final runtime architecture:

```txt
Browser
  |
  v
Nuxt frontend
  |
  | REST API with credentials included
  v
Cloudflare Worker
  |
  v
Hono routes / middleware / controllers
  |
  v
Services / repositories
  |
  v
Drizzle ORM
  |
  v
Cloudflare D1
```

Nuxt should be treated as the frontend layer. Nuxt Nitro server routes should not be used as the active backend for this project.

## Current Transition State

Current backend:

```txt
backend/
  PHP + PDO + MySQL
```

The PHP backend is a legacy/reference implementation during migration. It may be used to understand existing behavior, route contracts, response shapes, and business rules.

Target backend:

```txt
worker/ or backend-worker/
  Hono + Drizzle ORM + Cloudflare Workers + D1
```

After migration is complete:

- The frontend should call the Hono Worker API.
- The project should run without PHP installed.
- The project should run without MySQL installed.
- PHP/MySQL documentation should be removed or moved to legacy notes.
- `backend/` should be archived or removed.
- Prisma/MySQL artifacts should be removed if no longer used.

## Main Tech Stack

Frontend:

- Nuxt 4 / Vue 3
- TypeScript
- Pinia
- Tailwind CSS
- Nuxt route middleware
- `$fetch`/custom API plugin with `credentials: 'include'`

Target backend:

- Hono
- TypeScript
- Cloudflare Workers
- Cloudflare D1
- Drizzle ORM
- Zod
- JWT authentication
- HttpOnly cookies

Content processing:

- Markdown to HTML rendering
- TOC generation from rendered headings
- HTML sanitization where needed

Authentication:

- User table with `role`, `status`, and `token_version`
- JWT stored in HttpOnly cookie
- `token_version` comparison for logout/token invalidation
- Admin permissions based on `role = 'admin'`

Database:

- Final database is Cloudflare D1, which uses SQLite semantics.
- Do not write MySQL-only schema or queries in the final backend.
- Store JSON-like fields such as TOC as `TEXT` JSON strings when needed.
- Maintain `updated_at` in application code.

## Important Directories

```txt
app/
  Nuxt frontend application

app/pages/
  Page-level Vue components

app/components/
  Shared UI and feature components

app/services/
  Frontend API request modules

app/stores/
  Pinia stores

app/middleware/
  Route middleware

backend/
  Legacy PHP backend used only as migration reference

server/
  Legacy Nuxt Nitro server area; not the active backend

docs/
  Project documentation, notes, and migration plans

docs/plan/
  Development plans and migration roadmaps
```

## Backend API Scope

The final Hono backend should preserve these API capabilities:

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

Keep the frontend API shape stable where practical. If a route or payload changes, update the matching frontend service and documentation in the same change.

## Development Goals

Primary backend goals:

1. Fully migrate from PHP + MySQL to Hono + Drizzle + Workers + D1.
2. Preserve existing blog, auth, admin, and comment behavior.
3. Keep API response formats consistent.
4. Use D1-compatible schema and queries only.
5. Keep authentication based on HttpOnly JWT cookies and `token_version`.
6. Make the backend deployable to Cloudflare Workers.

Primary frontend goals:

1. Keep Nuxt focused on the user-facing and admin UI.
2. Maintain Pinia-based user state.
3. Keep route middleware for admin-only pages.
4. Improve blog reading experience: TOC, code blocks, responsive layout, SEO.
5. Improve admin CMS experience: post editing, validation, loading states, and error states.

Project quality goals:

1. Prefer clear module boundaries: routes, controllers, services, repositories, middleware, and utilities.
2. Keep TypeScript types explicit for API payloads and user-facing data.
3. Validate incoming backend requests with Zod.
4. Avoid Node-only packages in Worker code unless compatibility is confirmed.
5. Keep documentation updated when architecture or API behavior changes.

## Migration Plan Reference

Detailed migration plan:

```txt
docs/plan/hono-drizzle-workers-d1-migration-plan.md
```

Use that plan as the main roadmap for backend migration work.

## Notes for Future Agents

- Do not treat `server/*` as the active backend.
- Do not add new backend features to the PHP backend unless explicitly requested.
- During migration, use the PHP backend only as a behavior reference.
- New backend code should target Cloudflare Workers compatibility.
- Avoid MySQL-specific SQL in new backend code.
- If changing API contracts, update frontend services and docs together.
- Keep changes scoped and avoid unrelated refactors.
