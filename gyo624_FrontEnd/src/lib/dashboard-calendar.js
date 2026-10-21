import { parseDate } from '../components/field-utils.js'
const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
export function lessonsForDate(items, date, teacher) {
  const parsed = parseDate(date)
  if (!parsed) return []
  return items.filter(item => item.day === weekdays[parsed.getUTCDay()] && item.teacher === teacher).sort((a, b) => Number(a.period) - Number(b.period))
}
export function recordsForDate(records, memos, date, teacherClasses) {
  return [...records.map(item => ({ ...item, title: item.student, kind: '학생 관찰' })), ...memos.filter(item => teacherClasses.includes(item.classroom)).map(item => ({ ...item, title: item.classroom, kind: '수업 메모' }))].filter(item => item.date === date)
}
