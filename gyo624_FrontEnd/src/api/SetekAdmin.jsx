import { useEffect, useState } from 'react'
import { Field, Modal, PrimaryButton } from '../components/ui'
import { deleteCurriculum, deleteStandard, deleteSubject, getPolicy, listCurricula, listStandards, listSubjects, saveCurriculum, savePolicy, saveStandard, saveSubject } from '../data/setek-store'
import { SCHOOL_LEVELS, SUBJECT_TYPES, emptyPolicy, schoolLevelLabel, subjectTypeLabel } from '../lib/setek'
import Setek from './Setek'

const emptyStandard = { code: '', category: '', content: '', source: '', sourceUrl: '' }

export default function SetekAdmin({ account, notify }) {
  const [tab, setTab] = useState('catalog')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [curricula, setCurricula] = useState([])
  const [policy, setPolicy] = useState(emptyPolicy)
  const [curriculumId, setCurriculumId] = useState('2022')
  const [schoolLevel, setSchoolLevel] = useState('high')
  const [subjectData, setSubjectData] = useState({ key: '', items: [], message: '' })
  const [subjectId, setSubjectId] = useState('')
  const [standardData, setStandardData] = useState({ key: '', items: [], message: '' })
  const [curriculumDraft, setCurriculumDraft] = useState({ name: '', year: '' })
  const [subjectDraft, setSubjectDraft] = useState({ name: '', subjectType: 'general' })
  const [standardDraft, setStandardDraft] = useState(emptyStandard)
  const [pending, setPending] = useState(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([listCurricula(), getPolicy()])
      .then(([items, nextPolicy]) => {
        if (!active) return
        setCurricula(items)
        setPolicy(nextPolicy)
        setStatus('ready')
      })
      .catch(loadError => { if (active) { setError(loadError.message); setStatus('error') } })
    return () => { active = false }
  }, [reloadTick])

  const subjectKey = curriculumId ? `${curriculumId}:${schoolLevel}:${reloadTick}` : ''
  const standardKey = subjectId ? `${subjectId}:${reloadTick}` : ''
  useEffect(() => {
    if (!subjectKey) return undefined
    let active = true
    listSubjects(curriculumId, schoolLevel)
      .then(items => { if (active) setSubjectData({ key: subjectKey, items, message: '' }) })
      .catch(loadError => { if (active) { setSubjectData({ key: subjectKey, items: [], message: loadError.message }); setError(loadError.message) } })
    return () => { active = false }
  }, [subjectKey, curriculumId, schoolLevel])
  useEffect(() => {
    if (!standardKey) return undefined
    let active = true
    listStandards(subjectId)
      .then(items => { if (active) setStandardData({ key: standardKey, items, message: '' }) })
      .catch(loadError => { if (active) { setStandardData({ key: standardKey, items: [], message: loadError.message }); setError(loadError.message) } })
    return () => { active = false }
  }, [standardKey, subjectId])

  const subjectsStatus = !subjectKey ? 'idle' : subjectData.key === subjectKey ? (subjectData.message ? 'error' : 'ready') : 'loading'
  const subjects = subjectData.key === subjectKey || subjectData.key.startsWith(`${curriculumId}:${schoolLevel}:`) ? subjectData.items : []
  const standardsStatus = !standardKey ? 'idle' : standardData.key === standardKey ? (standardData.message ? 'error' : 'ready') : 'loading'
  const standards = standardData.key === standardKey || (subjectId && standardData.key.startsWith(`${subjectId}:`)) ? standardData.items : []

  async function run(action, success) {
    setBusy(true)
    setError('')
    try {
      await action()
      setReloadTick(value => value + 1)
      if (success) notify(success)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  const selected = subjects.find(item => item.id === subjectId)
  return <section className="api-stack">
    <div className="setek-keywords" role="tablist" aria-label="교과세특 관리">
      <button type="button" className="setek-keyword" role="tab" aria-selected={tab === 'catalog'} onClick={() => setTab('catalog')}>자료 관리</button>
      <button type="button" className="setek-keyword" role="tab" aria-selected={tab === 'write'} onClick={() => setTab('write')}>세특 작성</button>
    </div>
    {tab === 'write' && <Setek account={account} notify={notify} />}
    {tab === 'catalog' && <>
      {status === 'loading' && <p role="status">자료를 불러오고 있어요.</p>}
      {error && <div className="api-error" role="alert"><p>{error}</p></div>}
      <section className="api-panel api-stack"><h2>분량 상한</h2><p className="dialog-hint">비워 두면 상한을 쓰지 않아요. 글자 수는 한글, 영문, 숫자, 공백, 문장부호를 포함하고, 바이트는 UTF-8입니다. 학교생활기록부 입력 프로그램과 단위가 다를 수 있어요.</p><Field label="단위" value={policy.unit} onChange={event => setPolicy({ ...policy, unit: event.target.value })}><option value="characters">글자 수</option><option value="bytes">바이트</option></Field>{SCHOOL_LEVELS.map(level => <Field key={level.id} label={`${level.label} 상한`} type="number" min={0} max={6000} value={policy[level.id] ? String(policy[level.id]) : ''} onChange={event => setPolicy({ ...policy, [level.id]: Number(event.target.value) || 0 })} />)}<Field label="안내 문구" value={policy.note} onChange={event => setPolicy({ ...policy, note: event.target.value })} /><PrimaryButton busy={busy} onClick={() => run(() => savePolicy(policy), '분량 상한을 저장했어요.')}>상한 저장</PrimaryButton></section>

      <section className="api-panel api-stack"><h2>교육과정</h2><p className="dialog-hint">2015 개정과 2022 개정은 기본값입니다. 학교에서 쓰는 다른 교육과정 이름만 추가하세요.</p><Field label="교육과정 이름" value={curriculumDraft.name} onChange={event => setCurriculumDraft({ ...curriculumDraft, name: event.target.value })} /><Field label="연도" type="number" min={1990} max={2100} value={curriculumDraft.year} onChange={event => setCurriculumDraft({ ...curriculumDraft, year: event.target.value })} /><PrimaryButton busy={busy} onClick={() => run(async () => { await saveCurriculum(curriculumDraft); setCurriculumDraft({ name: '', year: '' }) }, '교육과정을 추가했어요.')}>교육과정 추가</PrimaryButton><div className="api-stack">{curricula.map(item => <article className="setek-standard" key={item.id}><strong>{item.name}</strong><span className="dialog-hint"> {item.year || '연도 미입력'}{item.source === 'custom' ? ' · 학교에서 추가' : ''}</span>{item.source === 'custom' && <button type="button" className="text-button" onClick={() => setPending({ type: 'curriculum', id: item.id, label: item.name })}>삭제</button>}</article>)}</div></section>

      <section className="api-panel api-stack"><h2>과목</h2><Field label="교육과정" value={curriculumId} onChange={event => { setCurriculumId(event.target.value); setSubjectId('') }}>{curricula.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Field><Field label="학교급" value={schoolLevel} onChange={event => { setSchoolLevel(event.target.value); setSubjectId('') }}>{SCHOOL_LEVELS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Field><Field label="과목명" value={subjectDraft.name} onChange={event => setSubjectDraft({ ...subjectDraft, name: event.target.value })} /><Field label="과목 구분" value={subjectDraft.subjectType} onChange={event => setSubjectDraft({ ...subjectDraft, subjectType: event.target.value })}>{SUBJECT_TYPES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Field><PrimaryButton busy={busy} onClick={() => run(async () => { await saveSubject({ ...subjectDraft, curriculumId, schoolLevel }); setSubjectDraft({ name: '', subjectType: subjectDraft.subjectType }) }, '과목을 추가했어요.')}>과목 추가</PrimaryButton>{subjectsStatus === 'loading' && <p role="status">과목을 불러오고 있어요.</p>}{subjectsStatus === 'ready' && subjects.length === 0 && <p className="dialog-hint">등록된 과목이 없어요.</p>}{subjects.map(item => <article className="setek-standard" key={item.id}><button type="button" className="text-button" aria-pressed={subjectId === item.id} onClick={() => setSubjectId(item.id)}>{item.name}</button><span className="dialog-hint"> {subjectTypeLabel(item.subjectType)} · {schoolLevelLabel(item.schoolLevel)}</span><button type="button" className="text-button" onClick={() => setPending({ type: 'subject', id: item.id, label: item.name })}>삭제</button></article>)}</section>

      <section className="api-panel api-stack"><h2>성취기준</h2>{!selected && <p className="dialog-hint">과목을 선택하면 성취기준을 등록할 수 있어요. 출처가 확인된 내용만 등록해 주세요.</p>}{selected && <>
        <p className="dialog-hint">{selected.name} 성취기준. 출처를 적지 않으면 등록되지 않고, 없는 항목은 교사 화면에서 미등록으로 보여요.</p>
        <Field label="코드" value={standardDraft.code} onChange={event => setStandardDraft({ ...standardDraft, code: event.target.value })} />
        <Field label="영역" value={standardDraft.category} onChange={event => setStandardDraft({ ...standardDraft, category: event.target.value })} />
        <Field label="성취기준 내용" multiline value={standardDraft.content} onChange={event => setStandardDraft({ ...standardDraft, content: event.target.value })} />
        <Field label="출처" value={standardDraft.source} onChange={event => setStandardDraft({ ...standardDraft, source: event.target.value })} />
        <Field label="출처 주소" value={standardDraft.sourceUrl} onChange={event => setStandardDraft({ ...standardDraft, sourceUrl: event.target.value })} />
        <PrimaryButton busy={busy} onClick={() => run(async () => { await saveStandard({ ...standardDraft, subjectId }); setStandardDraft(emptyStandard) }, '성취기준을 추가했어요.')}>성취기준 추가</PrimaryButton>
        {standardsStatus === 'loading' && <p role="status">성취기준을 불러오고 있어요.</p>}
        {standardsStatus === 'ready' && standards.length === 0 && <p className="dialog-hint">미등록. 이 과목에는 아직 성취기준이 없어요.</p>}
        {standards.map(item => <article className="api-panel" key={item.id}><h3>{item.code}{item.category ? ` · ${item.category}` : ''}</h3><p>{item.content}</p><p className="dialog-hint">출처: {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a> : item.source}</p><button type="button" className="text-button" onClick={() => setPending({ type: 'standard', id: item.id, label: item.code })}>삭제</button></article>)}
      </>}</section>
    </>}
    {pending && <Modal title="자료를 삭제할까요?" onClose={() => setPending(null)}><p>{pending.label} 자료를 삭제합니다.</p><div className="exchange-actions"><PrimaryButton busy={busy} onClick={() => run(async () => {
      if (pending.type === 'curriculum') await deleteCurriculum(pending.id)
      if (pending.type === 'subject') { await deleteSubject(pending.id); if (pending.id === subjectId) setSubjectId('') }
      if (pending.type === 'standard') await deleteStandard(pending.id)
      setPending(null)
    }, '삭제했어요.')}>삭제</PrimaryButton><button type="button" className="secondary-button" onClick={() => setPending(null)}>취소</button></div></Modal>}
  </section>
}
