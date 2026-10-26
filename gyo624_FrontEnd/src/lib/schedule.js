import { timetableError } from './classrooms.js'
import { parseDate } from '../components/field-utils.js'

export const actorId = account => account?.scheduleId || account?.id || ''
const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
export function dateLessons(state, date) {
  const parsed = parseDate(date)
  if (!parsed) return []
  return state.lessons.filter(item => item.day === dayNames[parsed.getUTCDay()]).map(item => {
    const replacement = state.overrides.find(change => change.date === date && change.lessonId === item.id)
    return replacement ? { ...item, teacherId: replacement.teacherId, teacher: replacement.teacher, exchanged: true } : item
  }).sort((a, b) => Number(a.period) - Number(b.period))
}
const occurrence = (state, ref) => dateLessons(state, ref.date).find(item => item.id === ref.lessonId)
const fingerprint = lesson => JSON.stringify([lesson?.id, lesson?.day, String(lesson?.period), lesson?.classroom, lesson?.subject, lesson?.teacherId, lesson?.teacher])
const fail = message => { throw new Error(message) }
export function exchangeError(state, first, second, today) {
  if (!parseDate(first.date) || !parseDate(second.date) || first.date < today || second.date < today) return '오늘 이후의 수업을 선택해 주세요.'
  const a = occurrence(state, first), b = occurrence(state, second)
  if (!a || !b) return '선택한 수업이 변경되었어요. 시간표를 다시 확인해 주세요.'
  if (!a.teacherId || !b.teacherId || a.teacherId === b.teacherId) return '서로 다른 교사의 수업을 선택해 주세요.'
  if (first.date === second.date && a.id === b.id) return '서로 다른 수업을 선택해 주세요.'
  for (const date of new Set([first.date, second.date])) {
    const next = dateLessons(state, date).map(item => date === first.date && item.id === a.id ? { ...item, teacherId: b.teacherId, teacher: b.teacher } : date === second.date && item.id === b.id ? { ...item, teacherId: a.teacherId, teacher: a.teacher } : item)
    for (const item of next.filter(item => date === first.date && item.id === a.id || date === second.date && item.id === b.id)) {
      const error = timetableError(item, next)
      if (error) return `${date} · ${error}`
    }
  }
  return ''
}
function pendingUses(state, refs) {
  return state.requests.some(request => request.status === 'pending' && refs.some(ref => [request.from, request.to].some(other => other.date === ref.date && other.lessonId === ref.lessonId)))
}
function notice(state, userId, requestId, title, now, id) {
  return { ...state, notices: [{ id, userId, requestId, title, createdAt: now, read: false }, ...state.notices] }
}
export function requestExchange(state, { from, to, message = '', id, now }, actor, today) {
  const error = exchangeError(state, from, to, today)
  if (error) fail(error)
  const a = occurrence(state, from), b = occurrence(state, to)
  if (a.teacherId !== actorId(actor)) fail('본인의 수업만 교체 요청할 수 있어요.')
  if (pendingUses(state, [from, to])) fail('이미 응답을 기다리는 교체 요청이 있는 수업이에요.')
  const request = { id, from, to, fromTeacherId: a.teacherId, toTeacherId: b.teacherId, fromName: a.teacher, toName: b.teacher, fromLesson: a, toLesson: b, message: message.trim().slice(0, 300), status: 'pending', createdAt: now, fingerprints: [fingerprint(a), fingerprint(b)] }
  return notice({ ...state, requests: [request, ...state.requests] }, b.teacherId, id, `${a.teacher} 선생님이 수업 교체를 요청했어요.`, now, `${id}-requested`)
}
export function respondExchange(state, id, decision, actor, today, now) {
  const request = state.requests.find(item => item.id === id)
  if (!request || request.status !== 'pending') fail('이미 처리되었거나 찾을 수 없는 요청이에요.')
  const mine = actorId(actor)
  if (decision === 'cancelled' ? request.fromTeacherId !== mine : request.toTeacherId !== mine) fail('이 요청을 처리할 권한이 없어요.')
  if (!['accepted', 'rejected', 'cancelled'].includes(decision)) fail('처리 방법을 확인해 주세요.')
  if (decision === 'accepted') {
    if (request.fingerprints.some((value, index) => value !== fingerprint(occurrence(state, index === 0 ? request.from : request.to)))) fail('요청 이후 수업이 변경되었어요. 요청을 거절하고 새 시간표에서 다시 요청해 주세요.')
    const error = exchangeError(state, request.from, request.to, today)
    if (error) fail(error)
  }
  const a = occurrence(state, request.from), b = occurrence(state, request.to)
  const changes = decision === 'accepted' ? [
    { ...request.from, teacherId: b.teacherId, teacher: b.teacher, requestId: id },
    { ...request.to, teacherId: a.teacherId, teacher: a.teacher, requestId: id },
  ] : []
  const overrides = [...state.overrides.filter(existing => !changes.some(change => change.date === existing.date && change.lessonId === existing.lessonId)), ...changes]
  let next = { ...state, overrides, requests: state.requests.map(item => item.id === id ? { ...item, status: decision, respondedAt: now } : item), notices: state.notices.map(item => item.requestId === id && item.userId === mine ? { ...item, read: true } : item) }
  const label = { accepted: '수락', rejected: '거절', cancelled: '취소' }[decision]
  next = notice(next, decision === 'cancelled' ? request.toTeacherId : request.fromTeacherId, id, `수업 교체 요청이 ${label}되었어요.`, now, `${id}-${decision}`)
  return next
}
export function saveWeeklyLesson(state, lesson, actor, admin, today) {
  const existing = state.lessons.find(item => item.id === lesson.id)
  if (!admin && (lesson.teacherId !== actorId(actor) || existing && existing.teacherId !== actorId(actor))) fail('본인의 수업만 변경할 수 있어요.')
  const error = timetableError(lesson, state.lessons)
  if (error) fail(error)
  if (state.overrides.some(item => item.lessonId === lesson.id && item.date >= today)) fail('교체가 확정된 수업이 있어요. 해당 날짜가 지난 후 기본 시간표를 변경해 주세요.')
  const lessons = existing ? state.lessons.map(item => item.id === lesson.id ? lesson : item) : [...state.lessons, lesson]
  // Weekly edits must also remain valid on every date with an agreed exchange.
  const next = { ...state, lessons }
  for (const date of new Set(state.overrides.filter(item => item.date >= today).map(item => item.date))) {
    const daily = dateLessons(next, date)
    for (const item of daily) { const conflict = timetableError(item, daily); if (conflict) fail(`${date} 교체 시간표와 겹쳐요. ${conflict}`) }
  }
  return next
}
export function deleteWeeklyLesson(state, id, actor, admin, today) {
  const existing = state.lessons.find(item => item.id === id)
  if (!existing) fail('이미 삭제된 수업이에요.')
  if (!admin && existing.teacherId !== actorId(actor)) fail('본인의 수업만 삭제할 수 있어요.')
  if (state.overrides.some(item => item.lessonId === id && item.date >= today)) fail('교체가 확정된 수업은 해당 날짜가 지난 후 삭제할 수 있어요.')
  return { ...state, lessons: state.lessons.filter(item => item.id !== id) }
}
