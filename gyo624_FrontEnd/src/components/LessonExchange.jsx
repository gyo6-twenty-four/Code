import { useState } from 'react'
import { Field, Modal, PrimaryButton } from './ui'
import { todayValue } from './field-utils'
import { actorId, dateLessons, exchangeError } from '../lib/schedule'
import { useSchedule } from '../lib/schedule-store'

const exchangeStatus = { pending: '응답 대기', accepted: '수락됨', rejected: '거절됨', cancelled: '취소됨' }
const lessonLabel = (ref, lesson) => `${ref.date} · ${lesson.period}교시 · ${lesson.classroom} · ${lesson.subject}`
export function ExchangeDetails({ request, account, respond }) {
  const [busy, setBusy] = useState(false)
  const mine = actorId(account)
  async function decide(decision) { setBusy(true); await respond(request.id, decision); setBusy(false) }
  return <article className="exchange-card"><header><strong>{request.fromTeacherId === mine ? `${request.toName} 선생님에게 보낸 요청` : `${request.fromName} 선생님이 보낸 요청`}</strong><span className={`exchange-status status-${request.status}`}>{exchangeStatus[request.status]}</span></header><dl><div><dt>{request.fromName} 선생님 수업</dt><dd>{lessonLabel(request.from, request.fromLesson)}</dd></div><div><dt>{request.toName} 선생님 수업</dt><dd>{lessonLabel(request.to, request.toLesson)}</dd></div></dl>{request.message && <p className="exchange-message">{request.message}</p>}{request.status === 'accepted' && <p className="dialog-hint">두 수업의 담당 교사가 교체되었어요.</p>}{request.status === 'pending' && <div className="exchange-actions">{request.toTeacherId === mine ? <><PrimaryButton disabled={busy} onClick={() => decide('accepted')}>수락하기</PrimaryButton><button className="secondary-button" type="button" disabled={busy} onClick={() => decide('rejected')}>거절하기</button></> : <button className="secondary-button" type="button" disabled={busy} onClick={() => decide('cancelled')}>요청 취소</button>}</div>}</article>
}
export default function LessonExchange({ account, notify, date = todayValue(), compact = false }) {
  const { state, error: saveError, teachers, request, respond } = useSchedule(account, notify)
  const mine = actorId(account)
  const [open, setOpen] = useState(false)
  const [fromDate, setFromDate] = useState(date < todayValue() ? todayValue() : date)
  const [toDate, setToDate] = useState(date < todayValue() ? todayValue() : date)
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('pending')
  const own = dateLessons(state, fromDate).filter(item => item.teacherId === mine)
  const others = dateLessons(state, toDate).filter(item => item.teacherId === recipient && item.teacherId !== mine)
  const requests = state.requests.filter(item => [item.fromTeacherId, item.toTeacherId].includes(mine) && (!compact || item.status === 'pending') && (compact || filter === 'all' || item.status === 'pending'))
  const from = { date: fromDate, lessonId: fromId }, to = { date: toDate, lessonId: toId }
  const conflict = fromId && toId ? exchangeError(state, from, to, todayValue()) : ''
  function start() { const initial = date < todayValue() ? todayValue() : date; setFromDate(initial); setToDate(initial); setFromId(''); setToId(''); setRecipient(''); setMessage(''); setError(''); setOpen(true) }
  async function submit(event) { event.preventDefault(); if (conflict) { setError(conflict); return } setBusy(true); const saved = await request({ from, to, message }); setBusy(false); if (saved) setOpen(false) }
  return <section className={`exchange-section${compact ? ' exchange-compact' : ''}`} aria-label="수업 교체"><div className="exchange-heading"><div><h2>수업 교체</h2><p>상대 교사가 수락하면 해당 날짜에만 반영돼요.</p></div><button type="button" className="secondary-button" onClick={start}>교체 요청하기</button></div>{saveError && !open && <p role="alert" className="field-error">{saveError}</p>}{!compact && <div className="segmented" role="group" aria-label="교체 요청 필터"><button type="button" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>응답 대기</button><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>전체 요청</button></div>}{requests.length ? requests.map(item => <ExchangeDetails key={item.id} request={item} account={account} respond={respond} />) : <p className="agenda-empty">{filter === 'all' && !compact ? '아직 수업 교체 요청이 없어요.' : '응답을 기다리는 교체 요청이 없어요.'}</p>}{compact && <a className="text-button" href="#/timetable">전체 교체 내역 보기 →</a>}
    {open && <Modal title="수업 교체 요청" onClose={() => !busy && setOpen(false)} className="exchange-dialog"><form onSubmit={submit}><p className="dialog-hint">선택한 두 수업의 담당 교사를 교체해요. 과목·학급·시간은 유지되며 기본 주간 시간표는 바뀌지 않아요.</p><fieldset><legend>내가 맡은 수업</legend><Field label="내 수업 날짜" type="date" min={todayValue()} required value={fromDate} onChange={e => { setFromDate(e.target.value); setFromId(''); setError('') }} /><Field label="교체할 내 수업" required value={fromId} onChange={e => { setFromId(e.target.value); setError('') }}><option value="">수업 선택</option>{own.map(item => <option key={item.id} value={item.id}>{item.period}교시 · {item.classroom} · {item.subject}</option>)}</Field>{!own.length && <p className="dialog-hint">이 날짜에 본인에게 배정된 수업이 없어요. 다른 날짜를 선택하거나 시간표를 등록해 주세요.</p>}</fieldset><fieldset><legend>상대 교사의 수업</legend><Field label="교체 요청할 교사" required value={recipient} onChange={e => { setRecipient(e.target.value); setToId(''); setError('') }}><option value="">교사 선택</option>{teachers.filter(item => item.id !== mine).map(item => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</Field><Field label="상대 수업 날짜" type="date" min={todayValue()} required value={toDate} onChange={e => { setToDate(e.target.value); setToId(''); setError('') }} /><Field label="교체할 상대 수업" required value={toId} onChange={e => { setToId(e.target.value); setError('') }}><option value="">수업 선택</option>{others.map(item => <option key={item.id} value={item.id}>{item.period}교시 · {item.classroom} · {item.subject}</option>)}</Field>{recipient && !others.length && <p className="dialog-hint">선택한 교사의 이 날짜 수업이 없어요.</p>}</fieldset><Field label="요청 메시지 (선택)" multiline maxLength={300} placeholder="교체가 필요한 이유를 알려 주세요." value={message} onChange={e => setMessage(e.target.value)} />{(error || conflict || saveError) && <p role="alert" className="field-error">{error || conflict || saveError}</p>}<PrimaryButton type="submit" disabled={busy || !fromId || !toId || !!conflict} className="dialog-apply">{busy ? '요청 보내는 중…' : '교체 요청 보내기'}</PrimaryButton></form></Modal>}
  </section>
}
