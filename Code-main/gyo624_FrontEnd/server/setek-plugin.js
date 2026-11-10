import fs from 'node:fs'
import path from 'node:path'
import { createRateLimiter, handleSetekRequest } from './setek-ai.js'

const KEYS = ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'FIREBASE_WEB_API_KEY', 'VITE_FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID', 'SETEK_RATE_LIMIT', 'SETEK_RATE_WINDOW_MS']

function readFileEnv(file) {
  if (!fs.existsSync(file)) return {}
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const split = trimmed.indexOf('=')
    if (split < 0) continue
    const key = trimmed.slice(0, split).trim()
    if (!KEYS.includes(key)) continue
    env[key] = trimmed.slice(split + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  return env
}

export function readProjectEnv(root) {
  const env = { ...readFileEnv(path.join(root, '.env')), ...readFileEnv(path.join(root, '.env.local')) }
  for (const key of KEYS) if (process.env[key]) env[key] = process.env[key]
  return env
}

function integerEnv(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    size += buffer.length
    if (size > 100000) {
      const error = new Error('too-large')
      error.code = 'too-large'
      throw error
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function setekApi(root = process.cwd()) {
  const rateLimiter = createRateLimiter({
    limit: integerEnv(readProjectEnv(root).SETEK_RATE_LIMIT, 8),
    windowMs: integerEnv(readProjectEnv(root).SETEK_RATE_WINDOW_MS, 600000),
  })
  const handle = async (req, res, next) => {
    const url = new URL(req.url || '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/setek')) return next()
    try {
      const raw = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)
      const request = new Request(url, { method: req.method, headers: req.headers, body: raw })
      const response = await handleSetekRequest(request, { env: readProjectEnv(root), rateLimiter })
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      const tooLarge = error?.code === 'too-large'
      res.statusCode = tooLarge ? 413 : 500
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ message: tooLarge ? '입력 내용이 너무 길어요. 항목을 나눠 주세요.' : '교과세특 요청을 처리하지 못했어요.' }))
    }
  }
  return {
    name: 'setek-api',
    configureServer(server) { server.middlewares.use(handle) },
    configurePreviewServer(server) { server.middlewares.use(handle) },
  }
}
