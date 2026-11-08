import { useEffect, useState, useSyncExternalStore } from 'react'

export const settingsKey = 'classroom-record-settings'
export const defaultSettings = { name: '', email: '', notifications: true, year: '2026', grade: '1', classroom: '1', school: '' }
export function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey))
    if (saved && Object.entries(defaultSettings).every(([key, value]) => saved[key] === undefined || typeof saved[key] === typeof value)) return { ...defaultSettings, ...saved, grade: /^[1-6]$/.test(saved.grade) ? saved.grade : defaultSettings.grade, classroom: /^(?:[1-9]|[1-9][0-9])$/.test(saved.classroom) ? saved.classroom : defaultSettings.classroom }
  } catch { /* Storage can be blocked by browser preferences. */ }
  return defaultSettings
}
export function readRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem('classroom-observations'))
    return Array.isArray(saved) ? saved.filter(r => r && typeof r.id === 'string' && typeof r.student === 'string' && typeof r.content === 'string' && typeof r.date === 'string') : []
  } catch { return [] }
}
export function persist(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function currentPath() { return `${window.location.pathname}${window.location.search}` }
export function navigate(path) {
  const next = path.startsWith('/') ? path : `/${path}`
  if (currentPath() === next) return
  const pathChanged = window.location.pathname !== next.split('?')[0]
  window.history.pushState(null, '', next)
  if (pathChanged) window.scrollTo(0, 0)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
export function adoptLegacyHash() {
  const hash = window.location.hash
  if (!hash.startsWith('#/')) return
  window.history.replaceState(null, '', hash.slice(1))
}
export function installAppLinks() {
  if (installAppLinks.installed) return
  installAppLinks.installed = true
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) return
    if (url.hash && !url.hash.startsWith('#/') && url.pathname === window.location.pathname && url.search === window.location.search) return
    event.preventDefault()
    navigate(url.hash.startsWith('#/') ? url.hash.slice(1) : `${url.pathname}${url.search}`)
  })
}
const subscribe = (callback) => { window.addEventListener('popstate', callback); return () => window.removeEventListener('popstate', callback) }
const snapshot = () => currentPath() === '/' ? '/coverage' : currentPath()
export function useRoute() { return useSyncExternalStore(subscribe, snapshot, () => '/coverage') }
export function useNotice() {
  const [notice, setNotice] = useState(null)
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(timer)
  }, [notice])
  return [notice?.text || '', (text) => setNotice({ text, id: Date.now() })]
}

export function readCollection(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    if (Array.isArray(value) && value.every(item => item && typeof item === 'object' && typeof item.id === 'string')) return value
  } catch { /* Fall back to example data if storage cannot be read. */ }
  return fallback
}
export function useCollection(key, fallback, notify) {
  const [items, setItems] = useState(() => readCollection(key, fallback))
  function save(next, message) {
    try { persist(key, next); setItems(next); if (message) notify(message); return true } catch { notify('저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.'); return false }
  }
  return [items, save]
}
