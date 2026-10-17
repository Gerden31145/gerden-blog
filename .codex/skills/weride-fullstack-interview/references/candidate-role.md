# Candidate and role snapshot

Use this file as background, then prefer the current repository whenever code and snapshot differ. The résumé snapshot is dated 2026-09-18. Do not expose or search for the candidate's contact details.

## Target role

WeRide full-stack development daily internship for 2028 graduates in Guangzhou University Town.

### Responsibilities

- Participate in business-platform module design, development, and maintenance.
- Build reusable code libraries to improve reuse and development efficiency.
- Improve front-end product experience and performance based on user feedback.

### Requirements

- Strong JavaScript and ES6; TypeScript is preferred.
- Vue or React experience and at least one complete project.
- Familiarity with VS Code, Git, npm, debugging, and the front-end toolchain.
- Node.js backend exposure and use of MySQL and Redis.
- Clear communication, responsibility, initiative, and ability to read English technical documentation.
- At least three months, four or more days per week; this candidate can state five days per week and six months or longer.

## Candidate positioning

- 2028 software-engineering undergraduate seeking front-end/full-stack internships.
- Strongest stack alignment: JavaScript/TypeScript, Vue/Nuxt, Node/NestJS, SQL, Redis/queues, testing, deployment, and browser/network fundamentals.
- The résumé sets a relatively high engineering expectation. Interviewers can reasonably ask for implementation details behind every reliability, concurrency, security, testing, and performance claim.

## Résumé claims by project

### KnowledgeOps Agent

Stack: Nuxt 4, TypeScript, TanStack Query, NestJS, Prisma, PostgreSQL, Redis/BullMQ, LangChain, Zod, and Vitest.

Claimed scope:

- A developer learning-plan and acceptance tool, still under development.
- Nuxt/TanStack Query workbench with a run ID in the URL, snapshot recovery after refresh, increasing-interval polling, terminal-state stopping, retries, and separation of transport errors from business failures.
- Real model generation through LangChain, Zod structural validation, unique task IDs, dependency-reference validation, and handwritten Kahn topological sorting for cross-stage cycle detection.
- NestJS background generation using a transactional Outbox and BullMQ.
- Atomic plan and successful-run commit using a Prisma transaction.
- Row locks and version checks for duplicate, concurrent, and late results.
- Vitest coverage for rollback, duplicates, and concurrent commits, with 15 dedicated acceptance cases reported.

Likely project identity signals: NestJS modules, Prisma schema/migrations, generation-run state machine, BullMQ queues/workers, outbox records or dispatcher, LangChain adapters, DAG validation, and Nuxt plan/run pages.

### Gerden Blog

Stack: Nuxt 4, TypeScript, Pinia, Tailwind CSS, Hono, Drizzle ORM, Cloudflare Workers/D1/Queues, GitHub Actions, and Playwright.

Claimed scope:

- SSR article list/details, dynamic metadata, historical slug mapping, and SSR-time 301 redirects.
- Responsive TOC with `IntersectionObserver`; lazy-loaded comments.
- Reported Lighthouse metrics: home Performance/SEO 100; detail Performance 97 and SEO 100; LCP around 1.4 seconds.
- Shared `$fetch`/`useFetch` behavior, cookie forwarding, typed responses, 401 cleanup, Pinia user state, `/me` and `/admin/me` checks, route middleware, and admin protection.
- Hono/Drizzle/D1 API layering, JWT in HttpOnly cookies, and Zod validation.
- Cloudflare Queue pipeline for Markdown, Shiki, HTML sanitization, and TOC generation; content hashes plus conditional updates prevent stale jobs overwriting new content.
- GitHub Actions/SSH/PM2 deployment with local service, public-domain, and Playwright browser checks; local-check failure triggers rollback and browser failure retains screenshots/traces/reports.

Likely project identity signals: Nuxt routes and server rendering, Hono API, Drizzle schemas, Worker/Queue handlers, content hash or compare-and-set logic, authentication middleware, Playwright, and deployment workflows.

### iHAVC

Stack: Vue 3, Vite, TypeScript, Pinia, Axios, and Element Plus.

Claimed scope:

- Business platform for university live presentations, one-to-one video Q&A, activities, and school presentation management.
- Multi-role state and UI for universities, schools, teachers, and ordinary users using route guards, a whitelist, Axios interceptors, Pinia persistence, and configuration-driven role checks.
- Reusable filters, forms, status views, details components, and isolated Axios instances for different business modules.
- Element Plus/icon on-demand imports and removal of seven unused global registrations; reported entry JS gzip reduction of 15.9%, CSS gzip reduction of 6.4%, and 108 fewer build modules, followed by production-build and critical-route regression checks.
- Typed WebSocket and SSE composables; room isolation by `liveId + teacherId`; protocol validation, message dispatch, heartbeats, reconnects, dynamic switching, component-unmount cleanup, and teacher-scoped SSE subscriptions.

Likely project identity signals: Vue Router guards, Pinia stores, Axios instances/interceptors, role configuration, reusable business components, Vite/Element Plus import configuration, bundle analysis, and WebSocket/SSE composables.

## How to handle mismatch

The repository is authoritative for “what exists now.” If a résumé claim is not found:

1. search obvious synonyms and adjacent layers;
2. check whether the checkout is partial, a monorepo package, or a different branch;
3. label the claim `claimed`, never `verified`;
4. ask the candidate to locate or explain it;
5. coach an honest interview answer if it is planned, simplified, or no longer present.

