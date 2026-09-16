// Read existing reports and print Markdown. No build or measurement is performed.
import { readFileSync } from 'node:fs'

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read JSON report "${filePath}": ${error.message}`)
  }
}

function validateMetrics(metrics, label) {
  for (const key of ['count', 'rawBytes']) {
    if (!Number.isSafeInteger(metrics?.[key]) || metrics[key] < 0) {
      throw new Error(`${label}.${key} must be a non-negative safe integer`)
    }
  }
  return metrics
}

function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2) {
    throw new Error('Usage: node scripts/summarize-build.mjs <client-assets.json> <build-context.json>')
  }

  const [assetsPath, contextPath] = args
  const assets = readJson(assetsPath)
  const context = readJson(contextPath)

  if (assets?.schemaVersion !== 1 || assets?.unit !== 'B') {
    throw new Error('Expected asset report schemaVersion 1 with unit B')
  }
  if (typeof context?.checkoutSha !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(context.checkoutSha)) {
    throw new Error('build-context.checkoutSha must be a full Git commit hash')
  }
  if (typeof context?.node !== 'string' || !/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(context.node)) {
    throw new Error('build-context.node must contain a Node version such as v24.18.1')
  }
  if (assets.node !== context.node) {
    throw new Error('Node versions in the two reports do not match')
  }

  const js = validateMetrics(assets.summary?.js, 'summary.js')
  const css = validateMetrics(assets.summary?.css, 'summary.css')

  // Validate everything before printing, so errors do not produce a partial table.
  const markdown = [
    '## 前端构建资源报告',
    '',
    `提交（checkout HEAD）：\`${context.checkoutSha}\``,
    `Node：\`${context.node}\``,
    '',
    '| 资源 | 文件数 | 原始体积（B） |',
    '| --- | ---: | ---: |',
    `| 全量 JS | ${js.count} | ${js.rawBytes} |`,
    `| 全量 CSS | ${css.count} | ${css.rawBytes} |`,
    '',
    '统计范围：输入报告所统计的全量客户端产物，不代表首页首次下载量。',
    '以上为未压缩原始字节，不是实际 HTTP 传输量。本步骤仅展示数据，尚未判断资源预算。',
  ].join('\n')

  console.log(markdown)
}

try {
  main()
} catch (error) {
  console.error(`summarize-build: ${error.message}`)
  process.exitCode = 1
}
