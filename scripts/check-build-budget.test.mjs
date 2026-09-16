import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = fileURLToPath(new URL('./check-build-budget.mjs', import.meta.url))
const config = JSON.parse(readFileSync(new URL('./build-budget.json', import.meta.url), 'utf8'))
// Synthetic fixtures only; these are not measured build results.
const directory = mkdtempSync(join(tmpdir(), 'gerden-budget-test-'))
let sequence = 0

function run({ js = 250399, css = 22965, mode, editAssets, editBudget, malformed = false } = {}) {
  const assets = { schemaVersion: 1, unit: 'B', summary: { js: { rawBytes: js }, css: { rawBytes: css } } }
  const budget = structuredClone(config)
  editAssets?.(assets)
  editBudget?.(budget)
  const prefix = join(directory, String(sequence++))
  writeFileSync(`${prefix}-assets.json`, malformed ? '{' : JSON.stringify(assets))
  writeFileSync(`${prefix}-budget.json`, JSON.stringify(budget))
  const args = [script, `${prefix}-assets.json`, `${prefix}-budget.json`]
  if (mode !== undefined) args.push(mode)
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' },
  })
  assert.equal(result.error, undefined)
  return result
}

test('baseline passes; default is warn', () => {
  const result = run()
  assert.equal(result.status, 0)
  assert.match(result.stdout, /模式：`warn`；结果：通过/)
  assert.equal(result.stderr, '')
})

test('equal to both limits passes in strict mode', () => {
  const result = run({ js: config.limits.jsRawBytes, css: config.limits.cssRawBytes, mode: 'strict' })
  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
})

for (const type of ['js', 'css']) {
  for (const mode of ['warn', 'strict']) {
    test(`${type} one byte over: ${mode} preserves report and returns the expected status`, () => {
      // Lower the other metric: its reduction must not cancel this overage.
      const values = { js: 0, css: 0, [type]: config.limits[`${type}RawBytes`] + 1 }
      const result = run({ ...values, mode })
      assert.equal(result.status, mode === 'strict' ? 1 : 0)
      assert.match(result.stdout, /超线/)
      assert.match(result.stdout, /全量 JS/)
      assert.match(result.stdout, /全量 CSS/)
      assert.match(result.stderr, new RegExp(`::${mode === 'strict' ? 'error' : 'warning'}::${type.toUpperCase()}`))
    })
  }
}

const invalidCases = [
  ['missing metric', { editAssets: (a) => { delete a.summary.css.rawBytes } }],
  ['negative metric', { js: -1 }],
  ['fractional metric', { css: 0.5 }],
  ['unsafe integer', { js: Number.MAX_SAFE_INTEGER + 1 }],
  ['wrong schema', { editAssets: (a) => { a.schemaVersion = 2 } }],
  ['wrong unit', { editAssets: (a) => { a.unit = 'KiB' } }],
  ['malformed JSON', { malformed: true }],
  ['missing limit', { editBudget: (b) => { delete b.limits.jsRawBytes } }],
  ['zero baseline', { editBudget: (b) => { b.baseline.cssRawBytes = 0 } }],
  ['wrong scope', { editBudget: (b) => { b.scope = 'homepage' } }],
]
for (const mode of ['warn', 'strict']) {
  for (const [label, options] of invalidCases) {
    test(`${mode} fails on ${label} without partial Markdown`, () => {
      const result = run({ ...options, mode })
      assert.equal(result.status, 1)
      assert.equal(result.stdout, '')
      assert.match(result.stderr, /check-build-budget:/)
    })
  }
}

test('unknown mode is rejected rather than silently allowing growth', () => {
  const result = run({ mode: 'strcit' })
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
})
