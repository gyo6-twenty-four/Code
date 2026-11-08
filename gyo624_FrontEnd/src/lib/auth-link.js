export function passwordResetPath(search) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const mode = params.get('mode')
  const code = params.get('oobCode')
  if (!code || (mode && mode !== 'resetPassword')) return ''
  return `/reset-password?oobCode=${encodeURIComponent(code)}`
}

export function installPasswordResetLink() {
  if (typeof window === 'undefined') return
  const next = passwordResetPath(window.location.search)
  if (!next) return
  window.history.replaceState(null, '', next)
}
