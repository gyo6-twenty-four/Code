import test from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter, handleSetekRequest } from './setek-ai.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function request(body, { token = 'token', path = '/api/setek/generate' } = {}) {
  return new Request(`http://localhost${path}`, {
    method: path.endsWith('/status') ? 'GET' : 'POST',
    headers: { authorization: token ? `Bearer ${token}` : '', 'content-type': 'application/json' },
    body: path.endsWith('/status') ? undefined : JSON.stringify(body),
  })
}

const payload = {
  curriculumName: '2022 개정 교육과정',
  curriculumYear: 2022,
  schoolLevel: 'high',
  subjectName: '수학',
  subjectType: '일반선택',
  standards: [],
  lesson: { lessonActivities: '이차함수 그래프를 그리고 꼭짓점을 설명했다.' },
  student: {},
  growth: {},
  traits: [],
  traitNote: '',
  teacherRequest: '',
  unit: 'characters',
  targetLength: 300,
}

function deps(fetchImpl, env = {}, rateLimiter = createRateLimiter({ limit: 8, windowMs: 600000, now: () => 1000 })) {
  return {
    env: { AI_PROVIDER: 'openai', AI_API_KEY: 'server-key', FIREBASE_WEB_API_KEY: 'web-key', ...env },
    fetchImpl,
    rateLimiter,
  }
}

test('로그인하지 않으면 생성하지 않는다', async () => {
  const response = await handleSetekRequest(request(payload, { token: '' }), deps(async () => jsonResponse({})))
  assert.equal(response.status, 401)
})

test('활동이 없으면 AI를 호출하지 않는다', async () => {
  let called = false
  const response = await handleSetekRequest(request({ ...payload, lesson: {} }), deps(async url => {
    called = String(url).includes('api.openai.com')
    return jsonResponse({ users: [{ localId: 'teacher-1' }] })
  }))
  assert.equal(response.status, 400)
  assert.equal(called, false)
})

test('개인정보가 있으면 AI를 호출하지 않는다', async () => {
  let called = false
  const response = await handleSetekRequest(request({ ...payload, studentName: '김민준', lesson: { lessonActivities: '010-1234-5678로 결과를 보냈다.' } }), deps(async url => {
    called = String(url).includes('api.openai.com')
    return jsonResponse({ users: [{ localId: 'teacher-1' }] })
  }))
  const body = await response.json()
  assert.equal(response.status, 400)
  assert.match(body.message, /개인정보/)
  assert.equal(called, false)
})

test('OPENAI_API_KEY만 있어도 GPT로 연결한다', async () => {
  let auth = ''
  const response = await handleSetekRequest(request(payload), {
    env: { OPENAI_API_KEY: 'openai-key', OPENAI_MODEL: 'gpt-4o-mini', FIREBASE_WEB_API_KEY: 'web-key' },
    fetchImpl: async (url, options) => {
      if (String(url).includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'teacher-1' }] })
      auth = options.headers.authorization
      const body = JSON.parse(options.body)
      assert.equal(body.model, 'gpt-4o-mini')
      assert.equal(body.max_tokens > 0, true)
      assert.equal(body.reasoning_effort, undefined)
      return jsonResponse({ choices: [{ message: { content: '그래프에서 꼭짓점을 설명함.' } }] })
    },
    rateLimiter: createRateLimiter(),
  })
  assert.equal(response.status, 200)
  assert.equal(auth, 'Bearer openai-key')
  const status = await handleSetekRequest(request(null, { path: '/api/setek/status' }), {
    env: { OPENAI_API_KEY: 'openai-key' },
    fetchImpl: async () => jsonResponse({}),
  })
  assert.deepEqual(await status.json(), { configured: true })
  assert.equal(status.headers.get('cache-control'), 'no-store')
  assert.equal(status.headers.get('x-content-type-options'), 'nosniff')
})

test('키가 없으면 생성 설정이 없다고 알린다', async () => {
  const response = await handleSetekRequest(request(payload), deps(async () => jsonResponse({ users: [{ localId: 'teacher-1' }] }), { AI_API_KEY: '' }))
  assert.equal(response.status, 503)
  const status = await handleSetekRequest(request(null, { path: '/api/setek/status' }), deps(async () => jsonResponse({}), { AI_API_KEY: '' }))
  assert.deepEqual(await status.json(), { configured: false })
})

test('OpenAI 응답으로 글자 수를 계산하고 학생 이름을 프롬프트에 넣지 않는다', async () => {
  let prompt = ''
  const response = await handleSetekRequest(request({ ...payload, studentName: '김민준' }), deps(async (url, options) => {
    if (String(url).includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'teacher-1' }] })
    prompt = options.body
    const sent = JSON.parse(options.body)
    assert.equal(sent.model, 'gpt-6.1-terra')
    assert.equal(sent.reasoning_effort, 'none')
    assert.equal(sent.max_completion_tokens > 0, true)
    return jsonResponse({ choices: [{ message: { content: '```\n이차함수 그래프에서 꼭짓점을 설명함.\n\n교사 확인\n교내상 언급을 뺌\n```' } }] })
  }))
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.content, '이차함수 그래프에서 꼭짓점을 설명함.')
  assert.deepEqual(body.reviewNotes, ['교내상 언급을 뺌'])
  const sent = JSON.parse(prompt)
  assert.match(sent.messages[0].content, /2026학년도/)
  assert.match(sent.messages[1].content, /1·2학년/)
  assert.equal(body.characterCount, body.count)
  assert.equal(body.byteCount > body.characterCount, true)
  assert.equal(prompt.includes('김민준'), false)
  assert.equal(prompt.includes('server-key'), false)
})

