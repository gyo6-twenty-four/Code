import { useState } from 'react'
import { Field, Filters, InfoPanel, ListRow, Modal, PrimaryButton } from '../components/ui'
import { useCollection } from '../lib/state'
import { parseDate, todayValue } from '../components/field-utils'
import { ClassroomField } from '../components/ClassroomField'

export function Timeline({ records, settings, notify }) {
  const [memos, save] = useCollection('classroom-memos', [], notify)
  const [filter, setFilter] = useState('전체 기록')
  const [detail, setDetail] = useState(null)
  const [editor, setEditor] = useState(false)
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(todayValue)
  const [classroom, setClassroom] = useState(`${settings.grade}학년 ${settings.classroom}반`)
  const today = todayValue()
  const start = new Date(`${today}T00:00:00`); start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const startDay = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  const visible = [...records.map(r => ({ ...r, title: `${r.student} · 관찰` })), ...memos.map(r => ({ ...r, title: `${r.classroom} · 수업 메모` }))].filter(r => filter === '전체 기록' || (filter === '이번 달' ? r.date.startsWith(today.slice(0, 7)) : r.date >= startDay && r.date <= today)).sort((a, b) => b.date.localeCompare(a.date))
  return <><div className="timeline-toolbar"><Filters items={['이번 주', '이번 달', '전체 기록']} value={filter} onChange={setFilter} /><button type="button" className="secondary-button" onClick={() => { setMemo(''); setEditor(true) }}>＋ 수업 메모 작성</button></div><div className="content-columns"><div className="settings-list">{visible.map(item => <ListRow key={item.id} title={item.title} detail={item.content} meta={item.date} onClick={() => setDetail(item)} />)}{!visible.length && <div className="empty-state">아직 기록이 없어요. 학생 관찰이나 수업 메모를 남겨 보세요.<a className="inline-link" href="#/students">학생 관찰 작성하기 →</a></div>}</div><InfoPanel title="기록 모아 보기" lines={[`표시된 기록 ${visible.length}건`, '날짜순으로 학생 관찰과 수업 메모를 확인해요', '수업 메모는 학생별 관찰과 별도로 보관해요']} /></div>{editor && <Modal title="수업 메모 작성" onClose={() => setEditor(false)}><form onSubmit={e => { e.preventDefault(); if (!memo.trim()) return; if (save([{ id: crypto.randomUUID(), classroom, date, content: memo.trim() }, ...memos], '수업 메모를 저장했어요.')) setEditor(false) }}><ClassroomField settings={settings} value={classroom} onChange={e => setClassroom(e.target.value)} /><Field label="수업 날짜" type="date" required value={date} onChange={e => setDate(e.target.value)} /><Field label="수업 메모" multiline required maxLength={2000} value={memo} placeholder="예: 낱말의 뜻을 문맥에서 찾아봤어요" onChange={e => setMemo(e.target.value)} /><PrimaryButton type="submit" className="dialog-apply">메모 저장하기</PrimaryButton></form></Modal>}{detail && <Modal title={detail.title} onClose={() => setDetail(null)}><p className="detail-copy">{detail.content}</p><p className="dialog-hint">{detail.date}</p><PrimaryButton className="dialog-apply" onClick={() => setDetail(null)}>확인</PrimaryButton></Modal>}</>
}
export function StudentObservation({ settings, saveObservations, records, query }) {
  const [student, setStudent] = useState(`김민준 · ${settings.grade}학년 ${settings.classroom}반`)
  const [date, setDate] = useState(() => parseDate(query?.get('date')) ? query.get('date') : todayValue())
  const [content, setContent] = useState('')
  const [detail, setDetail] = useState(null)
  const latest = records.find(record => record.student === student)
  return <div className="content-columns observation-columns">
    <form id="observation-form" className="observation-form" onSubmit={e => {
      e.preventDefault()
      if (!content.trim()) return
      if (saveObservations([{ student, date, content: content.trim() }])) setContent('')
    }}>
      <div className="observation-fields">
        <Field label="학생" value={student} onChange={e => setStudent(e.target.value)}>{['김민준', '박서연', '이도윤', '정하린'].map(name => <option key={name} value={`${name} · ${settings.grade}학년 ${settings.classroom}반`}>{name} · {settings.grade}학년 {settings.classroom}반</option>)}</Field>
        <Field label="관찰 날짜" type="date" required value={date} onChange={e => setDate(e.target.value)} />
        <Field label="관찰 내용" multiline required maxLength={2000} placeholder="발표를 준비하고 친구의 의견을 들었어요" value={content} onChange={e => setContent(e.target.value)} />
      </div>
      <div className="settings-list observation-history">
        <h2 className="desktop-only history-title">기록 팁</h2>
        <ListRow title="최근 관찰" detail={latest?.content || '질문을 듣고 자신의 생각을 문장으로 정리했어요'} meta={latest?.date.slice(5).replace('-', '.') || '10.12'} onClick={() => setDetail(latest?.content || '질문을 듣고 자신의 생각을 문장으로 정리했어요')} />
        <ListRow title="수업 맥락" detail="국어 · 모둠 활동" meta="10.10" onClick={() => setDetail('국어 · 모둠 활동')} />
      </div>
    </form>
    <InfoPanel className="desktop-only observation-tips" title="기록 팁" lines={['본 장면을 구체적으로 적어요', '학생의 말과 행동을 중심으로 남겨요', '추측 대신 확인한 내용을 적어요']} />
    {detail && <Modal title="관찰 기록" onClose={() => setDetail(null)}><p className="detail-copy">{detail}</p><PrimaryButton className="dialog-apply" onClick={() => setDetail(null)}>확인</PrimaryButton></Modal>}
  </div>
}
const batchStudents = ['김민준', '박서연', '이도윤', '정하린']
export function BatchObservation({ settings, saveObservations }) {
  const [selected, setSelected] = useState([])
  const [content, setContent] = useState('')
  const [date, setDate] = useState(todayValue)
  return <>
    <form id="batch-form" className="content-columns" onSubmit={e => {
      e.preventDefault()
      if (!content.trim()) return
      if (saveObservations(batchStudents.filter(name => selected.includes(name)).map(name => ({ student: `${name} · ${settings.grade}학년 ${settings.classroom}반`, content: content.trim(), date })))) setSelected([])
    }}>
      <div className="settings-list batch-fields"><Field label="관찰 날짜" type="date" required value={date} onChange={e => setDate(e.target.value)} /><Field label="공통 관찰 내용" multiline required maxLength={2000} placeholder="선택한 학생들에게 남길 관찰 내용을 입력해 주세요" value={content} onChange={e => setContent(e.target.value)} /><p className="dialog-hint">{selected.length}명 선택 · 실제로 관찰한 학생만 선택해 주세요.</p>{batchStudents.map(name => <ListRow key={name} title={name} detail={`${settings.grade}학년 ${settings.classroom}반`} meta={selected.includes(name) ? '선택됨' : '선택'} selected={selected.includes(name)} onClick={() => setSelected(previous => previous.includes(name) ? previous.filter(item => item !== name) : [...previous, name])} />)}</div>
      <InfoPanel title="공통 기록" lines={['수업: 국어 · 읽기 전략', `날짜: ${date}`, '선택한 학생에게 같은 기록을 저장해요']} />
    </form>
  </>
}
