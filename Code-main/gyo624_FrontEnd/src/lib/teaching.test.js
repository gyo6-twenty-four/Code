import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignmentAfterSchoolChange,
  classNameFromId,
  readTeaching,
  schoolLevelFromKind,
  schoolYearOf,
  subjectNameFromId,
  teachingError,
} from './teaching.js'

test('학교 종류와 학년도를 담당 수업 조회에 맞게 고른다', () => {
  assert.equal(schoolLevelFromKind('서울 초등학교'), 'elementary')
  assert.equal(schoolLevelFromKind('방송통신중학교'), 'middle')
  assert.equal(schoolLevelFromKind('고등학교'), 'high')
  assert.equal(schoolLevelFromKind('특수학교'), '')
  assert.equal(schoolYearOf(new Date(2026, 1, 15)), 2025)
  assert.equal(schoolYearOf(new Date(2026, 2, 1)), 2026)
  assert.equal(schoolYearOf(new Date(2026, 10, 9)), 2026)
})

test('담임과 수업 반은 비워 둘 수 있고 과목은 하나 이상이어야 한다', () => {
  const value = readTeaching({ homeroomClassId: '  ', subjectIds: ['2022:elementary:국어', '2022:elementary:국어'], teachingClassIds: ['neis:3:1'] })
  assert.equal(value.homeroomClassId, '')
  assert.deepEqual(value.subjectIds, ['2022:elementary:국어'])
  assert.equal(teachingError(value), '')
  assert.equal(teachingError(readTeaching({ subjectIds: ['수학'], teachingClassIds: [] })), '')
  assert.match(teachingError(readTeaching({ subjectIds: [], teachingClassIds: ['neis:3:1'] })), /과목/)
  assert.match(teachingError(readTeaching({ subjectIds: '수학', teachingClassIds: [] })), /확인/)
})

test('학교가 바뀌면 나이스 학급 선택을 지우고 학교급이 바뀌면 과목도 지운다', () => {
  const current = { homeroomClassId: 'neis:1:1', subjectIds: ['2022:elementary:국어'], teachingClassIds: ['neis:1:1'], classIds: ['admin-class'] }
  const same = assignmentAfterSchoolChange(
    { name: '한빛초등학교', schoolCode: 'B7010083', officeCode: 'B10', kind: '초등학교' },
    { name: '한빛초등학교', schoolCode: 'B7010083', officeCode: 'B10', kind: '초등학교' },
    current,
  )
  assert.deepEqual(same.teachingClassIds, ['neis:1:1'])
  assert.equal(same.classIds, undefined)
  const moved = assignmentAfterSchoolChange(
    { schoolCode: 'B7010083', kind: '초등학교' },
    { schoolCode: 'B0000002', kind: '중학교' },
    current,
  )
  assert.equal(moved.homeroomClassId, '')
  assert.deepEqual(moved.teachingClassIds, [])
  assert.deepEqual(moved.subjectIds, [])
  const first = assignmentAfterSchoolChange({ schoolCode: '' }, { schoolCode: 'B7010083', kind: '초등학교' }, current)
  assert.equal(first.homeroomClassId, 'neis:1:1')
})

test('학급과 과목 이름을 저장 아이디에서 읽는다', () => {
  assert.equal(classNameFromId('neis:3:2'), '3학년 2반')
  assert.equal(classNameFromId('neis:1:1반'), '1학년 1반')
  assert.equal(subjectNameFromId('2022:elementary:국어'), '국어')
})
