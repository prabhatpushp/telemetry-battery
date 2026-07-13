import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST_DIRECTORY = fileURLToPath(new URL('../dist/', import.meta.url))
const MAX_JAVASCRIPT_BYTES = 500 * 1024

const oversizedFiles = readdirSync(DIST_DIRECTORY, { recursive: true })
  .filter((path) => path.endsWith('.js'))
  .map((path) => {
    const filePath = join(DIST_DIRECTORY, path)
    return { path, size: statSync(filePath).size }
  })
  .filter(({ size }) => size > MAX_JAVASCRIPT_BYTES)

if (oversizedFiles.length > 0) {
  for (const file of oversizedFiles) {
    console.error(
      `${relative(process.cwd(), join(DIST_DIRECTORY, file.path))} is ${Math.ceil(file.size / 1024)} KiB`,
    )
  }
  process.exitCode = 1
} else {
  console.log('Bundle budget passed: every JavaScript chunk is at most 500 KiB.')
}
