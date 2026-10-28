import { useState } from 'react';
import { Brand, Field, PrimaryButton } from '../components/ui';
import { navigate } from '../lib/state';
import { clearSession, establishSession, request } from './client';
import { useResource, useMutation } from './hooks';
import { ApiState, MutationError, SaveButton } from './shared';
import PhoneField from '../components/PhoneField';
import { invitationEmailMatches, phoneDigits } from '../lib/phone';
export default function Auth({
  route,
  query,
  onLogin,
  notify
}) {
  const [token, setToken] = useState(query.get('token') || '');
  const [checkedToken, setCheckedToken] = useState(query.get('token') || '');
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [terms, setTerms] = useState(false),
    [resetPath, setResetPath] = useState('');
  const invite = route === '/invite' || route === '/set-password',
    reset = route === '/reset-password' && !!checkedToken;
  const details = useResource(checkedToken && (invite || reset) ? invite ? `/invitations/${encodeURIComponent(checkedToken)}` : `/auth/password/reset/${encodeURIComponent(checkedToken)}` : null, true);
  const mutation = useMutation(notify);
  const [loginError, setLoginError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (route === '/login') {
      if (busy) return;
      setBusy(true);
      setLoginError('');
      try {
        const result = await request('/auth/login', {
          method: 'POST',
          public: true,
          body: {
            email,
            password
          }
        });
        establishSession(result.data);
        const user = (await request('/me')).data;
        onLogin(user);
      } catch (error) {
        clearSession();
        setLoginError(error.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (invite && (!checkedToken || checkedToken !== token)) {
      setCheckedToken(token.trim());
      return;
    }
    if (invite || reset) {
      if (invite && !invitationEmailMatches(email, details.data?.email)) {
        setLoginError('초대받은 학교 이메일과 같은 주소를 입력해 주세요.');
        return;
      }
      if (password !== confirmation) {
        setLoginError('비밀번호 확인이 일치하지 않아요.');
        return;
      }
      const path = invite ? `/invitations/${encodeURIComponent(checkedToken)}/accept` : `/auth/password/reset/${encodeURIComponent(checkedToken)}`;
      const result = await mutation.run(path, {
        public: true,
        idempotent: invite,
        body: {
          ...(invite ? {
            name,
            termsAgreed: terms
          } : {}),
          password,
          passwordConfirmation: confirmation
        }
      }, invite ? '가입이 완료됐어요. 로그인해 주세요.' : '비밀번호를 변경했어요. 로그인해 주세요.');
      if (result) navigate('/login');
    } else {
      const result = await mutation.run('/auth/password/forgot', {
        public: true,
        body: {
          email
        }
      });
      if (result) setResetPath(result.data.resetPath);
    }
  }
  return <main className="auth-page login-page"><form className="auth-card" onSubmit={submit}><Brand /><p className="auth-step">학교 계정</p><h1>{invite ? '초대받은 학교에 합류해요' : reset ? '새 비밀번호를 설정해요' : route === '/login' ? '수업과 학생 기록을 한곳에서 관리해요' : '비밀번호를 다시 설정해요'}</h1><div className="auth-fields">
    {invite ? <><Field label="초대 토큰" required value={token} onChange={e => {
            setToken(e.target.value);
            setCheckedToken('');
            setEmail('');
            setLoginError('');
          }} placeholder="초대 링크의 토큰을 입력해 주세요" />{checkedToken && <ApiState state={details}><p className="dialog-hint">{details.data?.schoolName || details.data?.school?.name} · {details.data?.email}</p></ApiState>}{details.data && <><Field label="학교 이메일" type="email" required autoComplete="email" placeholder="초대받은 이메일을 입력해 주세요" value={email} onChange={e => { setEmail(e.target.value); setLoginError(''); }} /><p className="dialog-hint">초대받은 이메일을 확인해 주세요. 이 주소가 로그인에 사용돼요.</p><Field label="이름" required value={name} onChange={e => setName(e.target.value)} /><Field label="비밀번호" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /><Field label="비밀번호 확인" type="password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} /><label className="api-check"><input type="checkbox" required checked={terms} onChange={e => setTerms(e.target.checked)} />학교에서 안내한 서비스 이용약관에 동의합니다.</label></>}</> : reset ? <><ApiState state={details} /><Field label="새 비밀번호" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /><Field label="비밀번호 확인" type="password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></> : <><Field label="학교 이메일" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />{route === '/login' && <Field label="비밀번호" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />}</>}
    {resetPath && <a className="secondary-button" href={`#${resetPath}`}>새 비밀번호 설정하기</a>}{loginError && <p className="field-error" role="alert">{loginError}</p>}<MutationError mutation={mutation} />
    <PrimaryButton type="submit" disabled={busy || mutation.busy || reset && (!details.data || details.loading) || invite && !!checkedToken && !details.data}>{busy || mutation.busy ? '처리 중…' : invite ? details.data ? '비밀번호 설정하고 가입 완료' : '초대 확인하기' : reset ? '비밀번호 변경하기' : route === '/login' ? '로그인' : '재설정 안내 보내기'}</PrimaryButton>
    {route === '/login' ? <><a href="#/reset-password">비밀번호를 잊으셨나요?</a><a href="#/invite">학교 초대로 가입하기</a></> : <a href="#/login">로그인으로 돌아가기</a>}
  </div></form></main>;
}
export function Onboarding({
  notify,
  onComplete,
  account
}) {
  const state = useResource('/onboarding');
  return <main className="onboarding-page"><section className="onboarding-card"><Brand /><h1>사용 환경을 설정해요</h1><ApiState state={state}>{state.data && <OnboardingDraft initial={state.data} account={account} notify={notify} onComplete={onComplete} />}</ApiState></section></main>;
}
function OnboardingDraft({
  initial,
  account,
  notify,
  onComplete
}) {
  const mutation = useMutation(notify);
  const [name, setName] = useState(initial.profile?.displayName || account.name || ''),
    [phone, setPhone] = useState(phoneDigits(initial.profile?.phone || '')),
    [email, setEmail] = useState(initial.preferences?.notificationEmail ?? true),
    [app, setApp] = useState(initial.preferences?.notificationInApp ?? true);
  async function submit(event) {
    event.preventDefault();
    if (!(await mutation.run('/onboarding', {
      method: 'PATCH',
      body: {
        currentStep: 'PROFILE',
        profile: {
          displayName: name,
          phone
        },
        preferences: {
          notificationEmail: email,
          notificationInApp: app
        }
      }
    }))) return;
    if (await mutation.run('/onboarding/complete', {
      body: {}
    }, '사용 환경을 저장했어요.')) onComplete();
  }
  return <form className="api-stack" onSubmit={submit}><Field label="학교 이메일" type="email" value={account.email || ''} readOnly autoComplete="email" /><Field label="표시 이름" required value={name} onChange={e => setName(e.target.value)} /><PhoneField value={phone} onChange={setPhone} /><label className="api-check"><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} />이메일 알림</label><label className="api-check"><input type="checkbox" checked={app} onChange={e => setApp(e.target.checked)} />서비스 내 알림</label><SaveButton mutation={mutation}>설정 완료하기</SaveButton></form>;
}
