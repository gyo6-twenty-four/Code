import { persist, readCollection } from '../lib/state'
export const teacherSeed = [
  { id: 'kim', name: '김지현', email: 'name@school.kr', role: '교사', classroom: '1학년 2반', status: '활성' },
  { id: 'park', name: '박민수', email: 'm.park@school.kr', role: '관리자', classroom: '', status: '관리자' },
  { id: 'jung', name: '정다은', email: 'd.jung@school.kr', role: '교사', classroom: '', status: '대기' },
  { id: 'lee', name: '이서연', email: 's.lee@school.kr', role: '교사', classroom: '2학년 1반', status: '활성' },
]
export const rosterSeed = [
  { id: '1-2', classroom: '1학년 2반', count: 24, teacher: '김지현', status: '확인' },
  { id: '1-1', classroom: '1학년 1반', count: 23, teacher: '이서연', status: '확인' },
  { id: '2-1', classroom: '2학년 1반', count: 25, teacher: '정하린', status: '검토' },
  { id: '2-2', classroom: '2학년 2반', count: 24, teacher: '박민수', status: '확인' },
]
export const timetableSeed = ['월요일', '화요일', '수요일', '목요일', '금요일'].flatMap((day, dayIndex) =>
  Array.from({ length: 6 }, (_, index) => ({ id: `lesson-${dayIndex}-${index}`, day, period: String(index + 1), classroom: '1학년 2반', subject: ['국어', '수학', '통합', '체육', '음악', '미술'][(index + dayIndex) % 6], teacher: index === 3 ? '이서연' : '김지현', status: '확인' }))
)
export const auditSeed = [
  { id: 'audit-1', timestamp: '10.14 09:42', actor: '김지현', action: '학생 기록 수정', target: '1학년 2반', channel: '웹' },
  { id: 'audit-2', timestamp: '10.13 16:18', actor: '박민수', action: '교사 초대', target: '정다은', channel: '웹' },
  { id: 'audit-3', timestamp: '10.13 11:05', actor: '이서연', action: '시간표 변경', target: '화요일 2교시', channel: '웹' },
  { id: 'audit-4', timestamp: '10.12 14:26', actor: '박민수', action: '명단 가져오기', target: '2학년 1반', channel: '웹' },
]
export function appendAudit(action, target, actor = '박민수') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' }).formatToParts(new Date()).map(p => [p.type, p.value]))
  const item = { id: crypto.randomUUID(), timestamp: `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`, actor, action, target, channel: '웹' }
  try { persist('classroom-audit', [item, ...readCollection('classroom-audit', auditSeed)]); return true } catch { return false }
}
