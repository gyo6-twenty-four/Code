import { collection, deleteDoc, doc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { getFirebase } from '../lib/firebase.js'
import { normalizeSchool, usesVirtualStudentRoster, virtualStudentSchool } from '../lib/school.js'
import { LocalError } from './local-store.js'
import virtualStudentSeed from './virtual-student-seed.json' with { type: 'json' }

const GSM_SCHOOL_CODE = '8750829'

function requireValue(condition, message, status = 400) {
  if (!condition) throw new LocalError(message, status)
}

function db() {
  try {
    return getFirebase().db
  } catch (error) {
    if (error instanceof LocalError) throw error
    throw new LocalError('Firebase 연결 정보가 없어요. 프로젝트 설정을 확인해 주세요.')
  }
}

export function rosterSchool(school) {
  const next = virtualStudentSchool(school) || normalizeSchool(school)
  if (!next.schoolCode) return null
  if (next.schoolCode !== GSM_SCHOOL_CODE) return next
  return {
    ...next,
    officeCode: next.officeCode || 'R10',
    officeName: next.officeName || '경상북도교육청',
    kind: next.kind || '고등학교',
  }
}

function placements() {
  return virtualStudentSeed.flatMap(row => {
    const match = /^(\d+)학년\s+(\d+)반\s+(\d+)번$/.exec(String(row.internalIdentifier || '').trim())
    const name = String(row.realName || '').trim()
    if (!match || !name || row.id == null) return []
    return [{
      sourceId: row.id,
      pseudonymId: String(row.pseudonymId || ''),
      name,
      grade: Number(match[1]),
      classNumber: Number(match[2]),
      number: Number(match[3]),
    }]
  })
}

export function virtualRosterDocuments(school, schoolYear) {
  const next = rosterSchool(school)
  const year = Number(schoolYear)
  requireValue(next?.schoolCode && usesVirtualStudentRoster(next), '가상 학생 명단을 넣을 학교를 확인해 주세요.')
  requireValue(Number.isInteger(year) && year >= 2000 && year <= 2100, '학년도를 확인해 주세요.')
  const prefix = `gsm:${next.schoolCode}:${year}:`
  const classes = new Map()
  const students = []
  for (const place of placements()) {
    const classId = `${prefix}${place.grade}-${place.classNumber}`
    if (!classes.has(classId)) {
      classes.set(classId, {
        id: classId,
        schoolCode: next.schoolCode,
        schoolName: next.name,
        officeCode: next.officeCode,
        officeName: next.officeName,
        kind: next.kind,
        schoolYear: year,
        grade: place.grade,
        classNumber: place.classNumber,
        name: `${place.grade}학년 ${place.classNumber}반`,
      })
    }
    students.push({
      id: `${prefix}${place.sourceId}`,
      schoolCode: next.schoolCode,
      schoolYear: year,
      classId,
      grade: place.grade,
      classNumber: place.classNumber,
      number: place.number,
      name: place.name,
      pseudonymId: place.pseudonymId,
    })
  }
  return { classes: [...classes.values()], students }
}

function classRecord(data) {
  return {
    schoolCode: data.schoolCode,
    schoolName: data.schoolName || '',
    officeCode: data.officeCode || '',
    officeName: data.officeName || '',
    kind: data.kind || '',
    schoolYear: Number(data.schoolYear),
    grade: Number(data.grade),
    classNumber: Number(data.classNumber),
    name: data.name,
  }
}

function studentRecord(data) {
  return {
    schoolCode: data.schoolCode,
    schoolYear: Number(data.schoolYear),
    classId: data.classId,
    grade: Number(data.grade),
    classNumber: Number(data.classNumber),
    number: Number(data.number),
    name: data.name,
    pseudonymId: data.pseudonymId || '',
  }
}

function schoolCodeFromClassId(classId) {
  const match = /^gsm:([A-Za-z0-9]+):/.exec(String(classId || ''))
  return match ? match[1].toUpperCase() : ''
}

async function readSchoolRoster(schoolCode, schoolYear) {
  const code = String(schoolCode || '').toUpperCase()
  const year = Number(schoolYear)
  const database = db()
  const [classSnap, studentSnap] = await Promise.all([
    getDocs(query(collection(database, 'classes'), where('schoolCode', '==', code))),
    getDocs(query(collection(database, 'students'), where('schoolCode', '==', code))),
  ])
  return {
    classes: classSnap.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => Number(item.schoolYear) === year),
    students: studentSnap.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => Number(item.schoolYear) === year),
  }
}

