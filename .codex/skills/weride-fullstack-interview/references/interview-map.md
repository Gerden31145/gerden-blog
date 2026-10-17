# Interview map

Use this map to choose high-value branches after inspecting the current repository. Do not mechanically exhaust every item.

## Public-signal summary

Publicly reported WeRide development interviews from different teams and years repeatedly suggest this pattern:

- résumé and project deep dive with chained follow-ups;
- live coding, commonly classic Easy–Medium algorithms or JavaScript async tasks;
- front-end/browser/network fundamentals for front-end candidates;
- database, Redis, concurrency, and engineering scenarios for backend/full-stack candidates;
- emphasis on whether the candidate truly implemented and reflected on the design.

These reports are directional evidence, not a promise about this team or interview round.

## KnowledgeOps Agent attack branches

### Asynchronous generation and BullMQ

Start with: “Why does model generation need BullMQ? Why not await the model inside the NestJS request?”

Useful follow-ups:

- Which latency, timeout, retry, and resource-isolation problem does the queue solve?
- What does the API persist and return before enqueueing?
- What delivery semantic does the queue provide in this implementation?
- Can a job run more than once? Where is idempotency enforced?
- What happens when Redis is unavailable, a worker crashes after model output, or a stalled job is retried?
- What backoff, timeout, concurrency, and dead-letter/recovery behavior actually exists?

### Transactional Outbox

Start with: “Describe the exact failure window that made you introduce an Outbox.”

Useful follow-ups:

- Which database write and event record share a transaction?
- How does the dispatcher claim records without double publishing?
- What happens if publish succeeds but marking the outbox row succeeds late or fails?
- Is the system exactly-once, or at-least-once plus idempotency?
- How are stuck records retried and observed?
- Why not enqueue directly after the database transaction?

### Finalization, row locks, and versions

Start with: “Why use both a row lock and a version check? What race does each prevent?”

Useful follow-ups:

- Identify the locked row, transaction boundary, and actual SQL/ORM behavior.
- What is the state transition predicate?
- Walk through two workers finalizing the same run.
- Walk through a timed-out run whose old worker returns late.
- What isolation level is assumed? Can another transaction observe intermediate state?
- Could a conditional update replace one of the mechanisms?
- How is a losing worker classified and logged?

### Structured output and DAG validation

Start with: “What can Zod prove here, and what must be validated beyond the schema?”

Useful follow-ups:

- Differentiate syntactic shape, semantic references, uniqueness, and graph acyclicity.
- Explain Kahn's algorithm, complexity, and how cycle detection follows from processed-node count.
- Why validate the whole graph rather than each stage independently?
- How are missing dependencies, duplicates, self-dependencies, and cross-stage edges handled?
- What happens when model output is invalid: repair, retry, reject, or partially accept?

### Front-end run recovery

Start with: “Why store the run ID in the URL, and what exactly happens after a refresh?”

Useful follow-ups:

- Server state versus client state; TanStack Query cache versus durable truth.
- Polling interval growth, terminal-state stop, retry limits, tab backgrounding, and request cancellation.
- Transport error versus business failure and how the UI communicates each.
- Polling versus SSE/WebSocket; why the current choice is appropriate.
- What happens with two tabs or a stale run URL?

### Tests and proof

Start with: “Your résumé says 15 dedicated acceptance cases passed. Which failure property would regress first if the implementation were wrong?”

Useful follow-ups:

- Unit, integration, or database-backed test boundaries.
- How concurrency was made deterministic rather than timing-dependent.
- Rollback assertions and side-effect assertions.
- Whether Redis/queue behavior is real, fake, or mocked.
- The strongest untested production risk.

## Gerden Blog attack branches

### SSR, data fetching, and SEO

- Explain the server request path for an article detail page and why `useFetch` can participate in SSR.
- What data is serialized for hydration, and how do duplicate client requests get avoided?
- Why is a historical slug redirect 301 rather than 302? How is the mapping stored and queried?
- What is genuinely improved for crawlers versus only for users?
- Reconcile Lighthouse numbers with lab conditions, device/network profile, and repeatability.

### Authentication and security

- Why use a JWT inside an HttpOnly cookie? Which threats does HttpOnly mitigate and which does it not?
- Why are `/me` and `/admin/me` needed if Pinia already contains user state?
- Front-end middleware versus server-side authorization: where is the real security boundary?
- Cookie attributes: `Secure`, `SameSite`, path/domain, expiration, refresh/logout.
- CSRF, XSS, CORS, HTML sanitization, and whether state-changing routes need a CSRF defense.

### Queue rendering and stale-work prevention

- Why move Markdown/Shiki rendering out of the request path?
- What is in the queue message, and what is the idempotency key?
- Demonstrate how a content hash plus conditional update prevents an old job from overwriting a new edit.
- What if the same content is queued twice, a worker retries, or rendering succeeds but the write fails?
- How are job states and structured logs used for recovery?

### Deployment and validation

- Distinguish liveness, readiness, smoke, integration, and end-to-end checks.
- What exactly triggers rollback, and why do browser-test failures not necessarily roll back?
- How is the deployed build/version identified through each layer?
- What failure can pass all three checks?
- Why use Vitest versus Playwright for different assertions?

## iHAVC attack branches

### Multi-role architecture

