# Assessment and coaching

Use this rubric for branch feedback, answer reviews, and final reports. In strict mock mode, keep it private until the user asks to pause or finish.

## Score dimensions

Score each dimension from 0 to 4, for a total of 16.

### Correctness

- **4**: mechanism and terminology are correct; edge cases are handled.
- **3**: core answer is correct with a minor omission.
- **2**: partly correct but contains ambiguity or a meaningful gap.
- **1**: mostly incorrect, confused, or dependent on buzzwords.
- **0**: no usable answer.

### Repository evidence

- **4**: accurately names the real flow, state, schema, test, or implementation and can point to it.
- **3**: grounded in the project but misses one concrete link.
- **2**: plausible and project-related, but largely generic.
- **1**: conflicts with or cannot be located in the repository.
- **0**: invents implementation.

### Engineering depth

- **4**: explains rationale, alternatives, tradeoffs, failure modes, and validation.
- **3**: explains rationale plus at least one tradeoff or failure mode.
- **2**: explains the happy path but not boundaries.
- **1**: names technology without explaining the mechanism.
- **0**: cannot connect the technology to the problem.

### Spoken clarity

- **4**: direct 60–90 second structure; conclusion first; concrete and easy to follow.
- **3**: clear but slightly long or unordered.
- **2**: understandable after follow-up.
- **1**: rambling or contradictory.
- **0**: cannot communicate an answer.

## Verdict bands

- **14–16**: strong; likely survives deeper follow-up.
- **11–13**: interview-ready with a few targeted fixes.
- **8–10**: risky; understands the surface but follow-ups may expose gaps.
- **4–7**: high risk; needs focused review before claiming this area.
- **0–3**: do not present the claim as mastered.

Never convert this directly into a hiring probability. One answer and one public report cannot justify that precision.

## Branch feedback format

Keep feedback compact:

1. **Verdict and score** — one sentence plus `correctness/evidence/depth/clarity`.
2. **What worked** — at most two specific points.
3. **Main risk** — the most damaging error or omission.
4. **Better spoken answer** — a natural 60–90 second answer grounded in the repository.
5. **Evidence to review** — exact relative file paths and symbols when available.
6. **Next pressure point** — one likely follow-up.

Do not overwhelm the candidate with a full tutorial while the interview is active. Offer deeper teaching after the branch.

## Strong spoken-answer shapes

Use a structure appropriate to the question rather than forcing a mnemonic.

### Design choice

1. State the concrete problem.
2. State the chosen mechanism and its place in the request/data flow.
3. Explain why a simpler alternative was insufficient.
4. Name the main tradeoff or residual risk.
5. State how the behavior was verified.

### Reliability or concurrency

1. State the invariant.
2. Walk through the normal state transition.
3. Walk through the failure or race.
4. Identify the guard: transaction, conditional update, lock, version, idempotency key, or retry policy.
5. State the remaining delivery guarantee honestly.

### Performance claim

1. State the symptom and baseline.
2. Explain the measurement method and controlled variables.
3. Identify the root cause from evidence.
4. Explain the change and mechanism.
5. Give the before/after number and user-impact caveat.

## Red flags to call out

- “Exactly once” without a defensible end-to-end mechanism.
- Treating a queue retry as idempotency.
- Treating a front-end route guard as authorization.
- Saying HttpOnly prevents CSRF or all XSS impact.
- Claiming Redis is durable or strongly consistent without configuration and limits.
- Saying a database transaction includes an external queue publish.
- Mixing Node's event loop with the browser event loop without qualification.
- Claiming tree shaking merely because unused code exists.
- Reporting performance numbers without a baseline, method, or identical build conditions.
- Describing tests that do not actually exercise the claimed concurrency/failure behavior.
- Presenting planned or absent code as finished.

## Gap-audit output

When auditing rather than interviewing, use a table with:

| Priority | Résumé claim or topic | Status | Repository evidence | Likely follow-up | Recommended action |
| --- | --- | --- | --- | --- | --- |

Status must be `verified`, `partial`, `claimed-not-found`, `contradicted`, or `not-applicable`.

Then give:

- the five highest-risk questions;
- the three claims the candidate can defend most strongly;
- a review order based on interview value, not file order.