export async function ensureVirtualRoster(school, schoolYear) {
  const next = rosterSchool(school)
  if (!next?.schoolCode || !usesVirtualStudentRoster(next)) return null
  const year = Number(schoolYear)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null
  const roster = virtualRosterDocuments(next, year)
  const current = await readSchoolRoster(next.schoolCode, year)
  const classIds = new Set(current.classes.map(item => item.id))
  const studentIds = new Set(current.students.map(item => item.id))
  const missing = [
    ...roster.classes.filter(item => !classIds.has(item.id)),
    ...roster.students.filter(item => !studentIds.has(item.id)),
  ]
  if (!missing.length) return roster
  const database = db()
  const batch = writeBatch(database)
  for (const classroom of roster.classes) {
    if (classIds.has(classroom.id)) continue
    const { id, ...fields } = classroom
    batch.set(doc(database, 'classes', id), classRecord(fields))
  }
  for (const student of roster.students) {
    if (studentIds.has(student.id)) continue
    const { id, ...fields } = student
    batch.set(doc(database, 'students', id), studentRecord(fields))
  }
  await batch.commit()
  return roster
}

export async function loadFirebaseRoster(school, schoolYear) {
  const next = rosterSchool(school)
  if (!next?.schoolCode) return null
  const year = Number(schoolYear)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null
  if (usesVirtualStudentRoster(next)) await ensureVirtualRoster(next, year)
  return readSchoolRoster(next.schoolCode, year)
}

export async function saveClassRecord(classroom) {
  const schoolCode = String(classroom?.schoolCode || '').toUpperCase()
  requireValue(classroom?.id && schoolCode, '학급의 학교를 확인해 주세요.')
  const database = db()
  await setDoc(doc(database, 'classes', classroom.id), classRecord({ ...classroom, schoolCode }))
}

export async function deleteClassRecord(classId) {
  requireValue(classId, '학급을 확인해 주세요.')
  await deleteDoc(doc(db(), 'classes', classId))
}

function placeFromClassId(classId) {
  const gsm = /^gsm:[A-Za-z0-9]+:\d+:(\d+)-(\d+)$/.exec(String(classId || ''))
  if (gsm) return { grade: Number(gsm[1]), classNumber: Number(gsm[2]) }
  const neis = /^neis:(\d+):(.+)$/.exec(String(classId || ''))
  if (!neis) return null
  const classNumber = Number(String(neis[2]).replace(/\D/g, ''))
  return Number.isInteger(classNumber) && classNumber > 0 ? { grade: Number(neis[1]), classNumber } : null
}

export async function saveStudentRecord(student) {
  const schoolCode = String(student?.schoolCode || schoolCodeFromClassId(student?.classId) || '').toUpperCase()
  const place = placeFromClassId(student?.classId)
  requireValue(student?.id && student?.classId && schoolCode && student?.name, '학생의 학교와 이름을 확인해 주세요.')
  const database = db()
  await setDoc(doc(database, 'students', student.id), studentRecord({
    ...student,
    schoolCode,
    grade: student.grade || place?.grade,
    classNumber: student.classNumber || place?.classNumber,
  }))
}

export function isRosterRequest(path, method = 'GET') {
  const parts = new URL(path, 'http://local.invalid').pathname.split('/').filter(Boolean)
  if (method === 'GET' && (parts.length === 1 && parts[0] === 'classes' || parts[0] === 'classes' && parts[2] === 'students' || parts[0] === 'admin' && parts[1] === 'schools' || parts[0] === 'admin' && parts[1] === 'dashboard')) return true
  return parts[0] === 'admin' && (parts[1] === 'classes' || parts[1] === 'students')
}

export async function mirrorRosterWrite(path, method, response) {
  const parts = new URL(path, 'http://local.invalid').pathname.split('/').filter(Boolean)
  if (parts[0] !== 'admin') return
  if (parts[1] === 'classes' && parts[3] === 'students' && response?.data) {
    await saveStudentRecord(response.data)
    return
  }
  if (parts[1] === 'classes' && !parts[3]) {
    if (method === 'DELETE') await deleteClassRecord(decodeURIComponent(parts[2] || ''))
    else if (response?.data) await saveClassRecord(response.data)
    return
  }
  if (parts[1] === 'students' && response?.data) await saveStudentRecord(response.data)
}
