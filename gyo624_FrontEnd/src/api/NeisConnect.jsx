import { useEffect, useState } from 'react'
import { Field, PrimaryButton } from '../components/ui'
import { schoolFromNeis, toNeisSchool } from '../lib/school'
import { useMutation, useResource } from './hooks'
import { neisStatus, searchSchools, writeNeisSchool } from './neis'
import { ApiState } from './shared'

function SchoolSummary({ school, note }) {
  return <div className="school-selected">
    <strong>{school.name}</strong>
    <p>{[school.officeName, school.kind].filter(Boolean).join(' · ')}</p>
    <p className="school-code">학교 코드 {school.schoolCode}</p>
    {note ? <p>{note}</p> : null}
  </div>
}

export function SchoolPicker({ value, onChange, notify }) {
  const [status, setStatus] = useState({ loading: true, configured: false, error: '' })
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    neisStatus().then(next => {
      if (active) setStatus({ loading: false, configured: !!next.configured, error: '' })
    }).catch(error => {
      if (active) setStatus({ loading: false, configured: false, error: error.message })
    })
    return () => { active = false }
  }, [])
  function recheck() {
    setStatus(current => ({ ...current, loading: true, error: '' }))
    neisStatus().then(next => setStatus({ loading: false, configured: !!next.configured, error: '' })).catch(error => setStatus({ loading: false, configured: false, error: error.message }))
  }
  async function search() {
    if (busy) return
    setBusy(true)
    setResults([])
    try {
      const rows = await searchSchools(keyword)
      const schools = rows.map(schoolFromNeis).filter(Boolean)
      setResults(schools.slice(0, 8))
      if (!schools.length) notify('같은 학교 코드나 이름의 학교를 찾지 못했어요.')
      else if (schools.length > 8) notify('결과가 많아요. 학교 이름을 더 구체적으로 입력해 주세요.')
    } catch (error) {
      notify(error.message)
    } finally {
      setBusy(false)
    }
  }
  if (value?.schoolCode) {
    return <SchoolSummary school={value} note={<button type="button" className="text-button" onClick={() => onChange(null)}>다른 학교 선택</button>} />
  }
  return <div className="school-picker">
    {status.loading ? <p role="status">학교 연결을 확인하고 있어요.</p> : null}
    {status.error ? <p role="alert">{status.error}</p> : null}
    {!status.loading && !status.error && !status.configured ? <p role="alert">나이스에서 학교 코드를 찾지 못해요.</p> : null}
    {!status.loading && !status.configured ? <button type="button" className="secondary-button" onClick={recheck}>다시 확인</button> : null}
    {status.configured ? <div className="api-toolbar">
      <Field label="학교 이름 또는 학교 코드" value={keyword} onChange={event => setKeyword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search() } }} placeholder="학교 이름 또는 7자리 학교 코드" autoComplete="organization" />
      <PrimaryButton type="button" busy={busy} onClick={search}>{busy ? '찾는 중…' : '학교 찾기'}</PrimaryButton>
    </div> : null}
    {results.length > 0 ? <ul className="school-results">{results.map(school => <li key={`${school.officeCode}-${school.schoolCode}`}>
      <button type="button" className="settings-row" onClick={() => { onChange(school); setResults([]) }}>
        <span className="row-copy"><span className="row-title">{school.name}</span><span className="row-detail">{[school.officeName, school.kind, school.address].filter(Boolean).join(' · ')} · 학교 코드 {school.schoolCode}</span></span>
      </button>
    </li>)}</ul> : null}
  </div>
}

export function SchoolConnection({ notify, onSaved }) {
  const school = useResource('/settings/school')
  const mutation = useMutation(notify)
  const current = school.data?.schoolCode ? school.data : null
  async function save(next) {
    if (!next) return
    const saved = await mutation.run('/settings/school', { method: 'PATCH', body: next }, `${next.name} 학교를 이 계정에 저장했어요.`)
    if (!saved) return
    writeNeisSchool(toNeisSchool(next))
    school.reload()
    onSaved?.()
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(current.schoolCode)
      notify('학교 코드를 복사했어요.')
    } catch {
      notify('학교 코드를 선택해 복사해 주세요.')
    }
  }
  return <article className="api-panel">
    <h2>내 학교</h2>
    <p className="dialog-hint">이 교사 계정에만 저장돼요. 시간표는 이 학교로 불러와요.</p>
    <ApiState state={school}>
      {current ? <>
        <SchoolSummary school={current} />
        <button type="button" className="text-button" onClick={copyCode}>학교 코드 복사</button>
      </> : <p>학교 이름 또는 학교 코드로 이 계정의 학교를 등록해 주세요.</p>}
      <SchoolPicker value={null} onChange={save} notify={notify} />
    </ApiState>
  </article>
}

export default SchoolConnection
