import { getFirebase } from '../lib/firebase.js'
import { setekEndpoint } from '../lib/setek.js'
import { LocalError } from '../data/local-store.js'

async function callSetek(path, options = {}) {
  let response
  try {
    response = await fetch(setekEndpoint(import.meta.env.VITE_SETEK_ORIGIN, path), options)
  } catch {
    throw new LocalError('교과세특 서버에 연결하지 못했어요.', 502)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new LocalError(data.message || '교과세특 요청을 처리하지 못했어요.', response.status)
  return data
}

export function setekStatus() {
  return callSetek('/api/setek/status')
}

async function currentToken() {
  try {
    const user = getFirebase().auth.currentUser
    if (!user) throw new LocalError('로그인해 주세요.', 401)
    return await user.getIdToken()
  } catch (error) {
    if (error instanceof LocalError) throw error
    throw new LocalError(error?.message || '로그인을 확인하지 못했어요.', 401)
  }
}

export async function generateSetek(payload) {
  const token = await currentToken()
  return callSetek('/api/setek/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}
