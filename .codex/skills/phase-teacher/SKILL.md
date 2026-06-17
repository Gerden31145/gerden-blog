---
name: phase-teacher
description: Teach project migration or implementation phases step by step. Use when the user says they are entering the next phase, asks for phase N / next phase / phase explanation / how to write phase code, or wants a phase goal, architecture logic, file-by-file implementation guide, or review checklist before coding. Especially suited to this repo's Hono + Drizzle + Cloudflare Workers + D1 migration plan, including Chinese-language requests with the same meaning.
---

# Phase Teacher

## Core Rule

Teach first, implement only when explicitly asked. If the user asks to be taught, asks for an explanation, asks how to write the code, says not to implement for them, or says they are entering a phase, do not edit files. Provide a structured walkthrough they can follow.

If the user later asks for direct edits, migration, testing, or review, switch to the normal coding or review workflow.

## Phase Teaching Workflow

1. Identify the target phase.
   - If the user says "next phase", infer it from recent context when possible.
   - If unclear, ask one concise question.
   - For this repo, read `docs/plan/hono-drizzle-workers-d1-migration-plan.md` and the relevant current Worker files before giving concrete code guidance.

2. Start with the phase objective.
   - State what this phase must deliver.
   - State what is intentionally out of scope.
   - Name the API routes, UI flows, database tables, or contracts affected.

3. Explain the construction logic before code.
   - Show the request/data flow as a short chain, for example:
     `route -> validation -> service -> repository -> db`.
   - Explain why each layer exists and what it must not do.
   - Point out any previous phases this phase depends on.

4. Teach files in build order.
   - Types and request schemas.
   - Utilities or services that transform data.
   - Repository/database functions.
   - Business service orchestration.
   - Routes/controllers and middleware.
   - Entry-point registration.
   - Local verification commands and manual API test cases.

5. For each file, use this mini-format.
   - Purpose: one or two sentences.
   - Code: focused snippets, not a giant dump unless requested.
   - Why: explain non-obvious decisions.
   - Pitfalls: mention common mistakes for this exact file.

6. Keep naming consistent with the repo.
   - Prefer existing response helpers, error classes, `getDB`, middleware, types, and route style.
   - Preserve established API shape unless the user explicitly decides to change it.
   - For this project, keep Nuxt as frontend and Worker as backend.

7. Close with a checklist.
   - What files should exist or change.
   - What commands to run, such as `npm run typecheck`.
   - What API calls or browser flows to manually verify.
   - Known edge cases to test.

## Explanation Style

Use Chinese when the user is using Chinese.

Be concrete and sequential. The user benefits from seeing the mental model first, then the code file order. Avoid jumping straight into a full implementation.

Prefer concise diagrams and short snippets. Expand into complete file code only when the user asks for complete code or asks you to write the full implementation.

When explaining backend code, call out:

- what belongs in route validation
- what belongs in service/business logic
- what belongs in repository/database access
- what belongs in utilities
- what should be kept out of each layer

When explaining state, auth, or session logic, relate it to familiar frontend concepts only as an analogy, and clarify where the analogy breaks.

## Cloudflare Workers Phases

When the phase involves Cloudflare Workers, Hono, D1, Wrangler, or deployment:

- Load the relevant Cloudflare/Workers/Wrangler skills before running commands or giving command-sensitive guidance.
- Prefer Workers-compatible APIs and libraries.
- Avoid Node-only assumptions unless the project config supports them.
- Mention D1/SQLite differences when schema or queries are involved.
- Remind the user to use secrets for production credentials and `.dev.vars` for local development secrets.

## Review Mode

If the user asks to review a completed phase:

1. Run or suggest the smallest meaningful verification first, usually `npm run typecheck`.
2. Read full touched files, not only the diff.
3. Lead with bugs and behavioral risks.
4. Use file and line references.
5. Separate compile errors, runtime logic issues, API shape issues, and cleanup suggestions.

Do not rewrite the user's code during a review unless they explicitly ask for fixes.
