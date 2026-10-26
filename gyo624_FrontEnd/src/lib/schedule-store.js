import { useMemo, useState, useSyncExternalStore } from 'react'
import { canAccessAdmin } from './account'
import { readCollection } from './state'
import { teacherSeed, timetableSeed } from '../screens/AdminData'
import { todayValue } from '../components/field-utils'
import { actorId, deleteWeeklyLesson, requestExchange, respondExchange, saveWeeklyLesson } from './schedule'

const key = 'education24-schedule-v1'
const changed = 'education24-schedule-change'
export function scheduleTeachers(account) {
  const teachers = readCollection('classroom-teachers', teacherSeed).filter(item => ['활성', '관리자'].includes(item.status))
  return account && !teachers.some(item => item.id === actorId(account)) ? [...teachers, { ...account, id: actorId(account) }] : teachers
}
function snapshot() { try { return localStorage.getItem(key) || '' } catch { return '' } }
function subscribe(callback) {
  const storage = event => { if ([key, 'classroom-timetable', 'classroom-teachers', null].includes(event.key)) callback() }
  window.addEventListener('storage', storage); window.addEventListener(changed, callback)
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(changed, callback) }
}
function decode(raw, account) {
  let state
  try { state = JSON.parse(raw) } catch { /* Migrate the previous timetable on the first save. */ }
  if (!state || !['lessons', 'overrides', 'requests', 'notices'].every(field => Array.isArray(state[field]))) state = { lessons: readCollection('classroom-timetable', timetableSeed), overrides: [], requests: [], notices: [] }
  const teachers = scheduleTeachers(account)
  return { ...state, lessons: state.lessons.map(item => {
    const matching = teachers.filter(teacher => teacher.name === item.teacher)
    return item.teacherId || matching.length !== 1 ? item : { ...item, teacherId: matching[0].id }
  }) }
}
export function useSchedule(account, notify) {
  const [error, setError] = useState('')
  const raw = useSyncExternalStore(subscribe, snapshot, () => '')
  const state = useMemo(() => decode(raw, account), [raw, account])
  async function update(operation, message) {
    setError('')
    const transaction = () => {
      const current = decode(snapshot(), account)
      const next = operation(current)
      localStorage.setItem(key, JSON.stringify(next))
      window.dispatchEvent(new Event(changed))
      if (message) notify?.(message)
      return true
    }
    try {
      // Serialize decisions made by different tabs before checking the latest schedule.
      return navigator.locks ? await navigator.locks.request(key, transaction) : transaction()
    } catch (error) { const message = error instanceof DOMException ? '저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.' : error.message; setError(message); notify?.(message); return false }
  }
  const validateTeacher = id => { if (!scheduleTeachers(account).some(item => item.id === id)) throw new Error('사용 가능한 교사 계정을 선택해 주세요.') }
  return { state, error, teachers: scheduleTeachers(account),
    save: (lesson, admin) => update(current => { validateTeacher(lesson.teacherId); return saveWeeklyLesson(current, lesson, account, admin && canAccessAdmin(account), todayValue()) }, '수업을 저장했어요.'),
    remove: (id, admin) => update(current => deleteWeeklyLesson(current, id, account, admin && canAccessAdmin(account), todayValue()), '수업을 삭제했어요.'),
    request: draft => update(current => { const lesson = current.lessons.find(item => item.id === draft.to.lessonId); const change = current.overrides.find(item => item.date === draft.to.date && item.lessonId === draft.to.lessonId); validateTeacher(change?.teacherId || lesson?.teacherId); return requestExchange(current, { ...draft, id: crypto.randomUUID(), now: new Date().toISOString() }, account, todayValue()) }, '수업 교체 요청을 보냈어요. 상대 교사의 응답을 기다려 주세요.'),
    respond: (id, decision) => update(current => { const request = current.requests.find(item => item.id === id); if (decision === 'accepted' && request) { validateTeacher(request.fromTeacherId); validateTeacher(request.toTeacherId) } return respondExchange(current, id, decision, account, todayValue(), new Date().toISOString()) }, { accepted: '수업을 교체했어요. 요청한 교사에게 알림을 보냈어요.', rejected: '요청을 거절하고 결과를 알렸어요.', cancelled: '교체 요청을 취소했어요.' }[decision]),
    markRead: id => update(current => ({ ...current, notices: current.notices.map(item => item.id === id && item.userId === actorId(account) ? { ...item, read: true } : item) })),
  }
}
