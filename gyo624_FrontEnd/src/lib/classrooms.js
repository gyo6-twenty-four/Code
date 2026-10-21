export function normalizeClassroom(value) {
  const match = String(value || '').trim().match(/^([1-6])\s*학년\s*(\d{1,2})\s*반$/)
  return match && Number(match[2]) >= 1 && Number(match[2]) <= 99 ? `${match[1]}학년 ${Number(match[2])}반` : ''
}
export function classParts(value) {
  const valid = normalizeClassroom(value)
  return valid ? valid.match(/\d+/g) : ['', '']
}
export function classroomOptions(rosters, settings) {
  const current = settings ? normalizeClassroom(`${settings.grade}학년 ${settings.classroom}반`) : ''
  return [...new Set([...rosters.map(item => normalizeClassroom(item.classroom)), current].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))
}
export const weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일']
export const subjects = ['국어', '수학', '통합', '사회', '과학', '영어', '체육', '음악', '미술', '도덕', '실과', '창의적 체험 활동']
export function timetableError(candidate, entries) {
  if (!weekdays.includes(candidate.day) || !/^[1-8]$/.test(String(candidate.period)) || !normalizeClassroom(candidate.classroom) || !subjects.includes(candidate.subject) || !candidate.teacher?.trim()) return '요일, 교시, 학급, 과목과 담당 교사를 확인해 주세요.'
  const sameSlot = entries.filter(item => item.id !== candidate.id && item.day === candidate.day && Number(item.period) === Number(candidate.period))
  if (sameSlot.some(item => normalizeClassroom(item.classroom) === normalizeClassroom(candidate.classroom))) return '이 학급은 같은 시간에 이미 수업이 있어요. 기존 수업을 수정하거나 다른 교시를 선택해 주세요.'
  const conflict = sameSlot.find(item => item.teacher === candidate.teacher)
  return conflict ? `${candidate.teacher} 선생님은 같은 시간에 ${conflict.classroom} 수업이 있어요.` : ''
}
