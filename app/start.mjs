#!/usr/bin/env node
import { createServer } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT) || 3000

const server = await createServer({
  root: __dirname,
  configFile: join(__dirname, 'vite.config.ts'),
  server: { port, strictPort: false },
})

await server.listen()
server.printUrls()
