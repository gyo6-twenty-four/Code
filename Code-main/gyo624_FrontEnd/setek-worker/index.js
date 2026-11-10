import { createRateLimiter, handleSetekRequest } from '../server/setek-ai.js'

const origins = new Set([
  'https://gyo624.dev',
  'https://www.gyo624.dev',
  'https://gyo624.web.app',
  'https://gyo624.firebaseapp.com',
])

const rateLimiter = createRateLimiter()

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== 'OPTIONS' && !url.pathname.startsWith('/api/setek')) {
      return new Response(JSON.stringify({ message: '지원하지 않는 요청이에요.' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      })
    }
    return handleSetekRequest(request, { env, rateLimiter, allowedOrigins: origins })
  },
}
