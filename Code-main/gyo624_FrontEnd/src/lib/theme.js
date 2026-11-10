export const themeKey = 'gyo624-theme'

export function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

export function readTheme() {
  try {
    return normalizeTheme(localStorage.getItem(themeKey))
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  const next = normalizeTheme(theme)
  const root = document.documentElement
  if (next === 'dark') root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
  root.style.colorScheme = next
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', next === 'dark' ? '#121417' : '#ffffff')
}

export function writeTheme(theme) {
  const next = normalizeTheme(theme)
  try { localStorage.setItem(themeKey, next) } catch { /* Storage can be blocked by browser preferences. */ }
  applyTheme(next)
  return next
}