test('목표보다 많이 짧으면 입력된 사실만으로 한 번 더 늘린다', async () => {
  const calls = []
  const longDraft = `${'이차함수 그래프에서 꼭짓점과 축을 설명함. '.repeat(20)}`
  const response = await handleSetekRequest(request(payload), deps(async (url, options) => {
    if (String(url).includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'teacher-1' }] })
    calls.push(JSON.parse(options.body).messages[1].content)
    const content = calls.length === 1 ? '그래프에서 꼭짓점을 설명함.' : longDraft
    return jsonResponse({ choices: [{ message: { content } }] })
  }))
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(calls.length, 2)
  assert.match(calls[1], /크게 못 미친다/)
  assert.match(calls[1], /없는 활동/)
  assert.equal(body.content, longDraft.trim())
  assert.equal(body.characterCount > 80, true)
})

test('요청이 많으면 잠시 후 다시 시도하게 한다', async () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 10000, now: () => 5000 })
  const fetchImpl = async url => String(url).includes('identitytoolkit') ? jsonResponse({ users: [{ localId: 'teacher-1' }] }) : jsonResponse({ choices: [{ message: { content: '설명함.' } }] })
  assert.equal((await handleSetekRequest(request(payload), deps(fetchImpl, {}, limiter))).status, 200)
  const blocked = await handleSetekRequest(request(payload), deps(fetchImpl, {}, limiter))
  assert.equal(blocked.status, 429)
  assert.match((await blocked.json()).message, /초 후/)
})

test('Gemini와 Anthropic 응답을 같은 형식으로 읽는다', async () => {
  const gemini = await handleSetekRequest(request(payload), deps(async url => {
    if (String(url).includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'teacher-1' }] })
    return jsonResponse({ candidates: [{ content: { parts: [{ text: '그래프를 해석함.' }] } }] })
  }, { AI_PROVIDER: 'gemini' }))
  assert.equal((await gemini.json()).content, '그래프를 해석함.')
  const anthropic = await handleSetekRequest(request(payload), deps(async url => {
    if (String(url).includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'teacher-2' }] })
    return jsonResponse({ content: [{ type: 'text', text: '식을 변형함.' }] })
  }, { AI_PROVIDER: 'anthropic' }, createRateLimiter({ limit: 8, windowMs: 600000, now: () => 9000 })))
  assert.equal((await anthropic.json()).content, '식을 변형함.')
})

test('짧은 초안을 보강한 뒤에도 원문 입력란과 문자 위치를 반환한다', async () => {
  const first = '12.3cm와 12.8cm를 비교했다.'
  const second = '차이를 0.5cm로 계산했다.'
  let calls = 0
  const response = await handleSetekRequest(request({
    ...payload,
    includeSources: true,
    lesson: { lessonActivities: `  ${first}\n  ${second}  ` },
    growth: { learned: first },
  }), deps(async (url, options) => {
    if (String(url).includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'teacher-1' }] })
    const prompt = JSON.parse(options.body).messages[1].content
    assert.ok(prompt.includes(JSON.stringify([[1, first], [2, second]])))
    calls++
    if (calls === 1) {
      const content = JSON.stringify({ sentences: [{ text: '측정값을 비교함.', sourceIds: [1] }], notes: [] })
      return jsonResponse({ choices: [{ message: { content } }] })
    }
    const content = JSON.stringify({ sentences: [{ text: '두 측정값을 비교하고 차이를 계산함.', sourceIds: [1, 2] }], notes: [] })
    return jsonResponse({ choices: [{ message: { content } }] })
  }))
  assert.equal(response.status, 200)
  assert.equal(calls, 2)
  const result = await response.json()
  assert.equal(result.content, '두 측정값을 비교하고 차이를 계산함.')
  assert.deepEqual(result.sentences[0].sources, [
    { field: 'lesson.lessonActivities', start: 0, text: first },
    { field: 'lesson.lessonActivities', start: first.length + 3, text: second },
  ])
})

test('입력에 없는 원문 번호는 근거로 반환하지 않는다', async () => {
  const response = await handleSetekRequest(request({ ...payload, includeSources: true }), deps(async url => {
    if (String(url).includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'teacher-1' }] })
    const content = JSON.stringify({ sentences: [{ text: '그래프를 설명함.', sourceIds: [99] }], notes: [] })
    return jsonResponse({ choices: [{ message: { content } }] })
  }))
  assert.equal(response.status, 502)
  assert.equal((await response.json()).sentences, undefined)
})
