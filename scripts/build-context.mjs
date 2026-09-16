// Run from the repository root. This records context; it does not build the app.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

try {
  // Pass arguments separately: no shell command interpolation is needed.
  const checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim()

  const context = {
    checkoutSha,
    // GitHub event SHA can differ from HEAD if checkout selects another ref.
    githubSha: process.env.GITHUB_SHA ?? null,
    eventName: process.env.GITHUB_EVENT_NAME ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    release: process.env.BUILD_RELEASE_ID ?? null,
    node: process.version,
    lockfileSha256: createHash('sha256')
      .update(readFileSync('package-lock.json'))
      .digest('hex'),
    platform: process.platform,
    arch: process.arch,
    apiBase: process.env.NUXT_PUBLIC_API_BASE || null,
    // Manual runs may pass empty strings because there is no pull_request event.
    prHeadSha: process.env.PR_HEAD_SHA || null,
    prBaseSha: process.env.PR_BASE_SHA || null,
  }

  // Keep stdout as JSON so the workflow can redirect it to a report file.
  console.log(JSON.stringify(context, null, 2))
} catch (error) {
  console.error(`build-context: ${error.message}`)
  process.exitCode = 1
}
