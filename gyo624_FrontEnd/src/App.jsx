import { useEffect, useState } from 'react';
import { Brand, Field, Modal } from './components/ui';
import { useNotice, useRoute, navigate } from './lib/state';
import { todayValue } from './components/field-utils';
import Auth, { Onboarding } from './api/Auth';
import { Observation, Career } from './api/Records';
import { Reports, RecordEditor, Transfer } from './api/Reports';
import { AdminHome, Teachers, Rosters, Audit } from './api/Admin';
import Settings, { Notifications } from './api/Settings';
import Timetable from './api/Timetable';
import { clearSession, detailError, onSessionExpired, refreshToken, renewSession, request } from './api/client';
import { usePage, useResource } from './api/hooks';
import { assertUser } from './api/model';
import './App.css';
import './components/fields.css';
import './ux.css';
import './api/api.css';
const publicRoutes = ['/login', '/invite', '/set-password', '/reset-password'];
const titles = {
  '/coverage': '나의 수업',
  '/timetable': '나의 시간표',
  '/students': '학생별 관찰 기록',
  '/observations/batch': '학급 일괄 관찰',
  '/timeline': '학생 관찰 타임라인',
  '/career': '진로 기록',
  '/reports': '학생 기록 보드',
  '/reports/edit': '생기부 항목 편집',
  '/reports/check': '작성 내용 확인',
  '/admin/transfer': '학생 기록 이관',
  '/notifications': '알림함',
  '/settings': '설정',
  '/admin': '학교 운영 현황',
  '/admin/teachers': '교사 계정 관리',
  '/admin/rosters': '학생 명단 관리',
  '/admin/timetable': '시간표 관리',
  '/admin/audit': '변경 이력',
  '/admin/settings': '설정',
  '/admin/notifications': '알림함'
};
const teacherMenu = [['홈', '/coverage'], ['나의 시간표', '/timetable'], ['학생별 관찰', '/students'], ['학급 일괄 관찰', '/observations/batch'], ['학생 관찰 타임라인', '/timeline'], ['진로', '/career'], ['생기부', '/reports'], ['알림함', '/notifications'], ['설정', '/settings']];
const adminMenu = [['관리자 홈', '/admin'], ['교사 계정', '/admin/teachers'], ['명단 관리', '/admin/rosters'], ['시간표 관리', '/admin/timetable'], ['학생 기록 이관', '/admin/transfer'], ['변경 이력', '/admin/audit'], ['알림함', '/admin/notifications'], ['설정', '/admin/settings']];
export default function App() {
  const location = useRoute(),
    requested = location.split('?')[0] === '/records' ? '/coverage' : location.split('?')[0],
    query = new URLSearchParams(location.split('?')[1] || '');
  const [account, setAccount] = useState(null),
    [initializing, setInitializing] = useState(true),
    [restoreError, setRestoreError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const [notice, notify] = useNotice(),
    [menu, setMenu] = useState(false);
  const currentYear = todayValue().slice(0, 4);
  const [year, setYear] = useState(currentYear),
    [classId, setClassId] = useState(''),
    [studentId, setStudentId] = useState('');
  useEffect(() => onSessionExpired(() => {
    setAccount(null);
    setClassId('');
    setStudentId('');
    setInitializing(false);
  }), []);
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        if (refreshToken()) {
          await renewSession();
          const result = await request('/me');
          if (active) setAccount(assertUser(result.data));
        }
      } catch (error) {
        if (active && error.name !== 'AbortError') {
          if (error.status === 401) clearSession();else setRestoreError(detailError(error));
        }
      } finally {
        if (active) setInitializing(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, [attempt]);
  const route = !account && !publicRoutes.includes(requested) ? '/login' : account?.onboardingCompleted === false && !publicRoutes.includes(requested) ? '/onboarding' : requested;
  useEffect(() => {
    if (!initializing && !restoreError && route !== requested) navigate(route);
  }, [initializing, restoreError, route, requested]);
  useEffect(() => {
    document.title = `${titles[route] || (route === '/onboarding' ? '사용 환경 설정' : '학교 계정')} · 교육24`;
  }, [route]);
  const classes = usePage(account ? '/classes' : null, {
    schoolYear: year
  });
  const students = usePage(account && classId ? `/classes/${classId}/students` : null, {
    schoolYear: year
  });
  const unread = useResource(account ? '/notifications/unread-count' : null);
  const admin = account?.role === 'ADMIN',
    adminRoute = route.startsWith('/admin');
  function selectClass(id) {
    setClassId(id);
    setStudentId('');
    students.setPage(1);
  }
  function onLogin(value) {
    const user = assertUser(value);
    setAccount(user);
    setClassId('');
    setStudentId('');
    setRestoreError('');
    setMenu(false);
    navigate(user.onboardingCompleted === false ? '/onboarding' : user.role === 'ADMIN' ? '/admin' : '/coverage');
  }
  async function updateProfile() {
    try {
      const result = await request('/me');
      setAccount(assertUser(result.data));
    } catch (error) {
      notify(detailError(error));
    }
  }
  async function logout() {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: {
          refreshToken: refreshToken()
        }
      });
    } catch (error) {
      notify(`로그아웃 요청 결과를 확인하지 못했어요. 이 기기의 로그인은 해제합니다. ${detailError(error)}`);
    } finally {
      clearSession();
      setMenu(false);
      navigate('/login');
    }
  }
  const common = {
    account,
    classes,
    classId,
    selectClass,
    students,
    studentId,
    selectStudent: setStudentId,
    year,
    notify,
    query
  };
  const count = typeof unread.data === 'number' ? unread.data : unread.data?.count ?? unread.data?.unreadCount ?? 0;
  const nav = <nav className="side-nav" aria-label={adminRoute ? '관리자 메뉴' : '교사 메뉴'}>{(adminRoute ? adminMenu : teacherMenu).map(([label, path]) => <a key={path} href={`#${path}`} aria-current={route === path ? 'page' : undefined} onClick={() => setMenu(false)}>{label}{path.endsWith('/notifications') && count > 0 && <span className="nav-unread">{count}</span>}</a>)}</nav>;
  if (initializing) return <main className="not-found"><Brand /><p role="status">로그인 정보를 확인하고 있어요.</p></main>;
  if (restoreError) return <main className="not-found"><Brand /><p role="alert">{restoreError}</p><button type="button" className="secondary-button" onClick={() => {
      setRestoreError('');
      setInitializing(true);
      setAttempt(attempt + 1);
    }}>다시 연결하기</button><button type="button" className="text-button" onClick={() => {
      clearSession();
      setRestoreError('');
      navigate('/login');
    }}>로그인 화면으로</button></main>;
  if (publicRoutes.includes(route)) return <><Auth key={location} route={route} query={query} onLogin={onLogin} notify={notify} /><div className={`toast${notice ? ' is-visible' : ''}`} role="status">{notice}</div></>;
  if (route === '/onboarding') return <Onboarding account={account} notify={notify} onComplete={async () => {
    try {
      onLogin((await request('/me')).data);
    } catch (error) {
      notify(detailError(error));
    }
  }} />;
  if (adminRoute && !admin) return <main className="not-found"><Brand /><h1>접근 권한이 없어요</h1><a href="#/coverage">홈으로 돌아가기</a></main>;
  let screen;
  switch (route) {
    case '/coverage':
      screen = <Timetable {...common} home />;
      break;
    case '/timetable':
    case '/admin/timetable':
      screen = <Timetable {...common} />;
      break;
    case '/students':
      screen = <Observation {...common} />;
      break;
    case '/observations/batch':
      screen = <Observation {...common} batch />;
      break;
    case '/timeline':
      screen = <Observation {...common} timeline />;
      break;
    case '/career':
      screen = <Career {...common} />;
      break;
    case '/reports':
      screen = <Reports {...common} />;
      break;
    case '/reports/edit':
    case '/reports/check':
      screen = <RecordEditor {...common} checkOnly={route.endsWith('/check')} />;
      break;
    case '/admin/transfer':
      screen = <Transfer {...common} />;
      break;
    case '/settings':
    case '/admin/settings':
      screen = <Settings account={account} notify={notify} onLogout={logout} updateProfile={updateProfile} />;
      break;
    case '/notifications':
    case '/admin/notifications':
      screen = <Notifications notify={notify} refreshUnread={unread.reload} />;
      break;
    case '/admin':
      screen = <AdminHome year={year} />;
      break;
    case '/admin/teachers':
      screen = <Teachers {...common} />;
      break;
    case '/admin/rosters':
      screen = <Rosters {...common} />;
      break;
    case '/admin/audit':
      screen = <Audit notify={notify} />;
      break;
    default:
      screen = <p>현재 이용할 수 없는 메뉴예요. <a href={`#${admin ? '/admin' : '/coverage'}`}>홈으로 이동</a></p>;
  }
  return <div className={`app-shell ${adminRoute ? 'admin-shell' : ''}`}><a className="skip-link" href="#main-content" onClick={e => {
      e.preventDefault();
      document.getElementById('main-content')?.focus();
    }}>본문으로 이동</a><aside className="sidebar"><Brand /><div className="sidebar-scroll">{nav}</div><a className="profile-button" href={`#${adminRoute ? '/admin/settings' : '/settings'}`}>{account.name} {admin ? '관리자' : '선생님'}</a></aside><header className="topbar"><span>{account.school?.name || account.schoolName || '교육24'} · {year}학년도</span><span>{account.name}</span></header><div className="workspace"><header className="mobile-brand"><Brand onClick={() => setMenu(true)} /></header><main id="main-content" tabIndex={-1} className="screen"><div className="screen-heading"><h1>{titles[route] || '메뉴 안내'}</h1>{route === '/coverage' && <a className="primary-button" href="#/timetable">시간표 보기</a>}</div><div className="api-toolbar api-context-toolbar"><div className="api-year-controls"><Field label="학년도" type="number" min={2000} max={2100} value={year} onChange={e => {
            setYear(e.target.value);
            classes.setPage(1);
            selectClass('');
          }} /><button type="button" className="year-today-button" aria-label={`올해(${currentYear}년)로 돌아가기`} disabled={String(year) === currentYear} onClick={() => {
            setYear(currentYear);
            classes.setPage(1);
            selectClass('');
          }}>올해</button></div></div><div key={`${account.id}:${route}:${classId}:${studentId}:${year}`}>{screen}</div></main><footer className="mobile-footer"><nav className="bottom-nav" aria-label="하단 메뉴"><a href={`#${adminRoute ? '/admin' : '/coverage'}`}>홈</a><a href={`#${adminRoute ? '/admin/rosters' : '/students'}`}>학생</a><a href={`#${adminRoute ? '/admin/notifications' : '/notifications'}`}>알림 {count > 0 ? count : ''}</a><button type="button" onClick={() => setMenu(true)}>더보기</button></nav></footer></div>{menu && <Modal title="전체 메뉴" className="navigation-drawer" onClose={() => setMenu(false)}>{nav}</Modal>}<div className={`toast${notice ? ' is-visible' : ''}`} role="status">{notice}</div></div>;
}
