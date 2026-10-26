import { useEffect, useState } from 'react'
import { InfoPanel, PrimaryButton } from '../components/ui'
import { todayValue } from '../components/field-utils'

export default function Recording({ settings }) {
  const [state, setState] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (state !== 'running') return
    const timer = setInterval(() => setElapsed(previous => previous + 1), 1000)
    return () => clearInterval(timer)
  }, [state])
  const display = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`
  function start() {
    if (state === 'running') { setState('paused'); return }
    if (state !== 'paused') setElapsed(0)
    setState('running')
  }
  return <div className={`content-columns recording-columns ${state === 'running' ? 'is-running' : ''}`}><section className="recording-card"><div className="recording-context"><span className={`status-badge recording-status ${state === 'running' ? 'is-active' : ''}`} role="status">{state === 'running' && <span className="recording-dot" aria-hidden="true" />}{state === 'running' ? '녹음 중' : state === 'paused' ? '일시정지' : state === 'ended' ? '녹음 종료' : '대기 중'}</span><h2>수업 녹음</h2><p>{settings.grade}학년 {settings.classroom}반 · {todayValue()}</p></div><p className="recording-time" aria-live="off">{display}</p><p className="recording-caption">{state === 'running' ? '수업 음성을 녹음하고 있어요.' : state === 'paused' ? '녹음이 일시정지됐어요.' : state === 'ended' ? '녹음이 종료됐어요.' : '시작 버튼을 눌러 수업 녹음을 시작하세요.'}</p><div className="waveform" aria-hidden="true">{[10, 16, 14, 24, 16, 28, 18, 30, 22, 18, 28, 14, 22, 26, 18, 14, 24, 18, 16, 22, 12, 18, 26, 14].map((height, index) => <span key={index} style={{ height, '--delay': `${index * 70}ms` }} />)}</div><PrimaryButton className="recording-action" onClick={start}>{state === 'running' ? '일시정지' : state === 'paused' ? '녹음 계속하기' : state === 'ended' ? '새 녹음 시작하기' : '녹음 시작하기'}</PrimaryButton>{['running', 'paused'].includes(state) && <button type="button" className="secondary-button recording-stop" onClick={() => setState('ended')}>녹음 종료</button>}</section><InfoPanel className="desktop-only recording-info" title="녹음 안내" lines={['참여자에게 녹음 사실을 알려 주세요', '수업 중 필요에 따라 일시정지할 수 있어요', '수업이 끝나면 녹음을 종료해 주세요']} /></div>
}
