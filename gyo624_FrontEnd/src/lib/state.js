import { useEffect, useState, useSyncExternalStore } from 'react'

export const settingsKey = 'classroom-record-settings'
export const defaultSettings = { name: '김지현', email: 'name@school.kr', notifications: true, year: '2026', grade: '1', classroom: '2', school: '서울 한빛초등학교' }
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
export function navigate(path) { window.location.hash = path }
const subscribe = (callback) => { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback) }
const snapshot = () => window.location.hash.slice(1) || '/coverage'
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
