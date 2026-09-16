// Compare an existing report with a fixed budget. This does not build the app.
import { readFileSync } from 'node:fs'

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read JSON "${path}": ${error.message}`)
  }
}

function validateBytes(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} must be a safe integer >= ${minimum}`)
  }
  return value
}

function main() {
  const args = process.argv.slice(2)
  if (args.length < 2 || args.length > 3) {
    throw new Error('Usage: node scripts/check-build-budget.mjs <client-assets.json> <build-budget.json> [warn|strict]')
  }
  const [assetsPath, budgetPath, mode = 'warn'] = args
  if (!['warn', 'strict'].includes(mode)) {
    throw new Error('Budget mode must be warn or strict')
  }

  const assets = readJson(assetsPath)
  const budget = readJson(budgetPath)
  for (const [label, report] of [['assets', assets], ['budget', budget]]) {
    if (report?.schemaVersion !== 1 || report?.unit !== 'B') {
      throw new Error(`${label}: expected schemaVersion 1 with unit B`)
    }
  }
  if (budget.scope !== 'all-client-assets-raw') {
    throw new Error('Budget scope must be all-client-assets-raw')
  }

  // Validate both rows before producing any output. Missing data is an error.
  const rows = ['js', 'css'].map((type) => {
    const key = `${type}RawBytes`
    const actual = validateBytes(assets.summary?.[type]?.rawBytes, `summary.${type}.rawBytes`)
    const baseline = validateBytes(budget.baseline?.[key], `baseline.${key}`, 1)
    const limit = validateBytes(budget.limits?.[key], `limits.${key}`)
    return {
      type, actual, baseline, limit,
      delta: actual - baseline,
      growth: ((actual - baseline) / baseline * 100).toFixed(2),
      exceeded: actual > limit,
    }
  })
  const exceeded = rows.some((row) => row.exceeded)
  const status = !exceeded ? '通过' : mode === 'warn' ? '需要复查（不阻断）' : '失败（严格模式）'
  console.log([
    '## 客户端资源预算',
    '',
    `模式：\`${mode}\`；结果：${status}。`,
    '',
    '| 资源 | 固定基线 B | 本次 B | 增量 B | 相对基线 | 提醒/失败线 B | 结果 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...rows.map((row) => `| 全量 ${row.type.toUpperCase()} | ${row.baseline} | ${row.actual} | ${row.delta} | ${row.growth}% | ${row.limit} | ${row.exceeded ? '超线' : '通过'} |`),
    '',
    '统计全量客户端 JS/CSS 原始字节，不代表首页首次下载量或实际 HTTP 传输量。',
    '5% 是初始复查策略，不是功能增长上限或实测波动范围。新增功能应解释成本，必要时评审并调整预算；不自动更新基线。',
  ].join('\n'))

  // Keep stdout as Markdown. GitHub annotations and local warnings go to stderr.
  for (const row of rows.filter((row) => row.exceeded)) {
    const severity = mode === 'strict' ? 'error' : 'warning'
    const message = `${row.type.toUpperCase()} rawBytes ${row.actual} exceeds ${row.limit} B (baseline ${row.baseline} B)`
    console.error(process.env.GITHUB_ACTIONS === 'true'
      ? `::${severity}::${message}`
      : `${severity}: ${message}`)
  }
  // Print the report before failing, so the evidence survives a strict failure.
  if (exceeded && mode === 'strict') process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error(`check-build-budget: ${error.message}`)
  process.exitCode = 1
}