- Model the roles, permissions, and shared behavior. Is this RBAC, identity switching, or both?
- Why use configuration-driven checks instead of scattered conditionals?
- What belongs in Pinia, what is persisted, and how is stale persisted state invalidated?
- Router guards and UI hiding are not authorization. Where must the backend enforce access?
- How are shared components kept reusable without accumulating role-specific branches?

### Axios abstraction

- Why use more than one Axios instance? Which policies differ?
- Request/response interceptor order, error propagation, cancellation, and token/session expiry.
- How do concurrent 401 responses avoid repeated cleanup or refresh storms?
- When would native `fetch` or a query library be preferable?

### Bundle optimization

- How was the bundle problem discovered and measured?
- Why could seven global component registrations pull in 108 modules?
- Static ESM imports, side effects, tree shaking, CSS imports, and on-demand component resolvers.
- Raw, gzip, and parsed/executed size; which metric affects users and under what network/device conditions?
- Was the before/after build configuration identical? Which critical routes were regressed?
- Can the reported size reduction be translated into actual user-facing latency?

### WebSocket and SSE lifecycle

- Why WebSocket for chat and SSE for queue counts?
- Connection ownership, deduplication, room identity, dynamic switching, and cleanup.
- Heartbeat direction and what failure it detects.
- Reconnect backoff, jitter, duplicate messages, ordering, replay, and last-event IDs.
- Protocol validation and how malformed or stale messages are handled.
- Browser connection limits, proxy timeouts, authentication, and horizontal scaling.

## Fundamentals linked to the JD

Use fundamentals as extensions of project evidence when possible.

### JavaScript and ES6

- lexical scope, closures, `this`, prototype chain, `new`, `call/apply/bind`;
- Promise resolution, error propagation, `async/await`, microtasks/macrotasks, cancellation with `AbortController`;
- modules, destructuring, iterators, generators, `Map/Set`, property descriptors, shallow/deep copying;
- practical tasks: serial async execution with delay, `Promise.all`/`race`, promisify, debounce/throttle, object cleanup.

### Vue and browser

- Vue 3 proxy-based reactivity, dependency tracking, `computed` caching, `watch` timing, lifecycle and cleanup;
- component communication, composables, Pinia, router guards, virtual DOM/key/diff at an interview-appropriate depth;
- URL-to-page path, DOM/CSSOM/render tree/layout/paint/composite;
- caching, browser storage and quota, large client data and IndexedDB;
- request cancellation, CORS, XSS, CSRF, cookies, HTTP status codes, HTTP/2 and HTTPS/TLS basics.

### Node, database, and Redis

- Node event loop and async I/O; CPU-heavy work and worker threads/process separation;
- middleware, request lifecycle, REST design, validation, errors, idempotency, observability;
- B+ trees, clustered/secondary indexes, composite-index leftmost prefix, covering indexes, query plans, transactions, isolation, MVCC, locks, and slow queries;
- Redis data structures, expiration/eviction, persistence/recovery, cache penetration/breakdown/avalanche, hot keys, consistency, streams/queues, and failure degradation.

## Coding and oral problem pool

Prefer one problem that tests reasoning and communication over several disconnected puzzles.

- JavaScript async sequencing or event-loop output.
- Valid parentheses.
- Quicksort with correct boundaries and complexity discussion.
- BFS/shortest path on a grid.
- Permutations/backtracking and duplicate handling.
- Binary search or search in a sorted 2D matrix.
- Copy a linked list with random pointers.
- Rotate-array minimum, tree traversal/view, or a small object transformation such as recursive empty-value removal.

Require this sequence: restate requirements, clarify boundaries, explain approach, write code, construct tests, analyze time/space, then discuss one improvement.

## Engineering scenarios

- Design a live vehicle/fleet operations dashboard: data freshness, real-time delivery, reconnect, stale markers, pagination/history, permissions, and observability.
- Store high-volume vehicle location events and query the nearest available vehicle: write volume, spatial indexing, hot/current state versus history, consistency, and availability.
- Design a reusable business-platform component or API layer used by several roles without leaking authorization decisions into the UI.
- Diagnose a front-end performance regression using measurements rather than intuition.

## Motivation and behavioral questions

- Why WeRide, and why a Web/full-stack role at an autonomous-driving company?
- Which project decision best shows product thinking rather than technology stacking?
- Describe a hard bug, how it was narrowed down, and what evidence proved the fix.
- How is AI coding used without outsourcing understanding: requirement decomposition, documentation, review, tests, and verification.
- Availability, ownership, collaboration, disagreement, and an example of proactively learning an unfamiliar technology.

## Source snapshot

For provenance only; do not cite these during a mock interview unless asked.

- WeRide careers and company context: https://www.weride.ai/zh/careers
- WeRide recruiting perspective: https://www.36kr.com/p/2371778162944002
- Front-end internship report, first round: https://www.nowcoder.com/feed/main/detail/5679657d1d784d4fb74d7adabdd4429d
- Front-end internship report, second round: https://www.nowcoder.com/feed/main/detail/230f85e9aa614efebdeac770b2aa20c7
- Recent backend/full-stack-style deep dive: https://www.nowcoder.com/discuss/917720794417856512
- Backend scenario and coding report: https://www.nowcoder.com/feed/main/detail/676fc9fde0cf4cceb9727d09add8dabf
- Backend internship report: https://www.sheepblack.cn/archives/1141

