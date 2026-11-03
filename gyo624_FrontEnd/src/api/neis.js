import { parseNeis } from './neis-parse.js'

const schoolKey = 'education24-neis-school-v1'
const schoolEvent = 'education24-neis-school'
const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

export function readNeisSchool() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(schoolKey) || 'null')
    return value?.officeCode && value?.schoolCode ? value : null
  } catch {
    return null
  }
}

export function writeNeisSchool(school) {
  if (school) globalThis.localStorage?.setItem(schoolKey, JSON.stringify(school))
  else globalThis.localStorage?.removeItem(schoolKey)
  globalThis.dispatchEvent?.(new Event(schoolEvent))
}

export function onNeisSchool(listener) {
  globalThis.addEventListener?.(schoolEvent, listener)
  globalThis.addEventListener?.('storage', listener)
  return () => {
    globalThis.removeEventListener?.(schoolEvent, listener)
    globalThis.removeEventListener?.('storage', listener)
  }
}

export function timetableService(kind = '') {
  if (kind.includes('초등')) return 'elsTimetable'
  if (kind.includes('중학')) return 'misTimetable'
  if (kind.includes('고등')) return 'hisTimetable'
  return ''
}

export function compactDate(value) {
  return String(value || '').replaceAll('-', '')
}

async function callNeis(service, params, signal) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== '' && value != null) query.set(key, String(value))
  const response = await fetch(`/api/neis/${service}?${query}`, { signal })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || '나이스에 연결하지 못했어요.')
  return parseNeis(payload, service)
}

async function collect(service, params, signal) {
  const pageSize = 1000
  const rows = []
  let total = Infinity
  for (let page = 1; rows.length < total && page <= 20; page += 1) {
    const result = await callNeis(service, { ...params, pIndex: page, pSize: pageSize }, signal)
    total = result.total
    rows.push(...result.rows)
    if (result.rows.length < pageSize) break
  }
  return rows
}

export function neisStatus(signal) {
  return fetch('/api/neis/status', { signal }).then(async response => {
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || '나이스 연결 상태를 확인하지 못했어요.')
    return payload
  })
}

export function searchSchools(name, signal) {
  return collect('schoolInfo', { SCHUL_NM: name.trim() }, signal)
}

export async function loadClasses(school, year, signal) {
  const rows = await collect('classInfo', {
    ATPT_OFCDC_SC_CODE: school.officeCode,
    SD_SCHUL_CODE: school.schoolCode,
    AY: year
  }, signal)
  const seen = new Set()
  return rows.flatMap(row => {
    const grade = String(row.GRADE || '')
    const classLabel = String(row.CLASS_NM || '')
    const id = `neis:${grade}:${classLabel}`
    if (!grade || !classLabel || seen.has(id)) return []
    seen.add(id)
    return [{
      id,
      grade: Number(grade),
      classNumber: classLabel,
      classLabel,
      name: classLabel.endsWith('반') ? `${grade}학년 ${classLabel}` : `${grade}학년 ${classLabel}반`
    }]
  }).sort((a, b) => a.grade - b.grade || String(a.classLabel).localeCompare(String(b.classLabel), 'ko'))
}

export async function loadTimetable(school, { year, semester, grade, classLabel, from, to }, signal) {
  const service = timetableService(school.kind)
  if (!service) throw new Error('이 학교의 시간표는 불러올 수 없어요.')
  const rows = await collect(service, {
    ATPT_OFCDC_SC_CODE: school.officeCode,
    SD_SCHUL_CODE: school.schoolCode,
    AY: year,
    SEM: semester,
    GRADE: grade,
    CLASS_NM: classLabel,
    TI_FROM_YMD: compactDate(from),
    TI_TO_YMD: compactDate(to)
  }, signal)
  return rows.flatMap(row => {
    const ymd = String(row.ALL_TI_YMD || '')
    if (!/^\d{8}$/.test(ymd)) return []
    const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    return [{
      id: `${ymd}-${row.GRADE}-${row.CLASS_NM}-${row.PERIO}`,
      date,
      dayOfWeek: weekdays[weekday - 1] || '',
      period: Number(row.PERIO),
      subject: row.ITRT_CNTNT || '수업',
      className: String(row.CLASS_NM || '').endsWith('반') ? `${row.GRADE}학년 ${row.CLASS_NM}` : `${row.GRADE}학년 ${row.CLASS_NM}반`,
      classId: `neis:${row.GRADE}:${row.CLASS_NM}`,
      schoolYear: Number(row.AY || year),
      semester: Number(row.SEM || semester),
      room: ''
    }]
  }).sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period)
}

export async function loadSchedule(school, { from, to }, signal) {
  const rows = await collect('SchoolSchedule', {
    ATPT_OFCDC_SC_CODE: school.officeCode,
    SD_SCHUL_CODE: school.schoolCode,
    AA_FROM_YMD: compactDate(from),
    AA_TO_YMD: compactDate(to)
  }, signal)
  return rows.flatMap(row => {
    const ymd = String(row.AA_YMD || '')
    if (!/^\d{8}$/.test(ymd)) return []
    return [{
      date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
      name: row.EVENT_NM || '학사일정',
      detail: row.EVENT_CNTNT || ''
    }]
  })
}
