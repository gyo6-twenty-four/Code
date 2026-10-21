import DashboardCalendar from '../components/DashboardCalendar'
import { registeredClasses } from '../lib/registry'
import { ClassroomField } from '../components/ClassroomField'
import { todayValue } from '../components/field-utils'
import { useEffect, useState } from 'react'
import { Field, Filters, InfoPanel, ListRow, Modal, PrimaryButton } from '../components/ui'
import { navigate, readCollection, useCollection } from '../lib/state'
import { downloadDelimited } from '../lib/export'
import { careerSeed, evaluationSeed, notificationSeed, reportSeed } from './TeacherData'

const classLabel = settings => `${settings.grade}학년 ${settings.classroom}반`
function Detail({ title, children, onClose, action, actionLabel = '확인' }) { return <Modal title={title} onClose={onClose}>{children}<PrimaryButton className="dialog-apply" onClick={action || onClose}>{actionLabel}</PrimaryButton>{action && <button type="button" className="secondary-button modal-cancel" onClick={onClose}>취소</button>}</Modal> }
export function WeeklyChart() { return <section className="chart-card"><h2>주간 기록 흐름</h2><p>최근 6주 · 수업과 학생 관찰 기록</p><div className="chart-bars" role="img" aria-label="최근 6주 기록 흐름. 마지막 주 기록이 가장 많아요.">{[49.64, 75.92, 67.16, 99.28, 87.6, 125.56].map((height, i) => <span key={i} style={{ '--bar-height': height }} />)}</div></section> }
export function TeacherDashboard({ type, records, settings, account }) {
  const board = type === 'reports'
  const [reports] = useState(() => readCollection('classroom-reports', reportSeed))
  const metrics = board ? [['작성 중', '8명', '기록을 이어서 작성해요'], ['검토 필요', '5명', '표현을 확인해요'], ['정리 완료', '11명', '필수 항목을 확인했어요']] : [['이번 주 수업', '8건', '지난주보다 2건 늘었어요'], ['학생 관찰', `${14 + records.length}건`, '24명 중 18명 기록'], ['확인 필요', '2건', '초안 2건이 남아 있어요']]
  const info = board ? ['학생별 상태를 확인해요', '기재 요령을 확인한 뒤 내보내요'] : ['수업 기록은 날짜별로 모여요', '학생 기록은 학생별로 다시 볼 수 있어요', '필요한 항목만 이어서 확인해요']
  return <div className="teacher-dashboard admin-dashboard">
    {!board && <DashboardCalendar settings={settings} account={account} records={records} />}
    <div className="metric-grid">{metrics.map(([label, value, caption]) => <section className="metric-card" key={label}><h2>{label}</h2><p className="metric-value">{value}</p><p>{caption}</p></section>)}</div>
    <div className="admin-columns"><WeeklyChart /><InfoPanel className="desktop-only" title={board ? '진행 안내' : '기록 흐름'} lines={info} />
      <section className="admin-recent"><h2><span className="mobile-only">확인할 내용</span><span className="desktop-only">최근 확인할 내용</span></h2><div className="settings-list">
        {board ? reports.map((report, i) => <ListRow key={report.id} className={i > 0 ? 'desktop-only' : ''} title={report.student} detail={report.detail} meta={report.status} href={`/reports/edit?id=${report.id}`} />) : <><ListRow title="기록이 적은 학생" detail="최근 2주 동안 관찰 기록이 없어요" meta="6명" href="/students" /><ListRow className="desktop-only" title="초안 확인" detail="저장 후 검토가 필요해요" meta="2건" href="/reports" /></>}
      </div></section><InfoPanel className="admin-guide desktop-only" title="기록을 한 번에 확인해요" lines={[board ? '학생별 기록 진행 상황을 모아 확인해요.' : '학급과 기간별 기록 현황을 한눈에 확인해요.']} />
    </div>
  </div>
}
export function Evaluations({ settings, notify }) {
  const [filter, setFilter] = useState('전체')
  const [items] = useCollection('classroom-evaluations', evaluationSeed, notify)
  const visible = filter === '최근 기록' ? items.slice(0, 2) : items
  return <><Filters value={filter} onChange={setFilter} /><div className="content-columns"><div className="settings-list">{visible.map(item => <ListRow key={item.id} className={item.id === 'cooperation' ? 'desktop-only' : ''} title={item.name} detail={`${item.subject} · 기준 ${item.criteria.length}개 · 학생 24명`} meta={item.status} href={`/evaluations/create?id=${item.id}`} />)}</div><InfoPanel title="평가 안내" lines={['평가 기준은 관찰 기록과 연결돼요', '진행 상태를 확인하고 필요한 항목만 수정해요']} /></div><span className="sr-only">{classLabel(settings)} 평가</span></>
}
export function EvaluationEditor({ settings, notify, query }) {
  const [items, save] = useCollection('classroom-evaluations', evaluationSeed, notify)
  const current = items.find(item => item.id === query.get('id'))
  const [name, setName] = useState(current?.name || '')
  const [subject, setSubject] = useState(current?.subject || '국어')
  const [criterion, setCriterion] = useState(current?.criteria?.[0] || '')
  const [extra, setExtra] = useState(current?.criteria?.slice(1) || [])
  const [editor, setEditor] = useState(false)
  const [extraText, setExtraText] = useState('')
  const [range, setRange] = useState(false)
  return <div className="content-columns observation-columns">
    <form id="evaluation-form" className="observation-form" onSubmit={e => { e.preventDefault(); if (!name.trim() || !criterion.trim()) return; const next = { id: current?.id || crypto.randomUUID(), name: name.trim(), subject, criteria: [criterion.trim(), ...extra], status: current?.status || '초안' }; if (save(current ? items.map(item => item.id === current.id ? next : item) : [next, ...items], '평가를 이 브라우저에 저장했어요.')) navigate('/evaluations') }}>
      <div className="observation-fields"><Field label="평가 이름" required pattern=".*\S.*" placeholder="예: 2학기 읽기 성장 기록" value={name} onChange={e => setName(e.target.value)} /><Field label="과목" value={subject} onChange={e => setSubject(e.target.value)}>{['국어', '수학', '창체', '통합', '사회', '과학', '영어'].map(item => <option key={item}>{item}</option>)}</Field><Field label="평가 기준" required pattern=".*\S.*" placeholder="읽은 내용을 자신의 말로 설명해요" value={criterion} onChange={e => setCriterion(e.target.value)} /></div>
      <div className="settings-list observation-history"><h2 className="desktop-only history-title">평가 기준</h2><ListRow title="기준 예시" detail={extra.length ? extra.join(' · ') : '근거를 들어 생각을 설명해요'} meta={extra.length ? `${extra.length}개` : '추가'} onClick={() => setEditor(true)} /><ListRow title="학생 범위" detail={`${classLabel(settings)} · 24명`} meta="선택" onClick={() => setRange(true)} /></div>
    </form><InfoPanel className="desktop-only observation-tips" title="평가 기준" lines={['확인할 수 있는 행동으로 적어요', '학생 기록과 연결하면 다시 찾기 쉬워요']} />
    {editor && <Modal title="평가 기준 추가" onClose={() => setEditor(false)}><form onSubmit={e => { e.preventDefault(); if (!extraText.trim()) return; setExtra([...extra, extraText.trim()]); setExtraText(''); setEditor(false) }}><Field label="추가 기준" required placeholder="근거를 들어 생각을 설명해요" value={extraText} onChange={e => setExtraText(e.target.value)} /><PrimaryButton type="submit" className="dialog-apply">기준 추가</PrimaryButton></form></Modal>}
    {range && <Detail title="학생 범위" onClose={() => setRange(false)}><p className="detail-copy">{classLabel(settings)} · 24명 전체를 대상으로 평가해요.</p></Detail>}
  </div>
}
export function Career({ notify }) {
  const [items, save] = useCollection('classroom-careers', careerSeed, notify)
  const [filter, setFilter] = useState('전체')
  const [editor, setEditor] = useState(null)
  const [draft, setDraft] = useState('')
  const [nextActivity, setNextActivity] = useState(false)
  return <><Filters value={filter} onChange={setFilter} /><form id="career-form" className="content-columns" onSubmit={e => { e.preventDefault(); save(items, '진로 기록을 이 브라우저에 저장했어요.') }}><div className="settings-list">{(filter === '최근 기록' ? items.slice(0, 2) : items).map(item => <ListRow key={item.id} title={item.student} detail={item.content} meta={item.category} onClick={() => { setEditor(item); setDraft(item.content) }} />)}<button type="button" className="next-activity desktop-only" onClick={() => setNextActivity(true)}><h2>다음 활동을 살펴봐요</h2><p>관심을 확인하는 질문을 남겨요</p></button></div><InfoPanel title="다음 활동" lines={['관심을 확인하는 질문을 남겨요', '학생의 경험과 연결해 기록해요']} /></form>
    {editor && <Modal title={`${editor.student} 진로 탐색`} onClose={() => setEditor(null)}><form onSubmit={e => { e.preventDefault(); if (save(items.map(item => item.id === editor.id ? { ...item, content: draft.trim() } : item), '진로 기록을 이 브라우저에 저장했어요.')) setEditor(null) }}><Field label="관심과 경험" multiline required value={draft} onChange={e => setDraft(e.target.value)} /><PrimaryButton type="submit" className="dialog-apply">기록 저장하기</PrimaryButton></form></Modal>}
    {nextActivity && <Detail title="다음 활동" onClose={() => setNextActivity(false)}><p className="detail-copy">어떤 활동을 더 해 보고 싶나요? 학생의 관심과 연결되는 질문을 기록해 보세요.</p></Detail>}
  </>
}
export function ReportEditor({ settings, records, notify, query }) {
  const [reports, save] = useCollection('classroom-reports', reportSeed, notify)
  const current = reports.find(report => report.id === query.get('id')) || reports[0] || reportSeed[0]
  const [student, setStudent] = useState(current.student)
  const [item, setItem] = useState(current.item)
  const [content, setContent] = useState(current.content)
  const [linked, setLinked] = useState(null)
  const [saved, setSaved] = useState(false)
  const studentId = reports.find(r => r.student === student)?.id || current.id
  return <div className="content-columns observation-columns report-editor">
    <form id="report-form" className="observation-form" onSubmit={e => { e.preventDefault(); if (!content.trim()) return; const updated = { id: studentId, student, item, content: content.trim(), status: '초안', detail: `${item} · 초안이 있어요` }; if (save(reports.map(report => report.id === studentId ? updated : report), '학생 기록을 이 브라우저에 임시 저장했어요.')) setSaved(true) }}>
      <div className="observation-fields"><Field label="학생" value={student} onChange={e => { const next = reports.find(r => r.student === e.target.value); setStudent(e.target.value); setItem(next?.item || current.item); setContent(next?.content || ''); setSaved(false) }}>{reports.map(report => <option key={report.id} value={report.student}>{report.student} · {classLabel(settings)}</option>)}</Field><Field label="항목" value={item} onChange={e => { setItem(e.target.value); setSaved(false) }}>{['교과 학습 발달 상황', '행동 특성 및 종합 의견', '창의적 체험 활동'].map(option => <option key={option}>{option}</option>)}</Field><Field label="기록 내용" multiline required maxLength={4000} placeholder="수업에서 확인한 장면을 바탕으로 정리해요" value={content} onChange={e => { setContent(e.target.value); setSaved(false) }} /></div>
      <div className="settings-list observation-history"><h2 className="desktop-only history-title">작성 도움말</h2><ListRow title="연결된 관찰" detail={records.find(r => r.student.startsWith(student))?.content || '국어 · 모둠 토의에서 근거를 들었어요'} meta="연결" onClick={() => setLinked('관찰')} /><ListRow title="연결된 평가" detail="2학기 읽기 성장 기록" meta="연결" onClick={() => setLinked('평가')} /></div>
      {saved && <a className="inline-link" href={`#/reports/check?id=${studentId}`}>저장한 기록의 기재 요령 확인하기 →</a>}
    </form><InfoPanel className="desktop-only observation-tips" title="작성 도움말" lines={['확인한 사실을 중심으로 적어요', '학생의 변화와 과정을 구체적으로 담아요']} />
    {linked && <Detail title={`연결된 ${linked}`} onClose={() => setLinked(null)} action={() => { setLinked(null); navigate(linked === '관찰' ? '/students' : '/evaluations/create?id=reading') }} actionLabel={`${linked} 화면 보기`}><p className="detail-copy">{linked === '관찰' ? records.find(r => r.student.startsWith(student))?.content || '국어 · 모둠 토의에서 근거를 들었어요' : '2학기 읽기 성장 기록'}</p></Detail>}
  </div>
}
export function ReportCheck({ query }) {
  const [detail, setDetail] = useState(null)
  const id = query.get('id') || 'minjun'
  return <div className="validation-results"><section className="validation-banner"><p>확인 결과</p><h2>필수 항목을 확인했어요</h2><span>표현 점검 결과를 살펴보고 필요한 부분만 수정해요.</span></section><div className="settings-list validation-list">
    {[['필수 항목', '필수 내용이 모두 입력됐어요', '확인'], ['표현 점검', '비교·추측 표현을 다시 살펴봐요', '1건'], ['학생 정보', '학생과 학급 정보가 맞아요', '확인'], ['분량 확인', '학교 기준에 맞게 정리됐어요', '확인']].map(([title, description, meta], i) => <ListRow key={title} className={i === 3 ? 'desktop-only' : ''} title={title} detail={description} meta={meta} onClick={() => setDetail([title, description])} />)}
  </div>{detail && <Detail title={detail[0]} onClose={() => setDetail(null)} action={() => navigate(`/reports/edit?id=${id}`)} actionLabel="기록 수정하기"><p className="detail-copy">{detail[1]}</p><p className="dialog-hint">디자인의 예시 점검 결과입니다. 실제 기재 요령 검증은 연결되지 않았어요.</p></Detail>}</div>
}
export function ReportExport({ notify }) {
  const [filter, setFilter] = useState('전체')
  const [format, setFormat] = useState('csv')
  const [dialog, setDialog] = useState(null)
  const [reports] = useState(() => readCollection('classroom-reports', reportSeed))
  function exportFile() {
    const filled = reports.filter(report => report.content?.trim())
    if (!filled.length) { notify('저장한 학생 기록이 없어요. 학생 기록을 먼저 작성해 주세요.'); return }
    const separator = format === 'csv' ? ',' : '\t'
    downloadDelimited(`교육24.${format}`, [['학생', '항목', '기록 내용'], ...filled.map(report => [report.student, report.item, report.content])], separator)
    notify(`${filled.length}명의 학생 기록을 내보냈어요.`)
  }
  return <><Filters value={filter} onChange={setFilter} /><form id="export-form" className="content-columns" onSubmit={e => { e.preventDefault(); exportFile() }}><div className="settings-list">
    <ListRow title="복사할 항목" detail="교과 학습 발달 상황 · 24명" meta="준비됨" onClick={() => setDialog('items')} /><ListRow title="파일 형식" detail={`UTF-8 ${format.toUpperCase()} · 항목별 정리`} meta="선택" onClick={() => setDialog('format')} /><ListRow title="붙여넣기 안내" detail="내보낸 내용을 확인한 뒤 사용해요" meta="안내" onClick={() => setDialog('help')} />
    </div><div className="export-info-column"><InfoPanel title="내보내기 전 확인" lines={['학생 이름과 항목을 확인해요', '학교 시스템에 붙여넣기 전에 내용을 검토해요']} /><InfoPanel className="desktop-only admin-guide" title="안전하게 확인해요" lines={['학생 이름과 항목을 확인해요']} /></div></form>
    {dialog && <Modal title={dialog === 'format' ? '파일 형식' : dialog === 'items' ? '복사할 항목' : '붙여넣기 안내'} onClose={() => setDialog(null)}>{dialog === 'format' ? <Field label="내보낼 형식" value={format} onChange={e => setFormat(e.target.value)}><option value="csv">UTF-8 CSV</option><option value="tsv">UTF-8 TSV</option></Field> : dialog === 'items' ? <><p className="detail-copy">저장된 학생 기록 {reports.filter(report => report.content?.trim()).length}건을 내보낼 수 있어요.</p><a className="inline-link" href="#/reports/edit">학생 기록 작성하기</a></> : <p className="detail-copy">파일을 열어 학생 이름과 항목, 기록 내용을 확인한 뒤 학교 업무 시스템의 해당 항목에 옮겨 적어 주세요.</p>}<PrimaryButton className="dialog-apply" onClick={() => setDialog(null)}>확인</PrimaryButton></Modal>}
  </>
}
export function Transfer({ settings, records, saveRecords, notify }) {
  const [source, setSource] = useState(classLabel(settings))
  const [target, setTarget] = useState(() => registeredClasses(settings).find(item => item !== classLabel(settings)) || '')
  const [date, setDate] = useState(todayValue)
  const [selected, setSelected] = useState([])
  const [confirm, setConfirm] = useState(false)
  const eligible = records.filter(record => record.student.endsWith(` · ${source}`) && record.date <= date)
  const students = [...new Set(eligible.map(record => record.student.split(' · ')[0]))]
  function transfer() {
    if (!registeredClasses(settings).includes(source) || !registeredClasses(settings).includes(target)) { notify('등록된 학급을 선택해 주세요.'); return }
    if (source.trim() === target.trim()) { notify('서로 다른 학급을 선택해 주세요.'); return }
    const names = selected.map(name => `${name} · ${source}`)
    const matching = records.filter(record => names.includes(record.student) && record.date <= date)
    if (!matching.length) { notify('선택한 학생의 해당 학급·날짜에 저장된 관찰 기록이 없어요.'); return }
    if (saveRecords(records.map(record => matching.some(item => item.id === record.id) ? { ...record, student: `${record.student.split(' · ')[0]} · ${target}` } : record))) { setConfirm(false); setSelected([]); notify(`${matching.length}건의 브라우저 기록을 ${target}으로 옮겼어요.`) }
  }
  return <div className="content-columns observation-columns"><form id="transfer-form" className="observation-form" onSubmit={e => { e.preventDefault(); if (source === target) { notify('서로 다른 학급을 선택해 주세요.'); return } if (!selected.length) { notify('이관할 학생을 선택해 주세요.'); return } setConfirm(true) }}><div className="observation-fields"><ClassroomField label="이관할 학급" settings={settings} value={source} onChange={e => { setSource(e.target.value); setSelected([]) }} /><ClassroomField label="이관 받을 학급" settings={settings} options={registeredClasses(settings).filter(item => item !== source)} value={target} onChange={e => setTarget(e.target.value)} /><Field label="기준 날짜" type="date" required value={date} onChange={e => { setDate(e.target.value); setSelected([]) }} /></div><div className="settings-list observation-history"><h2 className="history-title">이관할 학생 · {selected.length}명 선택</h2>{!students.length && <p className="empty-state">이 학급에는 기준 날짜까지 저장된 관찰 기록이 없어요.</p>}{students.map(name => <ListRow key={name} title={name} detail={`학생 관찰 기록 ${eligible.filter(record => record.student.startsWith(`${name} · `)).length}건`} meta={selected.includes(name) ? '선택됨' : '선택'} selected={selected.includes(name)} onClick={() => setSelected(previous => previous.includes(name) ? previous.filter(item => item !== name) : [...previous, name])} />)}</div></form><InfoPanel className="desktop-only observation-tips" title="이관 범위" lines={['선택한 학생의 기록만 옮겨요', '이관 후 대상 학급을 다시 확인해요']} />{confirm && <Detail title="선택 기록 이관" onClose={() => setConfirm(false)} action={transfer} actionLabel="브라우저 기록 이관하기"><p className="detail-copy">{selected.join(', ')} 학생의 {date} 까지의 관찰을 {source}에서 {target}으로 옮길까요?</p><p className="dialog-hint">현재 브라우저에 저장한 관찰 기록에만 반영됩니다.</p></Detail>}</div>
}
export function Recording({ settings, notify }) {
  const [state, setState] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [consent, setConsent] = useState(false)
  useEffect(() => { if (state !== 'running') return; const timer = setInterval(() => setElapsed(previous => previous + 1), 1000); return () => clearInterval(timer) }, [state])
  const display = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`
  const start = () => { if (state === 'idle' || state === 'ended') setConsent(true); else setState(previous => previous === 'running' ? 'paused' : 'running') }
  return <div className={`content-columns recording-columns ${state === 'running' ? 'is-running' : ''}`}><section className="recording-card"><div className="recording-context"><span className="status-badge">{state === 'running' ? '미리보기 실행 중' : state === 'paused' ? '일시정지' : state === 'ended' ? '종료됨' : '대기 중'}</span><h2>국어 · 읽기 전략</h2><p>{classLabel(settings)} · <span className="mobile-only">오늘 3교시</span><span className="desktop-only">2026년 10월 14일 · 3교시</span></p></div><p className="recording-time" aria-live="off">{display}</p><p className="recording-caption">{state === 'idle' ? <><span className="mobile-only">녹음이 시작되면 시간이 표시돼요</span><span className="desktop-only">녹음 시작 전이에요</span></> : '조작 미리보기 · 실제 음성은 녹음되지 않아요'}</p><div className="waveform" aria-hidden="true">{[10, 16, 14, 24, 16, 28, 18, 30, 22, 18, 28, 14, 22, 26, 18, 14, 24, 18, 16, 22, 12, 18, 26, 14].map((height, i) => <span key={i} style={{ height, '--delay': `${i * 70}ms` }} />)}</div><p className="recording-permission mobile-only">마이크 권한을 허용하면 녹음을 시작할 수 있어요.</p><PrimaryButton className="recording-action" onClick={start}>{state === 'running' ? '일시정지' : state === 'paused' ? '계속하기' : '녹음 시작하기'}</PrimaryButton>{(state === 'running' || state === 'paused') && <button type="button" className="text-button" onClick={() => { setState('ended'); notify('조작 미리보기를 종료했어요. 음성 파일은 생성되지 않아요.') }}>미리보기 종료</button>}<p className="recording-after desktop-only">시작 후에는 일시정지와 종료를 선택할 수 있어요.</p></section><InfoPanel className="desktop-only recording-info" title="녹음 전 확인" lines={['참여자에게 녹음 사실을 알려 주세요', '학교의 녹음·보관 정책을 확인해요', '녹음된 내용은 필요한 범위에서만 사용해요']} />{consent && <Detail title="녹음 조작 미리보기" onClose={() => setConsent(false)} action={() => { setConsent(false); setElapsed(0); setState('running') }} actionLabel="조작 미리보기 시작"><p className="detail-copy">디자인 초안에 맞춘 조작 UI입니다. 마이크에 접근하거나 실제 음성을 녹음하지 않아요.</p></Detail>}</div>
}
export function Notifications({ notify }) {
  const [items, save] = useCollection('classroom-notifications', notificationSeed, notify)
  const [filter, setFilter] = useState('전체')
  const [detail, setDetail] = useState(null)
  const visible = filter === '최근 기록' ? items.filter(item => !item.read) : filter === '담당 학급' ? items.filter(item => ['review', 'timetable'].includes(item.id)) : items
  return <><Filters value={filter} onChange={setFilter} /><div className="content-columns"><div className="settings-list">{visible.map((item, i) => <ListRow key={item.id} className={i === 3 ? 'desktop-only' : ''} title={item.title} detail={item.detail} meta={item.meta} onClick={() => { save(items.map(next => next.id === item.id ? { ...next, read: true } : next)); setDetail(item) }} />)}{!visible.length && <p className="empty-state">확인할 새 알림이 없어요.</p>}</div><InfoPanel title="알림 설정" lines={['필요한 알림만 받아요', '읽은 알림은 보관함에서 다시 확인해요']} /></div>{detail && <Detail title={detail.title} onClose={() => setDetail(null)} action={detail.path ? () => navigate(detail.path) : undefined} actionLabel={detail.path ? '관련 기록 보기' : '확인'}><p className="detail-copy">{detail.detail}</p><p className="dialog-hint">{detail.meta}</p></Detail>}</>
}
