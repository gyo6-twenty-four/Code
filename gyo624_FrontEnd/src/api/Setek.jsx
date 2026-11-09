import { useEffect, useMemo, useRef, useState } from 'react'
import { Field, Modal, PrimaryButton } from '../components/ui'
import { WritingPane, WritingWorkspace } from '../components/WritingWorkspace'
import { coursesFrom, loadCurriculumCatalog, standardsFrom } from '../data/curriculum-catalog'
import { deleteDraft, getPolicy, listCurricula, listDrafts, listStandards, saveDraft } from '../data/setek-store'
import {
  GROWTH_FIELDS,
  LESSON_FIELDS,
  SCHOOL_LEVELS,
  STEPS,
  STUDENT_FIELDS,
  TRAITS,
  adjacentStep,
  advanceError,
  combineStandards,
  emptyForm,
  emptyPolicy,
  filterStandards,
  pageWindow,
  fromDraft,
  generationError,
  lengthPlan,
  lengthPresets,
  payloadFromForm,
  schoolLevelLabel,
  subjectTypeLabel,
  textSize,
  toDraftRecord,
  validateGenerationPayload,
} from '../lib/setek'
import { generateSetek, setekStatus } from './setek-client'

const sessionKey = id => `education24-setek-form-v1:${id}`
const noRows = []
const inputSteps = STEPS.filter(item => item.id !== 'result')

function readSession(id) {
  if (!id || !globalThis.sessionStorage) return null
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey(id)) || 'null')
  } catch {
    sessionStorage.removeItem(sessionKey(id))
    return null
  }
}

function restoreForm(saved) {
  const base = emptyForm()
  if (!saved?.form) return base
  return {
    ...base,
    ...saved.form,
    lesson: { ...base.lesson, ...(saved.form.lesson || {}) },
    student: { ...base.student, ...(saved.form.student || {}) },
    growth: { ...base.growth, ...(saved.form.growth || {}) },
    standardIds: Array.isArray(saved.form.standardIds) ? saved.form.standardIds : [],
    traits: Array.isArray(saved.form.traits) ? saved.form.traits : [],
  }
}

function studentInput(value) {
  return value.traits.length > 0 || String(value.traitNote || '').trim().length > 0 || Object.values(value.student).some(item => String(item || '').trim())
}

function ChoiceGroup({ label, children }) {
  return <div className="setek-choices" role="group" aria-label={label}>{children}</div>
}

