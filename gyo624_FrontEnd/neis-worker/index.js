const services = new Set(['schoolInfo', 'classInfo', 'elsTimetable', 'misTimetable', 'hisTimetable', 'SchoolSchedule'])
const origins = new Set([
  'https://gyo624.dev',
  'https://www.gyo624.dev',
  'https://gyo624.web.app',
  'https://gyo624.firebaseapp.com'
])

function headers(origin) {
  const result = { 'content-type': 'application/json; charset=utf-8' }
  if (origin && origins.has(origin)) {
    result['access-control-allow-origin'] = origin
    result.vary = 'Origin'
  }
  return result
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    if (request.method === 'OPTIONS') {
      if (!origin || !origins.has(origin)) return new Response(null, { status: 403 })
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'Content-Type',
          vary: 'Origin'
        }
      })
    }
    if (request.method !== 'GET') return json({ message: '지원하지 않는 요청이에요.' }, 405, origin)
    const service = decodeURIComponent(url.pathname.replace(/^\/api\/neis\/?/, '').replace(/^\//, ''))
    if (service === 'status') return json({ configured: Boolean(env.NEIS_API_KEY) }, 200, origin)
    if (!services.has(service)) return json({ message: '지원하지 않는 나이스 항목이에요.' }, 404, origin)
    if (!env.NEIS_API_KEY) return json({ message: '나이스 시간표를 불러올 수 없어요.' }, 503, origin)
    const target = new URL(`https://open.neis.go.kr/hub/${service}`)
    for (const [name, value] of url.searchParams) {
      if (name !== 'KEY' && name !== 'Type') target.searchParams.append(name, value)
    }
    target.searchParams.set('Type', 'json')
    target.searchParams.set('KEY', env.NEIS_API_KEY)
    try {
      const upstream = await fetch(target)
      const text = await upstream.text()
      return new Response(text, { status: upstream.status, headers: headers(origin) })
    } catch {
      return json({ message: '나이스 서버에 연결하지 못했어요.' }, 502, origin)
    }
  }
}
