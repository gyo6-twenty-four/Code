import { useState } from 'react'
import { Brand, Field, PrimaryButton } from '../components/ui'
import { navigate, persist, settingsKey } from '../lib/state'
import { accountHome, findAccountByEmail } from '../lib/account'
import { finishSignup, pendingSignup, previewAccounts, startSignup, verifyPreviewPassword } from '../lib/preview-auth'
const canSettingsReturn = account => accountHome(account) === '/admin' ? '/admin/settings' : '/settings'
const copy = {
  '/login': ['학교 계정 로그인', '수업과 학생 기록을 한곳에서 관리해요', '학교 이메일로 시작해요.', '로그인'],
  '/invite': ['초대 가입', '초대받은 학교에 합류해요', '초대 정보를 확인한 뒤 비밀번호를 설정해요.', '다음 · 비밀번호 설정'],
  '/reset-password': ['계정 복구', '비밀번호를 다시 설정해요', '가입한 학교 이메일로 재설정 안내를 보내요.', '재설정 안내 보내기'],
  '/set-password': ['비밀번호 설정', '사용할 비밀번호를 설정해요', '가입을 완료하려면 비밀번호를 설정해 주세요.', '비밀번호 설정하고 가입 완료'],
}
export function Auth({ route, notify, onLogin }) {
  const [step, title, description, action] = copy[route]
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [pending] = useState(pendingSignup)
  const settingPassword = route === '/set-password'
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    setError(''); setBusy(true)
    try {
      if (route === '/reset-password') { setError('재설정 요청을 처리하지 못했어요. 잠시 후 다시 시도하거나 학교 관리자에게 문의해 주세요.'); return }
      if (route === '/invite') {
        startSignup({ name: String(data.get('name')), email, code: String(data.get('code')) })
        navigate('/set-password')
      } else if (settingPassword) {
        const created = await finishSignup(String(data.get('password')), String(data.get('confirmation')))
        notify(`${created.email} 가입이 완료됐어요. 설정한 비밀번호로 로그인해 주세요.`)
        navigate('/login')
      } else {
        const matched = findAccountByEmail(previewAccounts(), email)
        if (!matched || !await verifyPreviewPassword(matched, String(data.get('password')))) { setError('이메일 또는 비밀번호를 확인해 주세요.'); return }
        onLogin(matched)
      }
    } catch (failure) { setError(failure.message || '처리하지 못했어요. 다시 시도해 주세요.') } finally { setBusy(false) }
  }
  return <main className={`auth-page ${route === '/login' ? 'login-page' : ''}`}><form className="auth-card" onSubmit={submit} aria-busy={busy}>
    <Brand /><p className="auth-step">{step}</p><h1>{title}</h1><p className="auth-description">{description}</p>
    {settingPassword && !pending ? <div className="auth-fields"><p className="field-error" role="alert">먼저 초대 가입 정보를 입력해 주세요. 가입 정보는 30분 동안 유지돼요.</p><a className="inline-link" href="#/invite">초대 가입으로 이동 →</a></div> : <>
      <div className="auth-fields">
        {route === '/invite' && <><Field label="초대 코드" name="code" required placeholder="학교에서 받은 초대 코드를 입력해 주세요" /><Field label="이름" name="name" required pattern=".*\S.*" autoComplete="name" placeholder="선생님 이름" /></>}
        {settingPassword ? <><p className="signup-identity"><strong>{pending.name}</strong><span>{pending.email}</span></p><Field label="새 비밀번호" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="영문·숫자 포함 8자 이상" /><Field label="비밀번호 확인" name="confirmation" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" /></> : <Field label="학교 이메일" name="email" type="email" value={email} onChange={event => { setEmail(event.target.value); setError('') }} required autoComplete="email" placeholder="name@school.kr" />}
        {route === '/login' && <><Field label="비밀번호" name="password" type="password" required autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" /><a className="forgot-link" href="#/reset-password">비밀번호를 잊으셨나요?</a></>}
      </div>
      {error && <p className="field-error auth-error" role="alert">{error}</p>}
      <div className="auth-footer"><PrimaryButton type="submit" disabled={busy}>{busy ? '처리 중…' : action}</PrimaryButton><p className="auth-hint">{route === '/login' ? <a href="#/invite">초대를 받으셨나요? 초대 코드로 가입해요.</a> : route === '/invite' ? '초대 코드는 학교 관리자에게 문의해 주세요.' : settingPassword ? '영문과 숫자를 포함해 8자 이상으로 설정해 주세요.' : '가입한 학교 이메일을 입력해 주세요.'}</p>{route !== '/login' && <a className="cancel-link" href="#/login">로그인으로 돌아가기</a>}</div>
    </>}
  </form></main>
}
export function Onboarding({ settings, setSettings, notify, account }) {
  const [draft, setDraft] = useState(settings)
  const change = key => e => setDraft({ ...draft, [key]: e.target.value })
  return <main className="onboarding-page"><form className="onboarding-card" onSubmit={e => {
    e.preventDefault()
    try { persist(settingsKey, draft); setSettings(draft); notify('학교 정보를 저장했어요.'); navigate(canSettingsReturn(account)) } catch { notify('저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.') }
  }}>
    <Brand /><p className="onboarding-step">학교 정보</p><h1>사용 환경을 설정해요</h1><p className="onboarding-description">담당 학급에 맞춰 교육24를 준비해요.</p>

    <div className="onboarding-fields"><Field label="학교" required pattern=".*\S.*" value={draft.school} onChange={change('school')} /><Field label="담당 학년" value={draft.grade} onChange={change('grade')}>{[1, 2, 3, 4, 5, 6].map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</Field><Field label="담당 반" required value={draft.classroom} onChange={change('classroom')}>{Array.from({ length: 99 }, (_, i) => <option key={i} value={i + 1}>{i + 1}반</option>)}</Field></div>
    <p className="onboarding-hint">학급은 나중에 설정에서 바꿀 수 있어요.</p><PrimaryButton type="submit">설정 저장하기</PrimaryButton><a className="cancel-link" href={`#${canSettingsReturn(account)}`}>취소하고 설정으로</a>
  </form><p className="onboarding-after desktop-only">계정 설정은 언제든 바꿀 수 있어요.</p></main>
}