function ListPager({ label, page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return <nav className="api-pagination" aria-label={label}><button type="button" className="secondary-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>이전 페이지</button><span>{page} / {totalPages}</span><button type="button" className="secondary-button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>다음 페이지</button></nav>
}

function FieldGroup({ title, hint, fields, values, onChange }) {
  return <section className="api-stack"><h2>{title}</h2>{hint && <p className="dialog-hint">{hint}</p>}{fields.map(([key, label]) => <Field key={key} label={label} multiline value={values[key] || ''} onChange={event => onChange(key, event.target.value)} />)}</section>
}

export default function Setek({ account, notify }) {
  const resultRef = useRef(null)
  const [session] = useState(() => readSession(account?.id))
  const [form, setForm] = useState(() => restoreForm(session))
  const [step, setStep] = useState(() => {
    const saved = session?.step === 'result' || session?.step === 'student' ? 'growth' : session?.step
    return inputSteps.some(item => item.id === saved) ? saved : 'curriculum'
  })
  const [studentOpen, setStudentOpen] = useState(() => studentInput(restoreForm(session)) || session?.step === 'student')
  const [resultText, setResultText] = useState(() => session?.resultText || '')
  const [baseline, setBaseline] = useState(() => session?.baseline || '')
  const [reviewNotes, setReviewNotes] = useState(() => Array.isArray(session?.reviewNotes) ? session.reviewNotes.filter(item => typeof item === 'string') : [])
  const [draftId, setDraftId] = useState(() => session?.draftId || '')
  const [createdAt, setCreatedAt] = useState(() => session?.createdAt || '')
  const [snapshots, setSnapshots] = useState(() => Array.isArray(session?.snapshots) ? session.snapshots : [])
  const [savedRecord, setSavedRecord] = useState(null)
  const [curricula, setCurricula] = useState([])
  const [policy, setPolicy] = useState(emptyPolicy)
  const [subjectData, setSubjectData] = useState({ key: '', items: [], message: '' })
  const [standardData, setStandardData] = useState({ key: '', items: [], message: '' })
  const [standardsTick, setStandardsTick] = useState(0)
  const [subjectsTick, setSubjectsTick] = useState(0)
  const [drafts, setDrafts] = useState([])
  const [showDrafts, setShowDrafts] = useState(false)
  const [subjectQuery, setSubjectQuery] = useState('')
  const [subjectPage, setSubjectPage] = useState(1)
  const [standardQuery, setStandardQuery] = useState('')
  const [standardPage, setStandardPage] = useState(1)
  const [aiStatus, setAiStatus] = useState('unknown')
  const [aiError, setAiError] = useState('')
  const [stepError, setStepError] = useState('')
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!account?.id) return
    sessionStorage.setItem(sessionKey(account.id), JSON.stringify({ form, step, resultText, baseline, reviewNotes, draftId, createdAt, snapshots }))
  }, [account?.id, form, step, resultText, baseline, reviewNotes, draftId, createdAt, snapshots])

  useEffect(() => {
    let active = true
    Promise.all([listCurricula(), getPolicy(), listDrafts()])
      .then(([nextCurricula, nextPolicy, nextDrafts]) => {
        if (!active) return
        setCurricula(nextCurricula)
        setPolicy(nextPolicy)
        setDrafts(nextDrafts)
      })
      .catch(loadError => { if (active) setError(loadError.message) })
    setekStatus()
      .then(data => { if (active) setAiStatus(data.configured ? 'ready' : 'missing') })
      .catch(loadError => { if (active) { setAiStatus('error'); setAiError(loadError.message) } })
    return () => { active = false }
  }, [])

  const subjectScope = `${form.curriculumId}:${form.schoolLevel}`
  const subjectKey = form.curriculumId && form.schoolLevel ? `${subjectScope}:${subjectsTick}` : ''
  const standardKey = form.subjectId ? `${form.subjectId}:${standardsTick}` : ''
  useEffect(() => {
    if (!subjectKey) return undefined
    if (form.curriculumId !== '2022') {
      setSubjectData({ key: subjectKey, items: [], message: '2022 개정 교육과정을 선택하면 과목 목록을 불러와요.' })
      return undefined
    }
    let active = true
    loadCurriculumCatalog()
      .then(catalog => { if (active) setSubjectData({ key: subjectKey, items: coursesFrom(catalog, form.schoolLevel), message: '' }) })
      .catch(() => { if (active) setSubjectData({ key: subjectKey, items: [], message: '과목 목록을 불러오지 못했어요.' }) })
    return () => { active = false }
  }, [subjectKey, form.curriculumId, form.schoolLevel])
  useEffect(() => {
    if (!standardKey) return undefined
    if (String(form.subjectId).startsWith('2022:')) {
      let active = true
      loadCurriculumCatalog()
        .then(catalog => { if (active) setStandardData({ key: standardKey, items: standardsFrom(catalog, form.subjectId), message: '' }) })
        .catch(() => { if (active) setStandardData({ key: standardKey, items: [], message: '성취기준을 불러오지 못했어요.' }) })
      return () => { active = false }
    }
    let active = true
    listStandards(form.subjectId)
      .then(items => { if (active) setStandardData({ key: standardKey, items, message: '' }) })
      .catch(loadError => { if (active) setStandardData({ key: standardKey, items: [], message: loadError.message }) })
    return () => { active = false }
  }, [standardKey, form.subjectId])

  const subjectsStatus = !subjectKey ? 'idle' : subjectData.key === subjectKey ? (subjectData.message ? 'error' : 'ready') : 'loading'
  const subjects = subjectData.key === subjectKey || subjectData.key.startsWith(`${subjectScope}:`) ? subjectData.items : noRows
  const subjectsMessage = subjectData.key === subjectKey ? subjectData.message : ''
  const standardsStatus = !standardKey ? 'idle' : standardData.key === standardKey ? (standardData.message ? 'error' : 'ready') : 'loading'
  const standards = standardData.key === standardKey || (form.subjectId && standardData.key.startsWith(`${form.subjectId}:`)) ? standardData.items : noRows
  const standardsMessage = standardData.key === standardKey ? standardData.message : ''

  const curriculum = curricula.find(item => item.id === form.curriculumId)
  const listedSubject = subjects.find(item => item.id === form.subjectId)
  const subject = listedSubject || (savedRecord?.subjectId === form.subjectId ? { id: savedRecord.subjectId, name: savedRecord.subjectName, subjectType: savedRecord.subjectType } : null)
  const visibleStandards = useMemo(() => combineStandards(standards, snapshots, form.standardIds), [standards, snapshots, form.standardIds])
  const meta = { subjectsStatus, subjectsMessage, subjectCount: subjects.length, standardsStatus, policy }
  const plan = lengthPlan(form, policy)
  const filteredSubjects = subjects.filter(item => `${item.name} ${subjectTypeLabel(item.subjectType)}`.toLocaleLowerCase().includes(subjectQuery.trim().toLocaleLowerCase()))
  const filteredStandards = filterStandards(visibleStandards, standardQuery)
  const subjectWindow = pageWindow(filteredSubjects, subjectPage)
  const standardWindow = pageWindow(filteredStandards, standardPage)
  const size = textSize(resultText)
  const activeCount = plan.unit === 'bytes' ? size.bytes : size.characters
  const overLimit = Boolean(resultText) && plan.target > 0 && activeCount > plan.target
  const edited = Boolean(resultText.trim()) && resultText !== baseline
  const stepIndex = STEPS.findIndex(item => item.id === step)

  function clearMessages() {
    setStepError('')
    setError('')
  }
  function patch(partial) {
    clearMessages()
    setForm(current => ({ ...current, ...partial }))
  }
  function patchGroup(group, key, value) {
    clearMessages()
    setForm(current => ({ ...current, [group]: { ...current[group], [key]: value } }))
  }
  function toggleTrait(id) {
    clearMessages()
    setForm(current => ({ ...current, traits: current.traits.includes(id) ? current.traits.filter(item => item !== id) : [...current.traits, id] }))
  }
  function toggleStandard(id) {
    if (!form.standardIds.includes(id) && form.standardIds.length >= 12) {
      setStepError('성취기준은 12개까지 선택할 수 있어요.')
      return
    }
    clearMessages()
    setForm(current => ({ ...current, standardIds: current.standardIds.includes(id) ? current.standardIds.filter(item => item !== id) : [...current.standardIds, id] }))
  }
  function next() {
    const message = advanceError(step, form, meta)
    if (message) { setStepError(message); return }
    setStepError('')
    setStep(adjacentStep(step, 1))
  }
  function openDraft(record) {
    const restored = fromDraft(record)
    setForm(restored.form)
    setResultText(restored.resultText)
    setBaseline(restored.baseline)
    setReviewNotes([])
    setSnapshots(restored.snapshots)
    setDraftId(record.id)
    setCreatedAt(restored.createdAt)
    setSavedRecord(record)
    setStudentOpen(studentInput(restored.form))
    setStep(restored.resultText ? 'growth' : 'lesson')
    setShowDrafts(false)
    clearMessages()
  }
  function resetWriting() {
    setForm(emptyForm())
    setStep('curriculum')
    setResultText('')
    setBaseline('')
    setReviewNotes([])
    setDraftId('')
    setCreatedAt('')
    setSnapshots([])
    setSavedRecord(null)
    setStudentOpen(false)
    setConfirm(null)
    clearMessages()
  }
  async function runGenerate(mode) {
    if (generating) return
    const message = generationError(form, meta)
    if (message) { setStepError(message); return }
    if (aiStatus === 'missing') { setError('자동 초안 생성을 지금 사용할 수 없어요. 결과란에 직접 작성할 수 있어요.'); return }
    if (edited && confirm?.type !== mode) { setConfirm({ type: mode }); return }
    setConfirm(null)
    setGenerating(true)
    setError('')
    try {
      const payload = payloadFromForm(form, { curriculum, subject, standards: visibleStandards, policy }, { mode, previousContent: mode === 'shorten' ? resultText : '' })
      const validated = validateGenerationPayload(payload)
      if (!validated.ok) { setError(validated.message); return }
      const result = await generateSetek(validated.value)
      const notes = Array.isArray(result.reviewNotes) ? result.reviewNotes.filter(item => typeof item === 'string' && item.trim()) : []
      setReviewNotes(notes)
      if (result.content) {
        setResultText(result.content)
        setBaseline(result.content)
        notify('초안이 생성됐어요. 나이스에 그대로 붙이지 말고 확인한 뒤 고쳐 주세요.')
      } else {
        setError('기재할 수 있는 내용이 없어 초안을 만들지 않았어요. 교사 확인을 봐 주세요.')
      }
      if (window.matchMedia('(max-width: 1050px)').matches) resultRef.current?.scrollIntoView({ block: 'center' })
    } catch (generateError) {
      setError(generateError.message)
    } finally {
      setGenerating(false)
    }
  }
  async function save() {
    if (!form.curriculumId || !form.schoolLevel || !form.subjectId) { setError('교육과정, 학교급, 과목을 선택한 뒤 저장할 수 있어요.'); return }
    if (Array.from(resultText).length > 8000) { setError('결과가 너무 길어 저장할 수 없어요. 내용을 줄여 주세요.'); return }
    setBusy(true)
    setError('')
    try {
      const record = toDraftRecord(form, { curriculum, subject, standards: visibleStandards, policy, baseline, resultText }, { ...savedRecord, createdAt })
      const saved = await saveDraft(record, draftId)
      setDraftId(saved.id)
      setCreatedAt(saved.createdAt)
      setSavedRecord(saved)
      setDrafts(await listDrafts())
      notify('교과세특 초안을 저장했어요.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }
  async function copyResult() {
    try {
      await navigator.clipboard.writeText(resultText)
      notify('교과세특을 복사했어요.')
    } catch {
      setError('클립보드에 복사하지 못했어요. 결과 글을 선택한 뒤 직접 복사해 주세요.')
    }
  }
  async function removeDraft() {
    setBusy(true)
    try {
      await deleteDraft(confirm.id)
      if (confirm.id === draftId) resetWriting()
      setDrafts(await listDrafts())
      setConfirm(null)
      notify('초안을 삭제했어요.')
    } catch (deleteError) {
      setError(deleteError.message)
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  const summary = [curriculum?.name, schoolLevelLabel(form.schoolLevel), subject?.name].filter(Boolean).join(' · ')
  return <section className="api-stack setek">

    {aiStatus === 'missing' && <div className="api-error" role="status"><p>자동 초안 생성을 지금 사용할 수 없어요. 직접 작성하고 저장할 수 있어요.</p></div>}
    {aiStatus === 'error' && <div className="api-error" role="alert"><p>{aiError}</p></div>}

    <div className="writing-metadata"><p>{summary || '교육과정과 과목을 선택해 작성하세요.'}</p><div className="exchange-actions"><button type="button" className="text-button" disabled={generating || busy} aria-expanded={showDrafts} onClick={() => setShowDrafts(value => !value)}>저장된 초안 {drafts.length}</button>{(form.curriculumId || resultText) && <button type="button" className="text-button" disabled={generating || busy} onClick={() => setConfirm({ type: 'reset' })}>새로 작성</button>}</div></div>
    {showDrafts && <div className="api-stack">{drafts.length === 0 && <p className="dialog-hint">저장된 초안이 없어요.</p>}{drafts.map(item => <article className="api-panel" key={item.id}><h3>{item.subjectName || '과목 미지정'}</h3><p>{item.curriculumName} · {schoolLevelLabel(item.schoolLevel)} · {textSize(item.editedContent || '').characters}자</p><div className="exchange-actions"><button type="button" className="secondary-button" disabled={generating || busy} onClick={() => openDraft(item)}>이어서 작성</button><button type="button" className="text-button" disabled={generating || busy} onClick={() => setConfirm({ type: 'delete', id: item.id })}>삭제</button></div></article>)}</div>}
    <WritingWorkspace
      source={<WritingPane variant="source" title="작성 자료" description="수업 활동과 학생의 변화에서 확인한 사실을 입력하세요.">
        <fieldset className="writing-input-lock" disabled={generating || busy} aria-label="초안 입력 자료">
          <ol className="setek-steps">{inputSteps.map((item, index) => <li key={item.id}><button type="button" className={`setek-step${item.id === step ? ' is-current' : ''}${index < stepIndex ? ' is-done' : ''}`} aria-current={item.id === step ? 'step' : undefined} disabled={index > stepIndex} onClick={() => { if (index <= stepIndex) { setStep(item.id); setStepError('') } }}>{index + 1}. {item.label}</button></li>)}</ol>
          {step === 'curriculum' && <section className="api-panel api-stack"><h2>교육과정</h2><ChoiceGroup label="교육과정">{curricula.map(item => <button type="button" key={item.id} className="setek-choice" aria-pressed={form.curriculumId === item.id} onClick={() => { setSnapshots([]); setSubjectPage(1); setStandardPage(1); patch({ curriculumId: item.id, subjectId: '', standardIds: [] }) }}><strong>{item.name}</strong><span>{item.year ? `${item.year}년` : '연도 미입력'}{item.source === 'custom' ? ' · 학교에서 추가' : ''}</span></button>)}</ChoiceGroup></section>}

          {step === 'school' && <section className="api-panel api-stack"><h2>학교급</h2><ChoiceGroup label="학교급">{SCHOOL_LEVELS.map(item => <button type="button" key={item.id} className="setek-choice" aria-pressed={form.schoolLevel === item.id} onClick={() => { setSnapshots([]); setSubjectPage(1); setStandardPage(1); patch({ schoolLevel: item.id, subjectId: '', standardIds: [] }) }}><strong>{item.label}</strong></button>)}</ChoiceGroup></section>}

          {step === 'subject' && <section className="api-panel api-stack"><h2>과목</h2>{subjectsStatus === 'loading' && <p role="status">과목을 불러오고 있어요.</p>}{subjectsStatus === 'error' && <div className="api-error" role="alert"><p>{subjectsMessage}</p><button type="button" className="secondary-button" onClick={() => setSubjectsTick(value => value + 1)}>다시 불러오기</button></div>}{subjectsStatus === 'ready' && subjects.length === 0 && <p className="dialog-hint">{subjectsMessage || '이 교육과정의 과목을 찾지 못했어요.'}</p>}{subjects.length > 0 && <Field label="과목 검색" value={subjectQuery} onChange={event => { setSubjectQuery(event.target.value); setSubjectPage(1) }} />}{subjectWindow.items.map(item => <button type="button" key={item.id} className="setek-choice" aria-pressed={form.subjectId === item.id} onClick={() => { setSnapshots([]); setStandardPage(1); patch({ subjectId: item.id, standardIds: [] }) }}><strong>{item.name}</strong><span>{item.group || subjectTypeLabel(item.subjectType)}</span></button>)}{subjects.length > 0 && filteredSubjects.length === 0 && <p className="dialog-hint">검색 결과가 없어요.</p>}<ListPager label="과목 페이지" page={subjectWindow.page} totalPages={subjectWindow.totalPages} onPage={setSubjectPage} /></section>}

          {step === 'standards' && <section className="api-panel api-stack"><h2>성취기준</h2><p className="dialog-hint">여러 개를 고를 수 있어요. 등록되지 않은 과목은 미등록으로 두고, 활동 내용만으로 다음 단계로 갈 수 있어요.</p>{standardsStatus === 'loading' && <p role="status">성취기준을 불러오고 있어요.</p>}{standardsStatus === 'error' && <div className="api-error" role="alert"><p>{standardsMessage}</p><button type="button" className="secondary-button" onClick={() => setStandardsTick(value => value + 1)}>다시 불러오기</button></div>}{standardsStatus === 'ready' && standards.length === 0 && <p className="dialog-hint">이 과목의 성취기준은 미등록 상태예요. 코드를 임의로 만들어 넣지 않아요.</p>}{visibleStandards.length > 0 && <Field label="성취기준 검색" value={standardQuery} onChange={event => { setStandardQuery(event.target.value); setStandardPage(1) }} />}{standardWindow.items.map(item => <div className="setek-standard" key={item.id}><label className="api-check"><input type="checkbox" checked={form.standardIds.includes(item.id)} onChange={() => toggleStandard(item.id)} /><span><strong>{item.code}</strong>{item.category ? ` · ${item.category}` : ''}{item.archived ? ' · 저장된 기준' : ''}<br />{item.content}</span></label>{item.source && <p className="dialog-hint">출처: {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a> : item.source}</p>}</div>)}{visibleStandards.length > 0 && filteredStandards.length === 0 && <p className="dialog-hint">검색 결과가 없어요.</p>}<ListPager label="성취기준 페이지" page={standardWindow.page} totalPages={standardWindow.totalPages} onPage={setStandardPage} /><p className="dialog-hint">선택 {form.standardIds.length}개{standardWindow.total > standardWindow.items.length ? ` · 전체 ${standardWindow.total}개` : ''}</p></section>}

          {step === 'lesson' && <section className="api-panel"><FieldGroup title="수업 활동" hint="실제로 진행한 내용만 적어 주세요. 비워 둔 항목은 생성에 들어가지 않아요." fields={LESSON_FIELDS} values={form.lesson} onChange={(key, value) => patchGroup('lesson', key, value)} /></section>}

          {step === 'growth' && <section className="api-panel api-stack"><div><button type="button" className="text-button" aria-expanded={studentOpen} onClick={() => setStudentOpen(value => !value)}>{studentOpen ? '학생 활동 접기' : '학생 활동 추가'}</button><p className="dialog-hint">학생별 내용이 없어도 수업 활동만으로 초안을 만들 수 있어요.</p></div>{studentOpen && <><FieldGroup title="학생의 개별 활동" hint="학생 이름, 학번, 연락처, 이메일은 입력하지 마세요. AI에는 활동 내용만 전달됩니다." fields={STUDENT_FIELDS} values={form.student} onChange={(key, value) => patchGroup('student', key, value)} /><div><h2>학생의 학습 특성</h2><p className="dialog-hint">해당하는 키워드를 고르거나, 관찰한 내용을 직접 적을 수 있어요. 키워드만으로는 생성하지 않아요.</p><div className="setek-keywords" role="group" aria-label="학생의 학습 특성">{TRAITS.map(([id, label]) => <button type="button" key={id} className="setek-keyword" aria-pressed={form.traits.includes(id)} onClick={() => toggleTrait(id)}>{label}</button>)}</div></div><Field label="학습 특성 메모" multiline value={form.traitNote} onChange={event => patch({ traitNote: event.target.value })} /></>}<FieldGroup title="성장 및 발전" fields={GROWTH_FIELDS} values={form.growth} onChange={(key, value) => patchGroup('growth', key, value)} /><Field label="교사의 추가 요청" multiline value={form.teacherRequest} onChange={event => patch({ teacherRequest: event.target.value })} /><div><h2>희망 분량</h2><p className="dialog-hint">{plan.unit === 'bytes' ? '바이트는 한글 1자 3바이트, 영문·숫자·엔터 1바이트입니다.' : '글자 수는 한글, 영문, 숫자, 공백, 문장부호를 모두 포함합니다. 나이스 입력란은 바이트로, 한글 1자는 3바이트, 영문·숫자·엔터는 1바이트입니다.'} 고등학교 과목별 세특의 공식 상한은 500자이고, 1·2학년 공통과목은 1·2를 합산합니다. 학교급 상한은 관리자가 바꿀 수 있어요.{policy.note ? ` ${policy.note}` : ''}</p><div className="setek-keywords" role="group" aria-label="희망 분량">{lengthPresets(plan.unit).map(value => <button type="button" key={value} className="setek-keyword" aria-pressed={form.lengthMode === String(value)} disabled={plan.cap > 0 && value > plan.cap} onClick={() => patch({ lengthMode: String(value) })}>{value}{plan.unitLabel}</button>)}<button type="button" className="setek-keyword" aria-pressed={form.lengthMode === 'custom'} onClick={() => patch({ lengthMode: 'custom' })}>직접 입력</button></div>{form.lengthMode === 'custom' && <Field label={plan.unit === 'bytes' ? '직접 입력 바이트' : '직접 입력 글자 수'} type="number" min={plan.bounds.min} max={plan.cap > 0 ? Math.min(plan.cap, plan.bounds.max) : plan.bounds.max} value={form.customLength} onChange={event => patch({ customLength: event.target.value })} />}</div></section>}

        {stepError && <p className="field-error" role="alert">{stepError}</p>}
        <div className="setek-nav">
          {step !== 'curriculum' && <button type="button" className="secondary-button" onClick={() => { setStep(adjacentStep(step, -1)); setStepError('') }}>이전</button>}
          {step !== 'growth' && <PrimaryButton onClick={next}>다음</PrimaryButton>}
          {step === 'growth' && <PrimaryButton busy={generating} disabled={aiStatus === 'missing' || aiStatus === 'error'} onClick={() => runGenerate('draft')}>{baseline ? '다시 생성' : '초안 생성'}</PrimaryButton>}
        </div>
        </fieldset>
      </WritingPane>}
      result={<WritingPane variant="result" title="세특 초안" description="생성된 초안입니다. 나이스에 그대로 붙이지 말고, 수업에서 본 사실과 맞는지 확인한 뒤 고치세요."
        actions={<button type="button" className="secondary-button" disabled={!resultText.trim() || generating} onClick={copyResult}>복사</button>}
        footer={<>
          <p className={`setek-count${overLimit ? ' is-over' : ''}`}>{size.characters}자 · {size.bytes}바이트{plan.target ? ` / 목표 ${plan.target}${plan.unitLabel}` : ''}</p>
          <PrimaryButton busy={busy} disabled={generating || !form.subjectId} onClick={save}>{resultText.trim() ? '초안 저장' : '입력 저장'}</PrimaryButton>
        </>}>
        <div className="field">
          <label htmlFor="setek-result">세부능력 및 특기사항</label>
          <textarea ref={resultRef} id="setek-result" className="field-input setek-result writing-text" rows={12} readOnly={generating || busy} value={resultText} placeholder="작성 자료를 입력해 초안을 생성하거나 여기에 직접 작성하세요." onChange={event => { setResultText(event.target.value); setReviewNotes([]); setError('') }} />
        </div>
        {reviewNotes.length > 0 && <div className="writing-check"><p>교사 확인</p><ul>{reviewNotes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul><p className="dialog-hint">결과란에는 초안 본문만 있습니다. 나이스에 그대로 붙이지 마세요.</p></div>}
        {generating && <p className="dialog-hint" role="status">입력한 자료를 바탕으로 초안을 작성하고 있어요.</p>}
        {overLimit && <div className="writing-check"><p>목표 분량을 넘었어요.</p><button type="button" className="secondary-button" disabled={generating || busy || aiStatus === 'missing' || aiStatus === 'error'} onClick={() => runGenerate('shorten')}>분량에 맞춰 다시 작성</button></div>}
      </WritingPane>}
    />
    {error && <div className="api-error" role="alert"><p>{error}</p></div>}

    {(confirm?.type === 'draft' || confirm?.type === 'shorten') && <Modal title="초안을 다시 쓸까요?" onClose={() => setConfirm(null)}><p>수정한 결과가 새 초안으로 바뀝니다. 입력한 수업 활동과 성취기준은 그대로 남아요.</p><div className="exchange-actions"><PrimaryButton busy={generating} onClick={() => runGenerate(confirm.type)}>{confirm.type === 'shorten' ? '분량에 맞춰 다시 작성' : '다시 생성'}</PrimaryButton><button type="button" className="secondary-button" onClick={() => setConfirm(null)}>취소</button></div></Modal>}
    {confirm?.type === 'delete' && <Modal title="초안을 삭제할까요?" onClose={() => setConfirm(null)}><p>삭제한 초안은 다시 볼 수 없어요.</p><div className="exchange-actions"><PrimaryButton busy={busy} onClick={removeDraft}>삭제</PrimaryButton><button type="button" className="secondary-button" onClick={() => setConfirm(null)}>취소</button></div></Modal>}
    {confirm?.type === 'reset' && <Modal title="새로 작성할까요?" onClose={() => setConfirm(null)}><p>이 화면에 입력한 내용과 결과 글이 비워집니다. 저장하지 않은 내용은 남지 않아요.</p><div className="exchange-actions"><PrimaryButton onClick={resetWriting}>비우고 새로 작성</PrimaryButton><button type="button" className="secondary-button" onClick={() => setConfirm(null)}>취소</button></div></Modal>}
  </section>
}
