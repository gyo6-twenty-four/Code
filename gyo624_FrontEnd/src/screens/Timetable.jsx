import { useState } from 'react'
import { Field, Modal, PrimaryButton } from '../components/ui'
import { ClassroomField } from '../components/ClassroomField'
import { registeredClasses } from '../lib/registry'
import { weekdays } from '../lib/classrooms'
import { actorId } from '../lib/schedule'
import { useSchedule } from '../lib/schedule-store'
import LessonExchange from '../components/LessonExchange'
import { appendAudit } from './AdminData'

export default function Timetable({ notify, settings, account, admin = false }) {
  const { state, error: saveError, teachers, save, remove } = useSchedule(account, notify)
  const items = state.lessons
  const mine = actorId(account)
  const [mode, setMode] = useState(admin ? '학급별' : '교사별')
  const [classroom, setClassroom] = useState(registeredClasses(settings).includes(`${settings.grade}학년 ${settings.classroom}반`) ? `${settings.grade}학년 ${settings.classroom}반` : registeredClasses(settings)[0] || '')
  const [teacherId, setTeacherId] = useState(mine)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [removed, setRemoved] = useState(null)
  const [busy, setBusy] = useState(false)
  const classes = registeredClasses(settings)
  const teacher = teachers.find(item => item.id === teacherId)
  const visible = items.filter(item => admin && mode === '학급별' ? item.classroom === classroom : item.teacherId === (admin ? teacherId : mine))
  function edit(item, day = weekdays[0], period = '1') {
    setError(''); setDeleting(false)
    setDraft(item ? { ...item } : { id: crypto.randomUUID(), day, period, classroom, subject: '', teacherId: !admin ? mine : mode === '교사별' ? teacherId : '', teacher: !admin ? account.name : teacher?.name || '', status: '확인' })
  }
  async function commit(event) {
    event.preventDefault()
    const person = teachers.find(item => item.id === draft.teacherId)
    if (!classes.includes(draft.classroom) || !person) { setError('등록된 학급과 교사를 선택해 주세요.'); return }
    setBusy(true)
    if (await save({ ...draft, subject: draft.subject.trim(), teacher: person.name, period: String(draft.period) }, admin)) { appendAudit(items.some(item => item.id === draft.id) ? '시간표 수정' : '수업 추가', `${draft.classroom} ${draft.day} ${draft.period}교시`, account.name); setDraft(null) }
    setBusy(false)
  }
  return <section className="timetable-section">
    <div className="schedule-toolbar">{admin ? <><div className="segmented" role="group" aria-label="시간표 보기">{['학급별', '교사별'].map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value}</button>)}</div>{mode === '학급별' ? <ClassroomField label="시간표 학급" value={classroom} settings={settings} onChange={e => setClassroom(e.target.value)} /> : <Field label="시간표 교사" value={teacherId} onChange={e => setTeacherId(e.target.value)}>{teachers.map(item => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</Field>}</> : <div><h2>{account.name} 선생님의 주간 시간표</h2><p className="dialog-hint">요일과 교시를 선택해 과목과 수업할 반을 등록하세요.</p></div>}<form id="timetable-form" onSubmit={e => { e.preventDefault(); edit(null) }}><PrimaryButton type="submit">＋ 수업 추가</PrimaryButton></form></div>
    {removed && <div className="undo-banner" role="status"><span>{removed.day} {removed.period}교시 {removed.classroom} · {removed.subject} 수업을 삭제했어요.</span><button type="button" className="secondary-button" disabled={busy} onClick={async () => { setBusy(true); if (await save(removed, admin)) { appendAudit('수업 삭제 취소', `${removed.classroom} ${removed.day} ${removed.period}교시`, account.name); setRemoved(null) }; setBusy(false) }}>삭제 되돌리기</button></div>}
    <div className="schedule-caption"><p><strong>{admin && mode === '학급별' ? classroom : `${admin ? teacher?.name || '선택한 교사' : account.name} 선생님`}</strong> · 주 {visible.length}개 수업</p><span>월~금요일 · 1~9교시 · 매주 반복</span></div>
    <div className="schedule-scroll" tabIndex={0} role="region" aria-label="주간 시간표. 작은 화면에서는 가로로 스크롤할 수 있어요."><table className="schedule-table"><caption className="sr-only">요일과 교시별 주간 수업</caption><thead><tr><th scope="col">교시</th>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead><tbody>{Array.from({ length: 9 }, (_, index) => String(index + 1)).map(period => <tr key={period}><th scope="row">{period}<small>교시</small></th>{weekdays.map(day => {
      const lessons = visible.filter(item => item.day === day && String(item.period) === period)
      return <td key={day}>{lessons.map(item => <button className="lesson-card" type="button" key={item.id} onClick={() => edit(item)} aria-label={`${day} ${period}교시 ${item.classroom} ${item.subject} ${item.teacher} 수정`}><strong>{item.classroom}</strong><span>{item.subject}{admin && mode === '학급별' ? ` · ${item.teacher} 선생님` : ''}</span>{lessons.length > 1 && <small className="schedule-error">시간 중복 · 수정 필요</small>}</button>)}{!lessons.length && <button type="button" className="empty-slot" aria-label={`${day} ${period}교시 수업 추가`} onClick={() => edit(null, day, period)}>＋<span>수업 추가</span></button>}</td>
    })}</tr>)}</tbody></table></div><p className="dialog-hint">같은 시간에 교사나 학급이 두 수업에 배정될 수 없어요. 날짜별 수업 교체 결과는 홈 달력에서 확인하세요.</p>
    <LessonExchange account={account} notify={notify} />
    {draft && <Modal title={items.some(item => item.id === draft.id) ? '수업 수정' : '수업 추가'} onClose={() => !busy && setDraft(null)}><form onSubmit={commit}><div className="class-fields"><Field label="요일" required value={draft.day} onChange={e => { setError(''); setDraft({ ...draft, day: e.target.value }) }}>{weekdays.map(day => <option key={day}>{day}</option>)}</Field><Field label="교시" required value={draft.period} onChange={e => { setError(''); setDraft({ ...draft, period: e.target.value }) }}>{Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>{i + 1}교시</option>)}</Field></div><ClassroomField value={draft.classroom} settings={settings} onChange={e => { setError(''); setDraft({ ...draft, classroom: e.target.value }) }} /><Field label="과목" required maxLength={40} placeholder="예: 국어, 프로그래밍, 진로 탐색" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} />{admin ? <Field label="담당 교사" required value={draft.teacherId || ''} onChange={e => { setError(''); setDraft({ ...draft, teacherId: e.target.value }) }}><option value="">교사 선택</option>{teachers.map(item => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</Field> : <p className="dialog-hint">담당 교사: {account.name} 선생님</p>}{(error || saveError) && <p className="field-error" role="alert">{error || saveError}</p>}<PrimaryButton type="submit" disabled={busy} className="dialog-apply">수업 저장하기</PrimaryButton>{items.some(item => item.id === draft.id) && (deleting ? <div className="delete-confirm"><p>이 수업을 시간표에서 삭제할까요?</p><button type="button" className="danger-button" disabled={busy} onClick={async () => { setBusy(true); if (await remove(draft.id, admin)) { setRemoved(items.find(item => item.id === draft.id)); appendAudit('수업 삭제', `${draft.classroom} ${draft.day} ${draft.period}교시`, account.name); setDraft(null) } setBusy(false) }}>삭제 확인</button><button type="button" className="text-button" onClick={() => setDeleting(false)}>수업 유지</button></div> : <button type="button" className="text-button danger" disabled={busy} onClick={() => setDeleting(true)}>수업 삭제</button>)}</form></Modal>}
  </section>
}
