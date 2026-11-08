import { useState } from 'react';
import { Brand, Field, PrimaryButton } from '../components/ui';
import { dateValue, monthDays, parseDate, todayValue } from '../components/field-utils';
import { navigate } from '../lib/state';
import { passwordError } from '../lib/passwords';
import { clearSession, establishSession, request, resource } from './client';
import { useResource, useMutation } from './hooks';
import { ApiState, MutationError, SaveButton } from './shared';
import PhoneField from '../components/PhoneField';
import { SchoolPicker } from './NeisConnect';
import { invitationEmailMatches, phoneDigits } from '../lib/phone';
import '../components/dashboard-calendar.css';

function PasswordPair({ password, setPassword, confirmation, setConfirmation }) {
  return <>
    <Field label="새 비밀번호" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="영문, 숫자 포함 8자 이상" value={password} onChange={event => setPassword(event.target.value)} />
    <Field label="비밀번호 확인" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
    <p className="dialog-hint">영문과 숫자를 포함해 8자 이상으로 입력해 주세요.</p>
  </>;
}

export default function Auth({
  route,
  query,
  onLogin,
  notify
}) {
  const linkCode = query.get('oobCode') || query.get('token') || '';
  const [token, setToken] = useState(linkCode);
  const [checkedToken, setCheckedToken] = useState(linkCode);
  const [codeOpen, setCodeOpen] = useState(!linkCode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [terms, setTerms] = useState(false);
  const [school, setSchool] = useState(null);
  const [registerSchool, setRegisterSchool] = useState(false);
  const [resetPath, setResetPath] = useState('');
  const invite = route === '/invite' || route === '/set-password';
  const reset = route === '/reset-password' && !!checkedToken;
  const details = useResource(checkedToken && (invite || reset) ? invite ? `/invitations/${encodeURIComponent(checkedToken)}` : `/auth/password/reset/${encodeURIComponent(checkedToken)}` : null, true);
  const mutation = useMutation(notify);
  const [loginError, setLoginError] = useState('');
  const [resetNote, setResetNote] = useState('');
  const [busy, setBusy] = useState(false);
  const setup = useResource(route === '/login' ? '/auth/bootstrap' : null, true);
  const firstAdmin = route === '/login' && !!setup.data?.required;
  const creatingSchool = firstAdmin || registerSchool;
  const invitedSchool = details.data?.schoolCode ? `학교 코드 ${details.data.schoolCode}` : '';

  async function submit(event) {
    event.preventDefault();
    if (route === '/login') {
      if (busy) return;
      if (creatingSchool && !school?.schoolCode) {
        setLoginError('학교 이름 또는 학교 코드로 학교를 선택해 주세요.');
        return;
      }
      if (creatingSchool) {
        const issue = passwordError(password, confirmation);
        if (issue) {
          setLoginError(issue);
          return;
        }
      }
      setBusy(true);
      setLoginError('');
      try {
        const result = await request(creatingSchool ? firstAdmin ? '/auth/bootstrap' : '/auth/schools' : '/auth/login', {
          method: 'POST',
          public: true,
          body: creatingSchool ? {
            name,
            email,
            password,
            passwordConfirmation: confirmation,
            school
          } : {
            email,
            password
          }
        });
        establishSession(result.data);
        const user = (await request('/me')).data;
        onLogin(user);
        if (result.data.schoolWarning) notify(result.data.schoolWarning);
      } catch (error) {
        clearSession();
        setLoginError(error.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (invite && (!checkedToken || checkedToken !== token.trim())) {
      setCheckedToken(token.trim());
      setCodeOpen(false);
      return;
    }
    if (invite || reset) {
      if (invite && !invitationEmailMatches(email, details.data?.email)) {
        setLoginError('초대받은 학교 이메일과 같은 주소를 입력해 주세요.');
        return;
      }
      const issue = passwordError(password, confirmation);
      if (issue) {
        setLoginError(issue);
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
      if (!result) return;
      setResetNote(result.data.message || '등록된 이메일이면 재설정 안내를 준비했어요.');
      setResetPath(result.data.resetPath || '');
    }
  }

  const title = invite ? '초대 가입' : reset ? '새 비밀번호' : creatingSchool ? '학교 관리자 만들기' : route === '/login' ? '로그인' : '비밀번호 찾기';
  const description = invite ? '초대받은 학교와 학교 코드를 확인한 뒤 비밀번호를 설정해요.' : reset ? '이 계정의 비밀번호를 새로 정해요.' : creatingSchool ? '학교마다 관리자와 교사가 나뉘어요. 학교 코드를 고르고 그 학교의 첫 관리자 계정을 만들어요.' : route === '/login' ? '학교 이메일과 비밀번호로 들어와요.' : '가입한 학교 이메일로 재설정 링크를 보내요.';
  const action = invite ? details.data ? '비밀번호 설정하고 가입 완료' : '초대 확인하기' : reset ? '비밀번호 변경하기' : creatingSchool ? '관리자 계정 만들기' : route === '/login' ? '로그인' : resetNote ? '다시 보내기' : '재설정 메일 보내기';

  return <main className="auth-page login-page"><form className="auth-card" onSubmit={submit}><Brand /><h1>{title}</h1><p className="auth-description">{description}</p><div className="auth-fields">
    {route === '/login' && setup.loading ? <p role="status">로그인 준비를 확인하고 있어요.</p> : invite ? <>
      {codeOpen ? <Field label="초대 코드" required value={token} onChange={event => { setToken(event.target.value); setCheckedToken(''); setEmail(''); setLoginError(''); }} placeholder="초대 링크의 코드를 입력해 주세요" /> : null}
      {checkedToken ? <ApiState state={details}><div className="school-selected"><strong>{details.data?.schoolName || '초대받은 학교'}</strong>{invitedSchool ? <p>{invitedSchool}</p> : null}<p>{details.data?.email}</p></div></ApiState> : null}
      {checkedToken && !codeOpen ? <button type="button" className="text-button" onClick={() => { setCodeOpen(true); setCheckedToken(''); }}>다른 초대 코드</button> : null}
      {details.data ? <>
        <Field label="학교 이메일" type="email" required autoComplete="email" placeholder="초대받은 이메일을 입력해 주세요" value={email} onChange={event => { setEmail(event.target.value); setLoginError(''); }} />
        <p className="dialog-hint">초대받은 이메일을 한 번 더 입력해 주세요. 이 주소로 로그인해요.</p>
        <Field label="이름" required value={name} onChange={event => setName(event.target.value)} />
        <PasswordPair password={password} setPassword={setPassword} confirmation={confirmation} setConfirmation={setConfirmation} />
        <label className="api-check"><input type="checkbox" required checked={terms} onChange={event => setTerms(event.target.checked)} />학교에서 안내한 서비스 이용약관에 동의합니다.</label>
      </> : null}
    </> : reset ? <>
      <ApiState state={details}><p className="dialog-hint">{details.data?.email} 계정의 비밀번호를 바꿉니다.</p></ApiState>
      {details.data ? <PasswordPair password={password} setPassword={setPassword} confirmation={confirmation} setConfirmation={setConfirmation} /> : null}
    </> : <>
      {creatingSchool ? <SchoolPicker value={school} onChange={setSchool} notify={notify} /> : null}
      {creatingSchool ? <Field label="이름" required value={name} onChange={event => setName(event.target.value)} /> : null}
      {resetNote ? <div className="auth-sent" role="status"><p>{resetNote}</p><p className="dialog-hint">메일이 보이지 않으면 스팸함을 확인해 주세요.</p><button type="button" className="text-button" onClick={() => { setResetNote(''); setResetPath(''); }}>다른 이메일로 받기</button></div> : <Field label="학교 이메일" type="email" required autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); setLoginError(''); }} />}
      {route === '/login' ? <Field label="비밀번호" type="password" required minLength={creatingSchool ? 8 : undefined} maxLength={creatingSchool ? 128 : undefined} autoComplete={creatingSchool ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} /> : null}
      {creatingSchool ? <Field label="비밀번호 확인" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /> : null}
      {creatingSchool ? <p className="dialog-hint">영문과 숫자를 포함해 8자 이상으로 입력해 주세요.</p> : null}
    </>}
    {resetPath ? <a className="secondary-button" href={`#${resetPath}`}>새 비밀번호 설정하기</a> : null}
    <div className="auth-submit">
      <p className="field-error auth-error" role={loginError || setup.error ? 'alert' : undefined}>{loginError || setup.error?.message || ''}</p>
      <MutationError mutation={mutation} />
      {(reset || invite && checkedToken) && details.error ? null : <PrimaryButton type="submit" busy={busy || mutation.busy} disabled={setup.loading || reset && (!details.data || details.loading) || invite && !!checkedToken && !details.data}>{busy || mutation.busy ? '처리 중…' : action}</PrimaryButton>}
    </div>
    {route === '/login' && !firstAdmin ? <div className="auth-links"><a href="#/reset-password">비밀번호를 잊으셨나요?</a><a href="#/invite">학교 초대로 가입하기</a>{registerSchool ? <button type="button" className="text-button" onClick={() => { setRegisterSchool(false); setLoginError(''); }}>로그인으로 돌아가기</button> : <button type="button" className="text-button" onClick={() => { setRegisterSchool(true); setLoginError(''); }}>새 학교 관리자 만들기</button>}</div> : route !== '/login' ? <div className="auth-links"><a href="#/login">로그인으로 돌아가기</a>{reset ? <a href="#/reset-password">재설정 메일 다시 받기</a> : null}</div> : null}
  </div></form></main>;
}

export function Onboarding({
  notify,
  onComplete,
  account
}) {
  const state = useResource('/onboarding');
  return <main className="onboarding-page"><section className="onboarding-card"><Brand /><h1>사용 환경</h1><p className="auth-description">이름과 알림을 정하면 학급 시간표를 볼 수 있어요.</p><ApiState state={state}>{state.data && <OnboardingDraft initial={state.data} account={account} notify={notify} onComplete={onComplete} />}</ApiState></section></main>;
}
function OnboardingSchedule({ account }) {
  const year = todayValue().slice(0, 4);
  const semester = new Date().getMonth() < 7 ? '1' : '2';
  const state = useResource(account ? resource('/timetables', { schoolYear: year, semester }) : null, false, true);
  const [selected, setSelected] = useState(todayValue());
  const [month, setMonth] = useState(todayValue().slice(0, 7));
  const items = Array.isArray(state.data) ? state.data : [];
  const [yy, mm] = month.split('-').map(Number);
  const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  function lessonsOn(date) {
    const parsed = parseDate(date);
    if (!parsed) return [];
    return items.filter(item => item.dayOfWeek === weekdays[parsed.getUTCDay()]);
  }
  function move(delta) {
    const next = parseDate(`${month}-01`);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(dateValue(next).slice(0, 7));
  }
  const selectedLessons = lessonsOn(selected);
  return <aside className="onboarding-schedule" aria-label="담당 수업 일정"><header className="home-calendar-heading"><div><p className="calendar-eyebrow">담당 수업</p><h2>{yy}년 {mm}월</h2></div><div className="calendar-month-controls"><button type="button" aria-label="이전 달" onClick={() => move(-1)}>‹</button><button type="button" className="calendar-today" onClick={() => { setMonth(todayValue().slice(0, 7)); setSelected(todayValue()); }}>오늘</button><button type="button" aria-label="다음 달" onClick={() => move(1)}>›</button></div></header><ApiState state={state} empty="배정된 수업이 아직 없어요." /><table className="home-calendar-grid"><thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map(day => <th key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{monthDays(yy, mm - 1).slice(week * 7, week * 7 + 7).map(date => {
    const count = lessonsOn(date).length;
    return <td key={date}><button type="button" className={`home-calendar-day${date.slice(0, 7) !== month ? ' adjacent-month' : ''}${count ? ' has-lesson' : ''}`} aria-pressed={selected === date} aria-label={`${date} 수업 ${count}건`} aria-current={date === todayValue() ? 'date' : undefined} onClick={() => setSelected(date)}><span className="day-number">{Number(date.slice(-2))}</span></button></td>;
  })}</tr>)}</tbody></table><div className="day-agenda-section"><h3>{selected} 수업 <span>{selectedLessons.length}</span></h3>{selectedLessons.length ? <ul className="day-lessons">{selectedLessons.map(item => <li key={item.id}><span className="period-label">{item.period}교시</span><div><strong>{item.className || item.subject}</strong><p>{item.subject}</p></div></li>)}</ul> : <p className="agenda-empty">이 요일에 배정된 수업이 없어요.</p>}</div></aside>;
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
  return <div className="onboarding-layout"><form className="api-stack" onSubmit={submit}><Field label="학교 이메일" type="email" value={account.email || ''} readOnly autoComplete="email" /><Field label="표시 이름" required value={name} onChange={e => setName(e.target.value)} /><PhoneField value={phone} onChange={setPhone} /><label className="api-check"><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} />이메일 알림</label><label className="api-check"><input type="checkbox" checked={app} onChange={e => setApp(e.target.checked)} />서비스 내 알림</label><SaveButton mutation={mutation}>설정 완료하기</SaveButton></form><OnboardingSchedule account={account} /></div>;
}
