import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lessonsForDate, recordsForDate } from './dashboard-calendar.js'
const lessons = [
  { id: 'a', day: '월요일', period: '2', teacher: '김지현', classroom: '2학년 1반' },
  { id: 'b', day: '월요일', period: '1', teacher: '김지현', classroom: '1학년 2반' },
  { id: 'c', day: '월요일', period: '3', teacher: '이서연', classroom: '1학년 2반' },
]
test('선택한 날짜의 담당 교사 수업을 여러 학급에서 모아 교시순으로 정렬한다', () => {
  assert.deepEqual(lessonsForDate(lessons, '2026-10-19', '김지현').map(item => item.id), ['b', 'a'])
  assert.equal(lessonsForDate(lessons, '2026-10-18', '김지현').length, 0)
  assert.equal(lessonsForDate(lessons, '2026-02-30', '김지현').length, 0)
})
test('관찰과 담당 학급 메모를 선택 날짜에 맞춰 집계한다', () => {
  const records = [{ id: 'r', student: '김민준 · 1학년 2반', date: '2026-10-21' }]
  const memos = [{ id: 'm', classroom: '1학년 2반', date: '2026-10-21' }, { id: 'other', classroom: '6학년 1반', date: '2026-10-21' }]
  assert.deepEqual(recordsForDate(records, memos, '2026-10-21', ['1학년 2반']).map(item => item.kind), ['학생 관찰', '수업 메모'])
  assert.equal(recordsForDate(records, memos, '2026-10-22', ['1학년 2반']).length, 0)
})
