export function passwordResetHash(search) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const mode = params.get('mode')
  const code = params.get('oobCode')
  if (!code || (mode && mode !== 'resetPassword')) return ''
  return `#/reset-password?oobCode=${encodeURIComponent(code)}`
}

export function installPasswordResetLink() {
  if (typeof window === 'undefined') return
  const next = passwordResetHash(window.location.search)
  if (!next) return
  window.history.replaceState(null, '', `${window.location.pathname}${next}`)
}
