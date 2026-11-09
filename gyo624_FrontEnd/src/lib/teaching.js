import { normalizeSchool } from './school.js'

export const emptyTeaching = { homeroomClassId: '', subjectIds: [], teachingClassIds: [] }

export function schoolLevelFromKind(kind = '') {
  const text = String(kind || '')
  if (text.includes('초등')) return 'elementary'
  if (text.includes('중학')) return 'middle'
  if (text.includes('고등')) return 'high'
  return ''
}

export function schoolYearOf(date = new Date()) {
  return date.getMonth() >= 2 ? date.getFullYear() : date.getFullYear() - 1
}

function listOf(value) {
  if (value == null) return []
  if (!Array.isArray(value)) return null
  const seen = new Set()
  const items = []
  for (const item of value) {
    const text = String(item ?? '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    items.push(text)
  }
  return items
}

export function readTeaching(body) {
  const source = body && typeof body === 'object' ? body : {}
  return {
    homeroomClassId: String(source.homeroomClassId || '').trim(),
    subjectIds: listOf(source.subjectIds),
    teachingClassIds: listOf(source.teachingClassIds),
  }
}

export function teachingError(value) {
  if (!value || !Array.isArray(value.subjectIds) || !Array.isArray(value.teachingClassIds)) return '담당 수업 정보를 확인해 주세요.'
  if (value.homeroomClassId.length > 80) return '담임 학급을 확인해 주세요.'
  if (value.subjectIds.length > 30 || value.subjectIds.some(id => id.length > 80)) return '담당 과목을 확인해 주세요.'
  if (value.teachingClassIds.length > 60 || value.teachingClassIds.some(id => id.length > 80)) return '수업 들어가는 반을 확인해 주세요.'
  if (!value.subjectIds.length) return '담당 과목을 하나 이상 선택해 주세요.'
  return ''
}

export function assignmentAfterSchoolChange(previousSchool, nextSchool, current) {
  const previous = normalizeSchool(previousSchool)
  const next = normalizeSchool(nextSchool)
  const teaching = readTeaching({
    homeroomClassId: current?.homeroomClassId || '',
    subjectIds: Array.isArray(current?.subjectIds) ? current.subjectIds : [],
    teachingClassIds: Array.isArray(current?.teachingClassIds) ? current.teachingClassIds : [],
  })
  const moved = Boolean(previous.schoolCode) && previous.schoolCode !== next.schoolCode
  const levelChanged = Boolean(previous.schoolCode) && schoolLevelFromKind(previous.kind) !== schoolLevelFromKind(next.kind)
  return {
    homeroomClassId: moved ? '' : teaching.homeroomClassId,
    teachingClassIds: moved ? [] : teaching.teachingClassIds,
    subjectIds: levelChanged ? [] : teaching.subjectIds,
  }
}

export function listsReady(status) {
  return status?.classes === 'ready' && status?.subjects === 'ready'
}

export function listsMessage(status) {
  if (status?.classes === 'error' || status?.subjects === 'error') return '학급과 과목 목록을 다시 불러와 주세요.'
  return '학급과 과목 목록을 불러온 뒤 선택해 주세요.'
}

export function classNameFromId(id) {
  const match = String(id || '').match(/^neis:(\d+):(.+)$/)
  if (!match) return String(id || '')
  return match[2].endsWith('반') ? `${match[1]}학년 ${match[2]}` : `${match[1]}학년 ${match[2]}반`
}

export function subjectNameFromId(id) {
  const parts = String(id || '').split(':')
  return parts.length >= 3 ? parts.slice(2).join(':') : String(id || '')
}
