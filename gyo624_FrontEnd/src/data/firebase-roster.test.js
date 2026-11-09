import assert from 'node:assert/strict'
import test from 'node:test'
import { virtualRosterDocuments } from './firebase-roster.js'

test('경북소프트웨어마이스터고등학교 가상 명단을 Firestore 문서로 만든다', () => {
  const roster = virtualRosterDocuments({
    name: '경소마고',
    schoolCode: '8750829',
    officeCode: 'R10',
    officeName: '경상북도교육청',
    kind: '고등학교',
  }, 2026)
  assert.equal(roster.classes.length, 12)
  assert.equal(roster.students.length, 192)
  assert.equal(roster.classes[0].schoolName, '경북소프트웨어마이스터고등학교')
  assert.equal(roster.classes[0].schoolCode, '8750829')
  const first = roster.students.find(item => item.id === 'gsm:8750829:2026:1')
  assert.equal(first.name, '박다은')
  assert.equal(first.number, 1)
  assert.equal(first.classId, 'gsm:8750829:2026:1-1')
  assert.equal(first.pseudonymId, 'G1-C1-01')
})
