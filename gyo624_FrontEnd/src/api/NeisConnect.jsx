import { useEffect, useState } from 'react'
import { Field, PrimaryButton } from '../components/ui'
import { neisStatus, readNeisSchool, searchSchools, writeNeisSchool } from './neis'

export default function NeisConnect({ notify }) {
  const [status, setStatus] = useState({ loading: true, configured: false, error: '' })
  const [school, setSchool] = useState(readNeisSchool)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  async function check() {
    setStatus(current => ({ ...current, loading: true, error: '' }))
    try {
      const next = await neisStatus()
      setStatus({ loading: false, configured: !!next.configured, error: '' })
    } catch (error) {
      setStatus({ loading: false, configured: false, error: error.message })
    }
  }
  useEffect(() => { check() }, [])
  async function search(event) {
    event.preventDefault()
    if (keyword.trim().length < 2) {
      notify('학교 이름을 두 글자 이상 입력해 주세요.')
      return
    }
    setBusy(true)
    setResults([])
    try {
      const rows = await searchSchools(keyword)
      setResults(rows)
      if (!rows.length) notify('같은 이름의 학교를 찾지 못했어요.')
    } catch (error) {
      notify(error.message)
    } finally {
      setBusy(false)
    }
  }
  function choose(row) {
    const next = {
      officeCode: row.ATPT_OFCDC_SC_CODE,
      officeName: row.ATPT_OFCDC_SC_NM,
      schoolCode: row.SD_SCHUL_CODE,
      schoolName: row.SCHUL_NM,
      kind: row.SCHUL_KND_SC_NM || ''
    }
    writeNeisSchool(next)
    setSchool(next)
    setResults([])
    notify(`${next.schoolName} 시간표를 나이스에서 불러옵니다.`)
  }
  return <article className="api-panel"><h2>학교</h2>{status.loading ? <p role="status">학교 연결을 확인하고 있어요.</p> : status.error ? <p role="alert">{status.error}</p> : status.configured ? school ? <p>{school.schoolName}{school.officeName ? `, ${school.officeName}` : ''}</p> : <p>시간표를 불러올 학교를 찾아 주세요.</p> : <p role="alert">나이스 시간표를 불러올 수 없어요.</p>}{!status.loading && !status.configured && <button type="button" className="secondary-button" onClick={check}>다시 확인</button>}{status.configured && <form className="api-toolbar" onSubmit={search}><Field label="학교 이름" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="학교 이름" /><PrimaryButton type="submit" busy={busy}>{busy ? '찾는 중…' : '학교 찾기'}</PrimaryButton></form>}{results.length > 0 && <ul className="settings-list">{results.map(row => <li key={`${row.ATPT_OFCDC_SC_CODE}-${row.SD_SCHUL_CODE}`}><button type="button" className="settings-row" onClick={() => choose(row)}><span className="row-copy"><span className="row-title">{row.SCHUL_NM}</span><span className="row-detail">{row.ATPT_OFCDC_SC_NM}, {row.SCHUL_KND_SC_NM}, {row.ORG_RDNMA}</span></span></button></li>)}</ul>}{school && <button type="button" className="text-button" onClick={() => { writeNeisSchool(null); setSchool(null); notify('학교 연결을 해제했어요.') }}>학교 연결 해제</button>}</article>
}
