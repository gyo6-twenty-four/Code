export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null
}
export function dateValue(date) { return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` }
export function shiftDate(value, days) { const date = parseDate(value); date.setUTCDate(date.getUTCDate() + days); return dateValue(date) }
export function monthDays(year, month) {
  const first = parseDate(`${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`)
  return Array.from({ length: 42 }, (_, index) => shiftDate(dateValue(first), index - first.getUTCDay()))
}
export function todayValue() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export function dateAllowed(value, min, max) { return !!parseDate(value) && (!min || value >= min) && (!max || value <= max) }
export function placePanel(anchor, width, height, viewportWidth, viewportHeight) {
  const left = Math.max(12, Math.min(anchor.left, viewportWidth - width - 12))
  const below = anchor.bottom + 8
  const above = anchor.top - height - 8
  return { left, top: Math.max(12, Math.min(below + height <= viewportHeight - 12 ? below : above >= 12 ? above : below, viewportHeight - height - 12)) }
}
