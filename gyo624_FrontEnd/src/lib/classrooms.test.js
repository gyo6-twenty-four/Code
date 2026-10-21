import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeClassroom, classParts, classroomOptions, timetableError } from './classrooms.js'

describe('학급 입력 제한', () => {
  it('학년/반을 표준 형식으로 정리한다', () => {
    assert.equal(normalizeClassroom(' 3학년 02반 '), '3학년 2반')
    assert.deepEqual(classParts('6학년 99반'), ['6', '99'])
  })
  it('임의 문자열, 범위 밖 값, 소수/음수를 허용하지 않는다', () => {
    for (const value of ['asd', '말ㅊㅓH', '0학년 1반', '7학년 1반', '1학년 0반', '1학년 100반', '1학년 -2반', '1학년 1.2반']) assert.equal(normalizeClassroom(value), '')
  })
  it('잘못된 기존 데이터를 선택 목록에 노출하지 않고 학급을 중복 제거한다', () => {
    assert.deepEqual(classroomOptions([{ classroom: 'asdf' }, { classroom: '1학년 02반' }, { classroom: '1학년 2반' }]), ['1학년 2반'])
  })
})
const lesson = { id: 'one', day: '월요일', period: '1', classroom: '1학년 2반', subject: '국어', teacher: '김지현' }
describe('시간표 배정', () => {
  it('한 교사의 하루 여러 교시 배정과 기존 수업 수정을 허용한다', () => {
    assert.equal(timetableError({ ...lesson, id: 'two', period: '2' }, [lesson]), '')
    assert.equal(timetableError(lesson, [lesson]), '')
  })
  it('같은 학급/교사의 같은 시간 중복을 각각 차단한다', () => {
    assert.match(timetableError({ ...lesson, id: 'two', teacher: '이서연', period: 1 }, [lesson]), /학급/)
    assert.match(timetableError({ ...lesson, id: 'two', classroom: '2학년 1반' }, [lesson]), /김지현.*같은 시간/)
    assert.equal(timetableError({ ...lesson, id: 'two', classroom: '2학년 1반', teacher: '이서연' }, [lesson]), '')
  })
  it('잘못된 학급/요일/교시/과목을 차단한다', () => {
    for (const patch of [{ classroom: 'asd' }, { day: '토요일' }, { period: '9' }, { subject: 'asdf' }]) assert.ok(timetableError({ ...lesson, ...patch }, []))
  })
})
