import { readCollection } from './state'
import { classroomOptions } from './classrooms'
import { rosterSeed, teacherSeed } from '../screens/AdminData'

export function registeredClasses(settings) { return classroomOptions(readCollection('classroom-rosters', rosterSeed), settings) }
export function registeredTeachers() { return [...new Set([...readCollection('classroom-teachers', teacherSeed).filter(item => item.status !== '비활성').map(item => item.name), ...readCollection('classroom-rosters', rosterSeed).map(item => item.teacher)].filter(name => /^[\p{L} .'-]{2,40}$/u.test(name) && !/[ㄱ-ㅎㅏ-ㅣ]/.test(name)))].sort((a, b) => a.localeCompare(b, 'ko')) }
