import { useEffect, useState } from 'react'
import { Field } from '../components/ui'
import { coursesFrom, loadCurriculumCatalog } from '../data/curriculum-catalog'
import { classNameFromId, listsMessage, listsReady, readTeaching, schoolLevelFromKind, schoolYearOf, subjectNameFromId, teachingError } from '../lib/teaching'
import { useMutation, useResource } from './hooks'
import { loadClasses } from './neis'
import { ApiState, SaveButton } from './shared'

function toggleId(ids, id) {
  return ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]
}

function savedClasses(items, ids) {
  const known = new Set(items.map(item => item.id))
  return [
    ...items,
    ...ids.filter(id => id && !known.has(id)).map(id => {
      const match = String(id).match(/^neis:(\d+):/)
      return { id, name: classNameFromId(id), grade: match ? Number(match[1]) : 0 }
    }),
  ]
}

export function TeachingFields({ school, value, onChange, onStatus }) {
  const [classData, setClassData] = useState({ key: '', status: 'ready', items: [], message: '' })
  const [subjectData, setSubjectData] = useState({ key: '', status: 'ready', items: [], message: '' })
  const [query, setQuery] = useState('')
  const [classTick, setClassTick] = useState(0)
  const [subjectTick, setSubjectTick] = useState(0)
  const [levelOverride, setLevelOverride] = useState('')
  const foundLevel = schoolLevelFromKind(school?.kind)
  const detectedLevel = foundLevel === 'middle' || foundLevel === 'high' ? foundLevel : ''
  const level = detectedLevel || levelOverride
  const year = schoolYearOf()
  const classKey = school?.officeCode && school?.schoolCode ? `${school.officeCode}:${school.schoolCode}:${year}:${classTick}` : ''
  const subjectKey = level ? `${level}:${subjectTick}` : ''

  useEffect(() => {
    if (!classKey) return undefined
    let active = true
    loadClasses(school, year)
      .then(items => { if (active) setClassData({ key: classKey, status: 'ready', items, message: items.length ? '' : '이 학교의 학급을 찾지 못했어요.' }) })
      .catch(error => { if (active) setClassData({ key: classKey, status: 'error', items: [], message: error.message || '학급 목록을 불러오지 못했어요.' }) })
    return () => { active = false }
  }, [classKey, school, year])

  useEffect(() => {
    if (!subjectKey) return undefined
    let active = true
    loadCurriculumCatalog()
      .then(catalog => {
        if (!active) return
        const items = coursesFrom(catalog, level).slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        setSubjectData({ key: subjectKey, status: 'ready', items, message: items.length ? '' : '이 학교급의 과목을 찾지 못했어요.' })
      })
      .catch(() => { if (active) setSubjectData({ key: subjectKey, status: 'error', items: [], message: '과목 목록을 불러오지 못했어요.' }) })
    return () => { active = false }
  }, [subjectKey, level])

  const classes = {
    status: !classKey ? 'idle' : classData.key === classKey ? classData.status : 'loading',
    items: classData.key === classKey ? classData.items : [],
    message: classData.key === classKey ? classData.message : '',
  }
  const subjects = {
    status: !level ? 'error' : subjectData.key === subjectKey ? subjectData.status : 'loading',
    items: subjectData.key === subjectKey ? subjectData.items : [],
    message: !level ? '학교 종류를 고르면 과목 목록을 불러와요.' : subjectData.key === subjectKey ? subjectData.message : '',
  }

  useEffect(() => {
    onStatus?.({ classes: classes.status, subjects: subjects.status })
  }, [classes.status, subjects.status, onStatus])

  const classItems = savedClasses(classes.items, [...new Set([...value.teachingClassIds, value.homeroomClassId].filter(Boolean))])
  const grades = [...new Set(classItems.map(item => item.grade || 0))].sort((a, b) => a - b)
  const filteredSubjects = subjects.items.filter(item => `${item.name} ${item.group || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const knownSubjects = new Set(subjects.items.map(item => item.id))
  const extraSubjects = value.subjectIds.filter(id => !knownSubjects.has(id))

  return <div className="api-stack">
    <Field label="담임 학급" value={value.homeroomClassId} onChange={event => onChange({ ...value, homeroomClassId: event.target.value })}>
      <option value="">담임이 아니에요</option>
      {classItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </Field>
    <p className="dialog-hint">담임인 학년과 반이 있을 때만 고르세요. 없으면 비워 두면 돼요.</p>
    {!detectedLevel ? <Field label="학교급" value={levelOverride} onChange={event => setLevelOverride(event.target.value)}>
      <option value="">학교급 선택</option>
      <option value="middle">중학교</option>
      <option value="high">고등학교</option>
    </Field> : null}
    <fieldset className="type-picker">
      <legend>담당 과목</legend>
      {subjects.status === 'loading' ? <p role="status">과목을 불러오고 있어요.</p> : null}
      {subjects.status === 'error' ? <div className="api-error" role="alert"><p>{subjects.message}</p>{level ? <button type="button" className="secondary-button" onClick={() => setSubjectTick(tick => tick + 1)}>다시 불러오기</button> : null}</div> : null}
      {subjects.status === 'ready' && subjects.items.length > 0 ? <>
        <Field label="과목 검색" value={query} onChange={event => setQuery(event.target.value)} placeholder="과목 이름" />
        <div className="choice-scroll" role="group" aria-label="담당 과목">
          {filteredSubjects.map(item => <label className="api-check" key={item.id}><input type="checkbox" checked={value.subjectIds.includes(item.id)} onChange={() => onChange({ ...value, subjectIds: toggleId(value.subjectIds, item.id) })} /><span>{item.name}{item.group && item.group !== item.name ? ` · ${item.group}` : ''}</span></label>)}
          {extraSubjects.map(id => <label className="api-check" key={id}><input type="checkbox" checked onChange={() => onChange({ ...value, subjectIds: toggleId(value.subjectIds, id) })} /><span>{subjectNameFromId(id)}</span></label>)}
          {filteredSubjects.length === 0 && extraSubjects.length === 0 ? <p className="dialog-hint">찾는 과목이 없어요.</p> : null}
        </div>
      </> : null}
      {subjects.status === 'ready' && subjects.items.length === 0 ? <p className="dialog-hint">{subjects.message}</p> : null}
    </fieldset>
    <fieldset className="type-picker">
      <legend>수업 들어가는 반</legend>
      <p className="dialog-hint">{year}학년도 학급에서 수업 들어가는 반만 고르세요.</p>
      {classes.status === 'loading' ? <p role="status">학급을 불러오고 있어요.</p> : null}
      {classes.status === 'error' ? <div className="api-error" role="alert"><p>{classes.message}</p><button type="button" className="secondary-button" onClick={() => setClassTick(tick => tick + 1)}>다시 불러오기</button></div> : null}
      {classes.status === 'ready' && classItems.length === 0 ? <p className="dialog-hint">{classes.message}</p> : null}
      {classItems.length > 0 ? <div className="choice-scroll" role="group" aria-label="수업 들어가는 반">{grades.map(grade => <div key={grade}><p className="choice-grade">{grade ? `${grade}학년` : '이전에 선택한 학급'}</p>{classItems.filter(item => (item.grade || 0) === grade).map(item => <label className="api-check" key={item.id}><input type="checkbox" checked={value.teachingClassIds.includes(item.id)} onChange={() => onChange({ ...value, teachingClassIds: toggleId(value.teachingClassIds, item.id) })} /><span>{item.name}</span></label>)}</div>)}</div> : null}
    </fieldset>
  </div>
}

function joined(ids, nameOf) {
  return ids.length ? ids.map(nameOf).join(', ') : '아직 선택하지 않았어요'
}

export function TeachingConnection({ notify, onSaved }) {
  const schoolState = useResource('/settings/school')
  const teaching = useResource('/settings/teaching')
  const mutation = useMutation(notify)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [lists, setLists] = useState({ classes: 'idle', subjects: 'idle' })
  const school = schoolState.data?.schoolCode ? schoolState.data : null
  const current = teaching.data ? readTeaching(teaching.data) : null

  async function save(event) {
    event.preventDefault()
    if (!listsReady(lists)) {
      notify(listsMessage(lists))
      return
    }
    const next = readTeaching(draft)
    const issue = teachingError(next)
    if (issue) {
      notify(issue)
      return
    }
    if (await mutation.run('/settings/teaching', { method: 'PATCH', body: next }, '담당 수업을 저장했어요.')) {
      setEditing(false)
      teaching.reload()
      onSaved?.()
    }
  }

  return <article className="api-panel api-stack">
    <h2>담당 수업</h2>
    <ApiState state={schoolState}>
      <ApiState state={teaching}>
        {!school ? <p className="dialog-hint">학교를 먼저 선택해 주세요.</p> : null}
        {school && current && !editing ? <>
          <p>담임: {current.homeroomClassId ? classNameFromId(current.homeroomClassId) : '없음'}</p>
          <p>과목: {joined(current.subjectIds, subjectNameFromId)}</p>
          <p>수업 반: {joined(current.teachingClassIds, classNameFromId)}</p>
          <button type="button" className="secondary-button" onClick={() => { setDraft(current); setEditing(true) }}>{current.subjectIds.length || current.teachingClassIds.length || current.homeroomClassId ? '담당 수업 바꾸기' : '담당 수업 설정'}</button>
        </> : null}
        {school && editing ? <form className="api-stack" onSubmit={save}>
          <TeachingFields school={school} value={draft} onChange={setDraft} onStatus={setLists} />
          <SaveButton mutation={mutation}>담당 수업 저장</SaveButton>
          <button type="button" className="text-button" onClick={() => setEditing(false)}>취소</button>
        </form> : null}
      </ApiState>
    </ApiState>
  </article>
}
