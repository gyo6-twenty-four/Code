import { SYSTEM_PROMPT, buildUserPrompt, countUnits, splitGeneratedDraft, validateGenerationPayload } from '../src/lib/setek.js'

const PROVIDERS = {
  openai: {
    defaultModel: 'gpt-6.1-terra',
    async generate({ apiKey, model, system, user, maxTokens, fetchImpl }) {
      const legacy = /^gpt-[34]/.test(model)
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          ...(legacy
            ? { max_tokens: maxTokens }
            : { max_completion_tokens: maxTokens, reasoning_effort: 'none' }),
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(45000),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw providerFailure(response.status)
      const text = data.choices?.[0]?.message?.content
      if (!String(text || '').trim()) throw providerFailure(502)
      return text
    },
  },
  gemini: {
    defaultModel: 'gemini-2.0-flash',
    async generate({ apiKey, model, system, user, maxTokens, fetchImpl }) {
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(45000),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw providerFailure(response.status)
      const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('')
      if (!String(text || '').trim()) throw providerFailure(502)
      return text
    },
  },
  anthropic: {
    defaultModel: 'claude-3-5-haiku-latest',
    async generate({ apiKey, model, system, user, maxTokens, fetchImpl }) {
      const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.4,
          system,
          messages: [{ role: 'user', content: user }],
        }),
        signal: AbortSignal.timeout(45000),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw providerFailure(response.status)
      const text = data.content?.filter(part => part.type === 'text').map(part => part.text || '').join('')
      if (!String(text || '').trim()) throw providerFailure(502)
      return text
    },
  },
}

function providerFailure(status) {
  const error = new Error(providerMessage(status))
  error.status = status === 401 || status === 403 ? 502 : status === 429 ? 429 : status === 404 ? 502 : 502
  return error
}

function providerMessage(status) {
  if (status === 401 || status === 403) return 'AI 인증에 실패했어요. 서버의 API 키를 확인해 주세요.'
  if (status === 429) return 'AI 사용량이 많아 잠시 후 다시 시도해 주세요.'
  if (status === 404) return 'AI 모델을 찾지 못했어요. 서버의 AI_MODEL 값을 확인해 주세요.'
  return 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.'
}

export function createRateLimiter({ limit = 8, windowMs = 10 * 60 * 1000, now = () => Date.now() } = {}) {
  const hits = new Map()
  return function check(key) {
    const time = now()
    const recent = (hits.get(key) || []).filter(item => time - item < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - time) / 1000)) }
    }
    recent.push(time)
    hits.set(key, recent)
    return { ok: true }
  }
}

export async function verifyFirebaseIdToken(idToken, { apiKey, fetchImpl }) {
  if (!apiKey) return { ok: false, status: 503, message: '로그인 확인에 필요한 서버 설정이 없어요.' }
  let response
  try {
    response = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return { ok: false, status: 502, message: '로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' }
  }
  const data = await response.json().catch(() => ({}))
  const user = data.users?.[0]
  if (!response.ok || !user?.localId) return { ok: false, status: 401, message: '로그인이 확인되지 않아요. 다시 로그인한 뒤 시도해 주세요.' }
  if (user.disabled) return { ok: false, status: 403, message: '사용할 수 없는 계정이에요.' }
  return { ok: true, uid: user.localId }
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

function bearer(request) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function withCors(response, request, allowedOrigins) {
  const origin = request.headers.get('origin')
  if (!origin || !allowedOrigins?.has(origin)) return response
  const headers = new Headers(response.headers)
  headers.set('access-control-allow-origin', origin)
  headers.set('vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}

function preflight(request, allowedOrigins) {
  const origin = request.headers.get('origin')
  if (!origin || !allowedOrigins?.has(origin)) return json({ message: '허용되지 않은 주소예요.' }, 403)
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization',
      vary: 'Origin',
    },
  })
}

function providerConfig(env) {
  const openaiKey = String(env.OPENAI_API_KEY || '').trim()
  const named = String(env.AI_PROVIDER || '').trim().toLowerCase()
  const name = named || (openaiKey ? 'openai' : '')
  const provider = PROVIDERS[name]
  const apiKey = String(env.AI_API_KEY || (name === 'openai' ? openaiKey : '') || '').trim()
  if (!provider || !apiKey) return null
  const model = String(env.AI_MODEL || (name === 'openai' ? env.OPENAI_MODEL : '') || '').trim() || provider.defaultModel
  return { name, provider, apiKey, model }
}

