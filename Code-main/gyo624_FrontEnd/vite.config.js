import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { setekApi } from './server/setek-plugin.js'

const neisServices = new Set(['schoolInfo', 'classInfo', 'elsTimetable', 'misTimetable', 'hisTimetable', 'SchoolSchedule'])

function readNeisKey(root) {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name)
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const split = trimmed.indexOf('=')
      if (split < 0 || trimmed.slice(0, split).trim() !== 'NEIS_API_KEY') continue
      return trimmed.slice(split + 1).trim().replace(/^['"]|['"]$/g, '')
    }
  }
  return ''
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function neisApi(root) {
  const handle = async (req, res, next) => {
    const url = new URL(req.url || '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/neis')) return next()
    const service = decodeURIComponent(url.pathname.slice('/api/neis/'.length))
    if (service === 'status') return send(res, 200, { configured: Boolean(readNeisKey(root)) })
    if (!neisServices.has(service)) return send(res, 404, { message: '지원하지 않는 나이스 항목이에요.' })
    const key = readNeisKey(root)
    if (!key) return send(res, 503, { message: '나이스 시간표를 불러올 수 없어요.' })
    const target = new URL(`https://open.neis.go.kr/hub/${service}`)
    for (const [name, value] of url.searchParams) if (name !== 'KEY' && name !== 'Type') target.searchParams.append(name, value)
    target.searchParams.set('Type', 'json')
    target.searchParams.set('KEY', key)
    try {
      const upstream = await fetch(target)
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(text)
    } catch {
      send(res, 502, { message: '나이스 서버에 연결하지 못했어요.' })
    }
  }
  return {
    name: 'neis-api',
    configureServer(server) { server.middlewares.use(handle) },
    configurePreviewServer(server) { server.middlewares.use(handle) }
  }
}

const backendTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8080'
const backendProxy = {
  '/api/v1': { target: backendTarget, changeOrigin: true },
}

export default defineConfig({
  plugins: [neisApi(process.cwd()), setekApi(process.cwd()), react(), babel({ presets: [reactCompilerPreset()] })],
  server: { proxy: backendProxy },
  preview: {
    allowedHosts: ['gyo624.dev', '.gyo624.dev'],
    proxy: backendProxy,
  },
})
