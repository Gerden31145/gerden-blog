// 逐文件离线压缩估算，不是实际 HTTP 传输量，也不是整个目录的压缩归档大小。
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import {
  gzipSync,
  brotliCompressSync,
  constants,
} from 'node:zlib'

const gzipLevel = 9
const brotliParamQuality = 11
const supportedExtensions = new Set(['.js', '.css'])

function displayPath(filePath) {
  return relative(process.cwd(), filePath).split(sep).join('/') || '.'
}

// 只收集普通 JS/CSS 文件；不跟随目录内的符号链接，避免循环和重复统计。
function collectAssetFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectAssetFiles(fullPath))
    } else if (entry.isFile() && supportedExtensions.has(extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

function measureFile(filePath) {
  const buffer = readFileSync(filePath)
  const gzip = gzipSync(buffer, { level: gzipLevel })
  const brotli = brotliCompressSync(buffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: brotliParamQuality,
    },
  })
  return {
    path: displayPath(filePath),
    type: extname(filePath).slice(1),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    rawBytes: buffer.length,
    gzipBytes: gzip.length,
    brotliBytes: brotli.length,
  }
}

function summarize(files) {
  return files.reduce((total, file) => ({
    count: total.count + 1,
    rawBytes: total.rawBytes + file.rawBytes,
    gzipBytes: total.gzipBytes + file.gzipBytes,
    brotliBytes: total.brotliBytes + file.brotliBytes,
  }), { count: 0, rawBytes: 0, gzipBytes: 0, brotliBytes: 0 })
}

function main() {
  const args = process.argv.slice(2)
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: node scripts/measure-build.mjs <directory-or-js/css-file>\nOutputs JSON to stdout. Reads assets only; does not build or modify files.\nDirectory scans skip symbolic links. Sizes are individual-file compression estimates in bytes.')
    return
  }
  if (args.length !== 1) {
    throw new Error('Expected one input path. Use --help for usage.')
  }

  const inputPath = resolve(args[0])
  const inputStat = statSync(inputPath)
  let paths
  if (inputStat.isDirectory()) {
    paths = collectAssetFiles(inputPath)
  } else if (inputStat.isFile() && supportedExtensions.has(extname(inputPath))) {
    paths = [inputPath]
  } else {
    throw new Error('Input must be a directory or a .js/.css file.')
  }
  if (!paths.length) throw new Error('No .js or .css files found.')

  const files = paths.sort().map(measureFile)
  const top10 = [...files].sort((a, b) => b.rawBytes - a.rawBytes ||
    (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).slice(0, 10)

  console.log(JSON.stringify({
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    input: displayPath(inputPath),
    node: process.version,
    zlib: process.versions.zlib,
    brotli: process.versions.brotli,
    scriptSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
    gzipLevel,
    brotliParamQuality,
    otherCompressionOptions: 'Node defaults for the recorded runtime versions',
    unit: 'B',
    scope: 'Individual-file offline compression estimates; not HTTP transfer or archive size',
    summary: {
      js: summarize(files.filter(file => file.type === 'js')),
      css: summarize(files.filter(file => file.type === 'css')),
      all: summarize(files),
    },
    top10,
    files,
  }, null, 2))
}

try {
  main()
} catch (error) {
  console.error(`measure-build: ${error.message}`)
  process.exitCode = 1
}

