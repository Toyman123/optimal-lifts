import { readFile, writeFile } from 'node:fs/promises'
const theme = process.argv[2]
if (!['classic', 'premium'].includes(theme)) throw new Error('Use classic or premium.')
const path = new URL('../src/homepageTheme.ts', import.meta.url)
const source = await readFile(path, 'utf8')
const next = source.replace(/(DEFAULT_HOMEPAGE: 'premium' \| 'classic' = )'(premium|classic)'/, `$1'${theme}'`)
if (next === source && !source.includes(`= '${theme}'`)) throw new Error('Homepage setting could not be found.')
await writeFile(path, next)
console.log(`Default homepage: ${theme}. Build and deploy to publish this setting.`)
