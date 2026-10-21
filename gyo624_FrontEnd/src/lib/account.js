// Frontend preview adapter. Replace account lookup with the authenticated API response.
export const accountSessionKey = 'education24-preview-account'
export function findAccountByEmail(accounts, email) {
  const normalized = String(email || '').trim().toLowerCase()
  return accounts.find(account => account.email?.trim().toLowerCase() === normalized && ['활성', '관리자'].includes(account.status) && ['교사', '관리자'].includes(account.role)) || null
}
export function canAccessAdmin(account) {
  return account?.role === '관리자' && ['활성', '관리자'].includes(account.status)
}
export function accountHome(account) { return canAccessAdmin(account) ? '/admin' : '/coverage' }
export function readAccountId(stored) {
  try { const id = JSON.parse(stored); return typeof id === 'string' && id.trim() ? id : null } catch { return null }
}
export function isActiveAccount(account) { return !!account && ['활성', '관리자'].includes(account.status) && ['교사', '관리자'].includes(account.role) }
