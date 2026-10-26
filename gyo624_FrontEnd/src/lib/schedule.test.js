import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { actorId, dateLessons, deleteWeeklyLesson, exchangeError, requestExchange, respondExchange, saveWeeklyLesson } from './schedule.js'

const today = '2026-10-23'
const actor = { id: 'a', name: '가 교사' }, recipient = { id: 'b', name: '나 교사' }
const first = { id: 'first', day: '월요일', period: '1', subject: '국어', classroom: '1학년 1반', teacherId: 'a', teacher: actor.name }
const second = { id: 'second', day: '월요일', period: '2', subject: '프로그래밍', classroom: '2학년 1반', teacherId: 'b', teacher: recipient.name }
const state = () => ({ lessons: [{ ...first }, { ...second }], requests: [], overrides: [], notices: [] })
const draft = { id: 'request', now: `${today}T01:00:00Z`, from: { date: '2026-10-26', lessonId: first.id }, to: { date: '2026-10-26', lessonId: second.id }, message: '수업을 교체하고 싶어요.' }
const send = current => requestExchange(current, draft, actor, today)
const accept = current => respondExchange(current, 'request', 'accepted', recipient, today, `${today}T02:00:00Z`)

describe('수업 교체 요청과 알림', () => {
  it('요청만 보내면 시간표를 유지하고 상대 계정에 요청 알림만 보낸다', () => {
    const next = send(state())
    assert.deepEqual(next.lessons, state().lessons)
    assert.deepEqual(next.overrides, [])
    assert.equal(next.requests[0].status, 'pending')
    assert.equal(next.notices[0].userId, recipient.id)
  })
  it('수락한 날짜에만 담당 교사를 교체하고 기본 시간표는 보존한다', () => {
    const next = accept(send(state()))
    assert.deepEqual(dateLessons(next, '2026-10-26').map(item => item.teacherId), ['b', 'a'])
    assert.deepEqual(dateLessons(next, '2026-11-02').map(item => item.teacherId), ['a', 'b'])
    assert.deepEqual(next.lessons, state().lessons)
    assert.equal(next.notices[0].userId, actor.id)
    assert.match(next.notices[0].title, /수락/)
    assert.equal(next.notices.find(item => item.id === 'request-requested').read, true)
  })
  it('거절과 취소는 수업을 변경하지 않으며 상대에게 결과를 알린다', () => {
    for (const [decision, who, receiver] of [['rejected', recipient, actor], ['cancelled', actor, recipient]]) {
      const next = respondExchange(send(state()), 'request', decision, who, today, 'now')
      assert.deepEqual(next.overrides, [])
      assert.equal(next.notices[0].userId, receiver.id)
    }
  })
  it('수신자만 수락·거절하고 발신자만 취소할 수 있으며 중복 응답을 차단한다', () => {
    assert.throws(() => respondExchange(send(state()), 'request', 'accepted', actor, today, 'now'), /권한/)
    assert.throws(() => respondExchange(send(state()), 'request', 'cancelled', recipient, today, 'now'), /권한/)
    assert.throws(() => accept(accept(send(state()))), /이미 처리/)
    assert.throws(() => requestExchange(state(), draft, recipient, today), /본인/)
  })
  it('같은 수업의 중복 대기 요청, 과거 날짜, 본인 간 교체를 차단한다', () => {
    assert.throws(() => send(send(state())), /응답을 기다리는/)
    assert.match(exchangeError(state(), { ...draft.from, date: '2026-10-19' }, draft.to, today), /오늘 이후/)
    assert.match(exchangeError(state(), draft.from, draft.from, today), /서로 다른/)
  })
  it('요청 후 수업 수정·삭제 시 오래된 요청을 수락할 수 없다', () => {
    const pending = send(state())
    for (const lessons of [pending.lessons.map(item => item.id === first.id ? { ...item, subject: '수학' } : item), pending.lessons.filter(item => item.id !== first.id)]) assert.throws(() => accept({ ...pending, lessons }), /요청 이후 수업이 변경/)
  })
  it('두 교사의 다른 날짜 수업 교체를 지원한다', () => {
    const next = requestExchange(state(), { ...draft, to: { ...draft.to, date: '2026-11-02' } }, actor, today)
    const approved = accept(next)
    assert.equal(dateLessons(approved, '2026-10-26')[0].teacherId, 'b')
    assert.equal(dateLessons(approved, '2026-11-02')[1].teacherId, 'a')
  })
  it('요청 전과 수락 시점의 교사 중복을 모두 차단한다', () => {
    const third = { ...first, id: 'third', period: '2', classroom: '3학년 1반' }
    assert.match(exchangeError({ ...state(), lessons: [...state().lessons, third] }, draft.from, draft.to, today), /같은 시간/)
    const pending = send(state())
    assert.throws(() => accept({ ...pending, lessons: [...pending.lessons, third] }), /같은 시간/)
  })
  it('동일 교시의 두 수업은 서로 교체될 수 있다', () => {
    const samePeriod = { ...state(), lessons: [first, { ...second, period: '1' }] }
    const next = accept(send(samePeriod))
    assert.deepEqual(dateLessons(next, '2026-10-26').map(item => item.teacherId), ['b', 'a'])
  })
})

describe('시간표 변경의 교체 일정 보호', () => {
  it('다른 교사의 수업 변경을 막고 9교시·직접 입력 과목을 저장한다', () => {
    assert.throws(() => saveWeeklyLesson(state(), { ...second, subject: '수학' }, actor, false, today), /본인/)
    const next = saveWeeklyLesson(state(), { ...first, period: '9', subject: '진로 탐색' }, actor, false, today)
    assert.equal(next.lessons[0].period, '9')
  })
  it('교체 확정된 수업의 기본 시간표 수정·삭제를 막는다', () => {
    const approved = accept(send(state()))
    assert.throws(() => saveWeeklyLesson(approved, { ...first, period: '9' }, actor, false, today), /교체가 확정/)
    assert.throws(() => deleteWeeklyLesson(approved, first.id, actor, false, today), /교체가 확정/)
  })
  it('확정된 날짜에 새로 추가한 주간 수업이 겹치는 것도 막는다', () => {
    const approved = accept(send(state()))
    const third = { ...first, id: 'third', classroom: '3학년 1반', period: '2', teacherId: 'a' }
    assert.throws(() => saveWeeklyLesson(approved, third, actor, false, today), /교체 시간표와 겹쳐요/)
  })
  it('알 수 없는 날짜는 수업을 표시하지 않는다', () => assert.deepEqual(dateLessons(state(), 'invalid'), []))
  it('기존 계정 별칭도 동일한 교사 ID로 처리한다', () => assert.equal(actorId({ id: 'alias', scheduleId: 'a' }), 'a'))
})
