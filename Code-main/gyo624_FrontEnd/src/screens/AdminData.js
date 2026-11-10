import { persist, readCollection } from '../lib/state'
export const teacherSeed = []
export const rosterSeed = []
export const timetableSeed = []
export const auditSeed = []
export function appendAudit(action, target, actor = '관리자') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' }).formatToParts(new Date()).map(p => [p.type, p.value]))
  const item = { id: crypto.randomUUID(), timestamp: `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`, actor, action, target, channel: '웹' }
  try { persist('classroom-audit', [item, ...readCollection('classroom-audit', auditSeed)]); return true } catch { return false }
}
