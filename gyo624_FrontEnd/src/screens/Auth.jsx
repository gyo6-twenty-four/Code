import { useState } from 'react'
import { Brand, Field, PrimaryButton } from '../components/ui'
import { navigate, persist, readCollection, settingsKey } from '../lib/state'
import { accountHome, findAccountByEmail } from '../lib/account'
import { teacherSeed } from './AdminData'
const canSettingsReturn = account => accountHome(account) === '/admin' ? '/admin/settings' : '/settings'
const copy = {
  '/login': ['T01', '수업과 학생 기록을 한곳에서 관리해요', '학교 이메일로 안전하게 시작해요.', '로그인'],
  '/invite': ['T02', '초대받은 학교에 합류해요', '학교와 담당 학급을 확인해 주세요.', '초대 수락하기'],
  '/reset-password': ['T03', '비밀번호를 다시 설정해요', '가입한 학교 이메일로 재설정 안내를 보내요.', '재설정 안내 보내기'],
}
export function Auth({ route, settings, setSettings, notify, onLogin }) {
  const [code, title, description, action] = copy[route]
  const [error, setError] = useState('')
  return <main className={`auth-page ${route === '/login' ? 'login-page' : ''}`}>
    <form className="auth-card" onSubmit={e => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      if (route === '/reset-password') { notify('인증 서버가 연결되지 않아 메일을 보낼 수 없어요.'); return }
      if (route === '/invite') {
        setSettings({ ...settings, name: String(data.get('name')).trim(), email: String(data.get('email')).trim() })
        notify('초대 정보 확인은 서버 연결 후 가능해요. 학교 설정을 미리 볼 수 있어요.')
        navigate('/onboarding')
      } else {
        const matched = findAccountByEmail(readCollection('classroom-teachers', teacherSeed), data.get('email'))
        if (!matched) { setError('등록된 활성 계정을 찾을 수 없어요. 학교 이메일과 계정 상태를 확인해 주세요.'); return }
        setError(''); onLogin(matched)
      }
    }}>
      <Brand />
      <p className="auth-step">{route === '/login' ? '학교 계정 로그인' : code === 'T02' ? '학교 초대' : '계정 복구'}</p><h1>{title}</h1><p className="auth-description">{description}</p>
      <div className="auth-fields">
        {route === '/invite' && <><Field label="초대 코드" name="code" required placeholder="SCHOOL-2026" /><Field label="이름" name="name" required pattern=".*\S.*" autoComplete="name" placeholder="선생님 이름" /></>}
        <Field label="학교 이메일" name="email" type="email" required autoComplete="email" placeholder="name@school.kr" />
        {route === '/login' && <><Field label="비밀번호" name="password" type="password" required autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" /><a className="forgot-link" href="#/reset-password">비밀번호를 잊으셨나요?</a></>}
      </div>
      {error && <p className="field-error auth-error" role="alert">{error}</p>}
      <div className="auth-footer">
        <p className="auth-hint">{route === '/login' ? <a href="#/invite">초대를 받으셨나요? 초대 코드로 시작해요.</a> : route === '/invite' ? '초대 정보는 학교 관리자에게 문의해요.' : '메일이 오지 않으면 스팸함과 주소를 확인해 주세요.'}</p>
        <PrimaryButton type="submit">{action}</PrimaryButton>{route !== '/login' && <a className="cancel-link" href="#/login">로그인으로 돌아가기</a>}
      </div>
    </form>
  </main>
}
export function Onboarding({ settings, setSettings, notify, account }) {
  const [draft, setDraft] = useState(settings)
  const change = key => e => setDraft({ ...draft, [key]: e.target.value })
  return <main className="onboarding-page"><form className="onboarding-card" onSubmit={e => {
    e.preventDefault()
    try { persist(settingsKey, draft); setSettings(draft); notify('학교 정보를 이 브라우저에 저장했어요.'); navigate(canSettingsReturn(account)) } catch { notify('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.') }
  }}>
    <Brand /><p className="onboarding-step">학교 정보</p><h1>사용 환경을 설정해요</h1><p className="onboarding-description">담당 학급에 맞춰 교육24를 준비해요.</p>

    <div className="onboarding-fields"><Field label="학교" required pattern=".*\S.*" value={draft.school} onChange={change('school')} /><Field label="담당 학년" value={draft.grade} onChange={change('grade')}>{[1, 2, 3, 4, 5, 6].map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</Field><Field label="담당 반" required value={draft.classroom} onChange={change('classroom')}>{Array.from({ length: 99 }, (_, i) => <option key={i} value={i + 1}>{i + 1}반</option>)}</Field></div>
    <p className="onboarding-hint">학급은 나중에 설정에서 바꿀 수 있어요.</p><PrimaryButton type="submit">설정 저장하기</PrimaryButton><a className="cancel-link" href={`#${canSettingsReturn(account)}`}>취소하고 설정으로</a>
  </form><p className="onboarding-after desktop-only">계정 설정은 언제든 바꿀 수 있어요.</p></main>
}
