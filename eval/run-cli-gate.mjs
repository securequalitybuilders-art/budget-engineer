import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const entry = join(here, '..', 'node_modules', 'promptfoo', 'dist', 'src', 'entrypoint.js')

const thresholdPct = process.env.PROMPTFOO_PASS_RATE_THRESHOLD ?? '100'
const child = spawn(
  process.execPath,
  [entry, 'eval', '--config', join(here, 'promptfooconfig.ts'), '--no-share', '--no-cache'],
  { env: { ...process.env, PROMPTFOO_PASS_RATE_THRESHOLD: thresholdPct, PROMPTFOO_DISABLE_TELEMETRY: '1' }, stdio: 'inherit' },
)
child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\nKPI3 gate failed: promptfoo pass rate below ${thresholdPct}% (exit ${code}).`)
  }
  process.exit(code ?? 1)
})
