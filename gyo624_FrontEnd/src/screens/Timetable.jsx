import { registeredClasses, registeredTeachers } from '../lib/registry'
import { useState } from 'react'
import { Field, Modal, PrimaryButton } from '../components/ui'
import { ClassroomField } from '../components/ClassroomField'
import { useCollection } from '../lib/state'
import { subjects, timetableError, weekdays } from '../lib/classrooms'
import { appendAudit, timetableSeed } from './AdminData'

export default function Timetable({ notify, settings }) {
  const [items, save] = useCollection('classroom-timetable', timetableSeed, notify)
  const [mode, setMode] = useState('학급별')
  const [classroom, setClassroom] = useState(registeredClasses(settings).includes(`${settings.grade}학년 ${settings.classroom}반`) ? `${settings.grade}학년 ${settings.classroom}반` : registeredClasses(settings)[0] || '')
  const [teacher, setTeacher] = useState(registeredTeachers().includes(settings.name) ? settings.name : registeredTeachers()[0] || '')
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [removed, setRemoved] = useState(null)
  const classes = registeredClasses(settings)
  const teachers = registeredTeachers()
  const visible = items.filter(item => mode === '학급별' ? item.classroom === classroom : item.teacher === teacher)
  function edit(item, day = weekdays[0], period = '1') {
    setError(''); setDeleting(false)
    setDraft(item ? { ...item } : { id: crypto.randomUUID(), day, period, classroom, subject: '', teacher: mode === '교사별' ? teacher : '', status: '확인' })
  }
  function commit(event) {
    event.preventDefault()
    const message = timetableError(draft, items)
    if (message || !classes.includes(draft.classroom) || !teachers.includes(draft.teacher)) { setError(message || '등록된 학급과 교사를 선택해 주세요.'); return }
    const exists = items.some(item => item.id === draft.id)
    const next = { ...draft, period: String(draft.period) }
    if (save(exists ? items.map(item => item.id === draft.id ? next : item) : [...items, next], '수업을 저장했어요. 주간 시간표에 바로 반영됩니다.')) {
      appendAudit(exists ? '시간표 수정' : '수업 추가', `${draft.classroom} ${draft.day} ${draft.period}교시`)
      setDraft(null)
    }
  }
  return <section className="timetable-section">
    <div className="schedule-toolbar"><div className="segmented" role="group" aria-label="시간표 보기">{['학급별', '교사별'].map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value}</button>)}</div>
      {mode === '학급별' ? <ClassroomField label="시간표 학급" value={classroom} settings={settings} onChange={e => setClassroom(e.target.value)} /> : <Field label="시간표 교사" value={teacher} onChange={e => setTeacher(e.target.value)}>{teachers.map(name => <option key={name}>{name}</option>)}</Field>}
      <form id="timetable-form" onSubmit={e => { e.preventDefault(); edit(null) }}><PrimaryButton type="submit">＋ 수업 추가</PrimaryButton></form>
    </div>
    {removed && <div className="undo-banner" role="status"><span>{removed.day} {removed.period}교시 {removed.subject} 수업을 삭제했어요.</span><button type="button" className="secondary-button" onClick={() => { const error = timetableError(removed, items); if (error) { notify(error); return } if (save([...items, removed], '삭제한 수업을 복원했어요.')) { appendAudit('수업 삭제 취소', `${removed.classroom} ${removed.day} ${removed.period}교시`); setRemoved(null) } }}>삭제 되돌리기</button></div>}
    <div className="schedule-caption"><p><strong>{mode === '학급별' ? classroom : `${teacher} 선생님`}</strong> · 주 {visible.length}개 수업</p><span>빈 칸을 눌러 수업을 추가하고, 수업을 눌러 수정하세요.</span></div>
    <div className="schedule-scroll" tabIndex={0} role="region" aria-label="주간 시간표. 작은 화면에서는 가로로 스크롤할 수 있어요."><table className="schedule-table"><caption className="sr-only">요일과 교시별 주간 수업</caption><thead><tr><th scope="col">교시</th>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead><tbody>{Array.from({ length: 8 }, (_, index) => String(index + 1)).map(period => <tr key={period}><th scope="row">{period}<small>교시</small></th>{weekdays.map(day => {
      const lessons = visible.filter(item => item.day === day && String(item.period) === period)
      return <td key={day}>{lessons.map(item => <button className="lesson-card" type="button" key={item.id} onClick={() => edit(item)} aria-label={`${day} ${period}교시 ${item.classroom} ${item.subject} ${item.teacher} 수정`}><strong>{item.subject}</strong><span>{mode === '학급별' ? `${item.teacher} 선생님` : item.classroom}</span>{lessons.length > 1 && <small className="schedule-error">시간 중복 · 수정 필요</small>}</button>)}{!lessons.length && <button type="button" className="empty-slot" aria-label={`${day} ${period}교시 수업 추가`} onClick={() => edit(null, day, period)}>＋<span>수업 추가</span></button>}</td>
    })}</tr>)}</tbody></table></div><p className="dialog-hint">수업은 저장 즉시 반영됩니다. 같은 시간에 한 학급이나 교사가 두 수업에 배정되면 저장할 수 없어요.</p>
    {draft && <Modal title={items.some(item => item.id === draft.id) ? '수업 수정' : '수업 추가'} onClose={() => setDraft(null)}><form onSubmit={commit}><div className="class-fields"><Field label="요일" required value={draft.day} onChange={e => { setError(''); setDraft({ ...draft, day: e.target.value }) }}>{weekdays.map(day => <option key={day}>{day}</option>)}</Field><Field label="교시" required value={draft.period} onChange={e => { setError(''); setDraft({ ...draft, period: e.target.value }) }}>{Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>{i + 1}교시</option>)}</Field></div><ClassroomField value={draft.classroom} settings={settings} onChange={e => { setError(''); setDraft({ ...draft, classroom: e.target.value }) }} /><Field label="과목" required value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })}><option value="">과목 선택</option>{subjects.map(subject => <option key={subject}>{subject}</option>)}</Field><Field label="담당 교사" required value={draft.teacher} onChange={e => { setError(''); setDraft({ ...draft, teacher: e.target.value }) }}><option value="">교사 선택</option>{teachers.map(name => <option key={name}>{name}</option>)}</Field>{error && <p className="field-error" role="alert">{error}</p>}<PrimaryButton type="submit" className="dialog-apply">수업 저장하기</PrimaryButton>{items.some(item => item.id === draft.id) && (deleting ? <div className="delete-confirm"><p>이 수업을 시간표에서 삭제할까요?</p><button type="button" className="danger-button" onClick={() => { if (save(items.filter(item => item.id !== draft.id), '수업을 삭제했어요.')) { setRemoved({ ...draft }); appendAudit('수업 삭제', `${draft.classroom} ${draft.day} ${draft.period}교시`); setDraft(null) } }}>삭제 확인</button><button type="button" className="text-button" onClick={() => setDeleting(false)}>수업 유지</button></div> : <button type="button" className="text-button danger" onClick={() => setDeleting(true)}>수업 삭제</button>)}</form></Modal>}
  </section>
}
