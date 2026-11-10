import { createPasswordRecord, passwordError, verifyPasswordRecord } from './passwords'
import { teacherSeed } from '../screens/AdminData'
import { readCollection, persist } from './state'

export const demoPassword = 'Edu24!2026'
export const demoInviteCode = 'EDU24-DEMO'
export const demoAccounts = [
  { id: 'demo-teacher', scheduleId: 'kim', name: '김지현', email: 'teacher@edu24.demo', role: '교사', classroom: '1학년 2반', status: '활성' },
  { id: 'demo-admin', scheduleId: 'park', name: '박민수', email: 'admin@edu24.demo', role: '관리자', classroom: '', status: '관리자' },
]
export function previewAccounts() { return [...readCollection('classroom-teachers', teacherSeed), ...demoAccounts] }
const credentialKey = 'education24-preview-passwords'
const pendingKey = 'education24-pending-signup'
export async function verifyPreviewPassword(account, password) {
  if (demoAccounts.some(item => item.id === account.id)) return password === demoPassword
  let credentials
  try { credentials = JSON.parse(localStorage.getItem(credentialKey)) || {} } catch { return false }
  return verifyPasswordRecord(password, credentials[account.id])
}
export function startSignup({ name, email, code }) {
  if (code.trim().toUpperCase() !== demoInviteCode) throw new Error('초대 코드가 올바르지 않아요. 학교에서 받은 코드를 확인하거나 관리자에게 문의해 주세요.')
  const normalized = email.trim().toLowerCase()
  if (previewAccounts().some(item => item.email.toLowerCase() === normalized)) throw new Error('이미 등록된 이메일이에요. 로그인하거나 다른 이메일을 사용해 주세요.')
  const pending = { id: crypto.randomUUID(), name: name.trim(), email: normalized, role: '교사', status: '대기', expires: Date.now() + 30 * 60 * 1000 }
  sessionStorage.setItem(pendingKey, JSON.stringify(pending))
  return pending
}
export function pendingSignup() {
  try { const value = JSON.parse(sessionStorage.getItem(pendingKey)); return value?.expires > Date.now() && value.id && value.name && value.email ? value : null } catch { return null }
}
export async function finishSignup(password, confirmation) {
  const error = passwordError(password, confirmation)
  if (error) throw new Error(error)
  const pending = pendingSignup()
  if (!pending) throw new Error('가입 정보가 만료됐어요. 초대 코드부터 다시 입력해 주세요.')
  if (previewAccounts().some(item => item.email.toLowerCase() === pending.email)) throw new Error('이미 등록된 이메일이에요. 로그인 화면으로 돌아가 주세요.')
  const passwordRecord = await createPasswordRecord(password)
  const accounts = readCollection('classroom-teachers', teacherSeed)
  const credentials = JSON.parse(localStorage.getItem(credentialKey)) || {}
  // Write credential first; never activate an account without its password record.
  persist(credentialKey, { ...credentials, [pending.id]: passwordRecord })
  const account = { id: pending.id, name: pending.name, email: pending.email, role: '교사', status: '활성', classroom: '' }
  persist('classroom-teachers', [...accounts, account])
  sessionStorage.removeItem(pendingKey)
  return account
}
