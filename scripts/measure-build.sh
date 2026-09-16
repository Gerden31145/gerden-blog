#!/usr/bin/env bash
# Run one production build. Read the result before starting further runs.
set -euo pipefail

usage() {
  cat <<'HELP'
Usage: bash scripts/measure-build.sh [run-id]

Example (Git Bash, from the project root):
  PERF_NOTES='Plugged in; balanced power mode; dev server stopped' \
    bash scripts/measure-build.sh build-first

Defaults:
  run-id:                  build-YYYYMMDD-HHMMSS
  NUXT_PUBLIC_API_BASE:     http://localhost:8787/api
  BUILD_RELEASE_ID:        perf-baseline

Optional environment variables:
  PERF_NOTES              Power mode, background load, and other conditions.
  PERF_CACHE_STATE        Descriptive label only; does not alter caches.

Outputs: .perf-results/baseline/<run-id>/
  build.log              stdout and stderr from npm run build
  elapsed.txt            elapsed seconds measured by Bash time
  source-status.txt      Git status before the build
  environment.json       source identity, tool versions, and settings
  result.json            completed build time and exit status

Existing run directories are never overwritten. No install, cache cleanup,
preview server, or deployment is performed. An unsuccessful build is recorded
and its exit code is returned. Interrupted runs may have no result.json.
HELP
}

if [[ ${1:-} == '--help' || ${1:-} == '-h' ]]; then
  usage
  exit 0
fi
if (( $# > 1 )); then
  usage >&2
  exit 2
fi

run_id=${1:-build-$(date +%Y%m%d-%H%M%S)}
if [[ ! $run_id =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  printf 'Invalid run ID: use letters, numbers, dots, underscores or hyphens; start with a letter or number.\n' >&2
  exit 2
fi

# Resolve relative to this script so invocation does not depend on the terminal cwd.
project_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd -- "$project_dir"
for tool in node npm git; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$tool" >&2
    exit 1
  fi
done
if [[ ! -f package.json || ! -f package-lock.json || ! -f node_modules/nuxt/package.json ]]; then
  printf 'Expected project files and installed Nuxt dependencies. Prepare dependencies before measuring.\n' >&2
  exit 1
fi

export NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE:-http://localhost:8787/api}
export BUILD_RELEASE_ID=${BUILD_RELEASE_ID:-perf-baseline}
export PERF_NOTES=${PERF_NOTES:-Not recorded}
export PERF_CACHE_STATE=${PERF_CACHE_STATE:-Existing caches; not cleared}
PERF_MEASURE_COMMIT=$(git rev-parse --verify HEAD)
PERF_MEASURE_BRANCH=$(git branch --show-current)
PERF_MEASURE_NPM=$(npm --version)
export PERF_MEASURE_COMMIT PERF_MEASURE_BRANCH PERF_MEASURE_NPM
export PERF_MEASURE_BASH=$BASH_VERSION
export PERF_MEASURE_RUN=$run_id

run_dir=".perf-results/baseline/$run_id"
mkdir -p -- .perf-results/baseline
if ! mkdir -- "$run_dir"; then
  printf 'Cannot create run directory. Use a new run ID; previous records are preserved.\n' >&2
  exit 1
fi
git status --porcelain=v1 --untracked-files=all > "$run_dir/source-status.txt"

# Node is already a project requirement. Use it to write properly escaped JSON.
node --input-type=module - "$run_dir" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const dir = process.argv[2]
const env = process.env
const status = readFileSync(join(dir, 'source-status.txt'), 'utf8')
const metadata = {
  run: env.PERF_MEASURE_RUN,
  preparedAt: new Date().toISOString(),
  commit: env.PERF_MEASURE_COMMIT,
  branch: env.PERF_MEASURE_BRANCH,
  workingTreeDirty: status.trim().length > 0,
  sourceStatusFile: 'source-status.txt',
  sourceNote: 'Status is not a source snapshot. Preserve relevant uncommitted changes separately.',
  lockfileSha256: createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),
  node: process.version,
  npm: env.PERF_MEASURE_NPM,
  bash: env.PERF_MEASURE_BASH,
  platform: process.platform,
  arch: process.arch,
  command: 'npm run build',
  apiBase: env.NUXT_PUBLIC_API_BASE,
  release: env.BUILD_RELEASE_ID,
  cacheState: env.PERF_CACHE_STATE,
  notes: env.PERF_NOTES,
}
writeFileSync(join(dir, 'environment.json'), JSON.stringify(metadata, null, 2) + '\n')
NODE

printf 'Building: %s\nLog: %s/build.log\n' "$run_id" "$run_dir"
# Capture both npm streams in the log, and Bash's timing in its own file.
# Keep the command in an if condition so set -e does not skip failure recording.
export LC_ALL=C
TIMEFORMAT='%R'
if { time npm run build > "$run_dir/build.log" 2>&1; } 2> "$run_dir/elapsed.txt"; then
  build_exit=0
else
  build_exit=$?
fi

node --input-type=module - "$run_dir" "$build_exit" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const dir = process.argv[2]
const seconds = Number(readFileSync(join(dir, 'elapsed.txt'), 'utf8').trim())
if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid elapsed time; inspect elapsed.txt')
const result = {
  ...JSON.parse(readFileSync(join(dir, 'environment.json'), 'utf8')),
  finishedAt: new Date().toISOString(),
  seconds,
  exitCode: Number(process.argv[3]),
  timingScope: 'Bash time: npm run build only, including npm startup and redirected log I/O',
  measurementLocale: 'C',
}
writeFileSync(join(dir, 'result.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ run: result.run, seconds, exitCode: result.exitCode }, null, 2))
NODE

printf 'Saved: %s/result.json\n' "$run_dir"
if (( build_exit != 0 )); then
  printf 'Build failed; inspect %s/build.log before continuing.\n' "$run_dir" >&2
fi
exit "$build_exit"