export async function handleSetekRequest(request, { env = {}, fetchImpl = fetch, rateLimiter, allowedOrigins } = {}) {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') return preflight(request, allowedOrigins)
  if (url.pathname === '/api/setek/status' && request.method === 'GET') {
    const config = providerConfig(env)
    return withCors(json({ configured: Boolean(config), provider: config?.name || '' }), request, allowedOrigins)
  }
  if (url.pathname !== '/api/setek/generate' || request.method !== 'POST') {
    return withCors(json({ message: '지원하지 않는 요청이에요.' }, 404), request, allowedOrigins)
  }
  const token = bearer(request)
  if (!token) return withCors(json({ message: '로그인해 주세요.' }, 401), request, allowedOrigins)
  const firebaseKey = String(env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY || '').trim()
  const verified = await verifyFirebaseIdToken(token, { apiKey: firebaseKey, fetchImpl })
  if (!verified.ok) return withCors(json({ message: verified.message }, verified.status), request, allowedOrigins)
  let raw
  try {
    raw = await request.json()
  } catch {
    return withCors(json({ message: '생성 요청 형식을 확인해 주세요.' }, 400), request, allowedOrigins)
  }
  const parsed = validateGenerationPayload(raw)
  if (!parsed.ok) return withCors(json({ message: parsed.message }, 400), request, allowedOrigins)
  const limited = rateLimiter?.(verified.uid) || { ok: true }
  if (!limited.ok) {
    return withCors(json({ message: `생성 요청이 많아요. ${limited.retryAfter}초 후에 다시 시도해 주세요.` }, 429, { 'retry-after': String(limited.retryAfter) }), request, allowedOrigins)
  }
  const config = providerConfig(env)
  if (!config) return withCors(json({ message: 'AI 연결이 아직 설정되지 않았어요. 서버 환경변수 AI_API_KEY 또는 OPENAI_API_KEY를 확인해 주세요.' }, 503), request, allowedOrigins)
  const userPrompt = buildUserPrompt(parsed.value)
  const maxTokens = Math.min(4000, Math.ceil(parsed.value.targetLength * (parsed.value.unit === 'bytes' ? 1.2 : 2.5)) + 200)
  try {
    const generated = await config.provider.generate({
      apiKey: config.apiKey,
      model: config.model,
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens,
      fetchImpl,
    })
    let draft = splitGeneratedDraft(generated)
    const unit = parsed.value.unit
    const firstCount = countUnits(draft.content, unit)
    const floor = Math.ceil(parsed.value.targetLength * 0.8)
    if (parsed.value.mode !== 'shorten' && firstCount > 0 && firstCount < floor) {
      const expanded = await config.provider.generate({
        apiKey: config.apiKey,
        model: config.model,
        system: SYSTEM_PROMPT,
        user: buildUserPrompt({
          ...parsed.value,
          mode: 'expand',
          previousContent: draft.content,
          currentCount: firstCount,
        }),
        maxTokens,
        fetchImpl,
      })
      const second = splitGeneratedDraft(expanded)
      const secondCount = countUnits(second.content, unit)
      if (secondCount > firstCount) draft = second
    }
    if (!draft.content && draft.notes.length === 0) return withCors(json({ message: 'AI가 빈 초안을 돌려줬어요. 다시 생성해 주세요.' }, 502), request, allowedOrigins)
    const content = draft.content
    const count = countUnits(content, parsed.value.unit)
    return withCors(json({
      content,
      reviewNotes: draft.notes,
      count,
      characterCount: countUnits(content, 'characters'),
      byteCount: countUnits(content, 'bytes'),
      unit: parsed.value.unit,
      targetLength: parsed.value.targetLength,
      overLimit: count > parsed.value.targetLength,
      provider: config.name,
    }), request, allowedOrigins)
  } catch (error) {
    const status = Number(error?.status) || 502
    const message = error?.name === 'TimeoutError' || error?.name === 'AbortError'
      ? 'AI 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'
      : error?.message || 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.'
    return withCors(json({ message }, status), request, allowedOrigins)
  }
}
