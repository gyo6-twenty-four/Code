import { useEffect, useState } from 'react';
import { Brand, Modal, SchoolBrand } from './components/ui';
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
import { onNeisSchool, readNeisSchool } from './api/neis';
import './App.css';
import './components/fields.css';
import './ux.css';
import './api/api.css';
import './polish.css';
import './theme.css';
const publicRoutes = ['/login', '/invite', '/set-password', '/reset-password'];
const titles = {
  '/coverage': '나의 수업',
  '/timetable': '나의 시간표',
  '/students': '학생별 관찰 기록',
  '/observations/batch': '학급 일괄 관찰',
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
const descriptions = {
  '/coverage': '이번 달 수업과 선택한 날의 교시를 확인해요.',
  '/timetable': '요일과 교시별 수업을 확인해요.',
  '/students': '학생 한 명의 관찰을 이어서 적어요.',
  '/observations/batch': '같은 수업의 관찰을 학급 단위로 적어요.',
  '/career': '진로 활동과 상담 내용을 남겨요.',
  '/reports': '학생별 생기부 작성 상태를 봐요.',
  '/reports/edit': '관찰을 바탕으로 항목을 다듬어요.',
  '/reports/check': '저장 전에 내용을 확인해요.',
  '/admin/transfer': '학년도가 바뀐 학생의 기록을 옮겨요.',
  '/notifications': '확인하지 않은 알림을 모아요.',
  '/settings': '이름, 알림, 로그인 정보를 바꿔요.',
  '/admin': '학교 기록 작성이 어디까지 됐는지 봐요.',
  '/admin/teachers': '교사 계정과 작성할 수 있는 생기부를 관리해요.',
  '/admin/rosters': '학급과 학생 명단을 관리해요.',
  '/admin/timetable': '학급 시간표를 확인해요.',
  '/admin/audit': '누가 무엇을 바꿨는지 확인해요.',
  '/admin/settings': '이름, 알림, 로그인 정보를 바꿔요.',
  '/admin/notifications': '확인하지 않은 알림을 모아요.'
};
function NavIcon({ name }) {
  const icons = {
    home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9.8V20h12V9.8" /><path d="M10 20v-5h4v5" /></>,
    calendar: <path d="M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.2c1.3-3 3.6-4.4 6.5-4.4s5.2 1.4 6.5 4.4" /></>,
    users: <><circle cx="9" cy="8.2" r="2.8" /><path d="M3.8 18.8c.9-2.5 2.8-3.8 5.2-3.8s4.3 1.3 5.2 3.8" /><circle cx="16.6" cy="9" r="2.1" /><path d="M15.4 15.2c1.5.4 2.7 1.4 3.4 2.8" /></>,
    compass: <><circle cx="12" cy="12" r="8" /><path d="m15.4 8.6-1.8 4.8-4.8 1.8 1.8-4.8z" /></>,
    file: <><path d="M7 3.5h7.2L18 7.3V20.5H7z" /><path d="M14 3.6V8h4" /><path d="M10 12.2h5M10 16h5" /></>,
    bell: <><path d="M6 9.2a6 6 0 0 1 12 0c0 4.6 1.4 6.3 1.4 6.3H4.6S6 13.8 6 9.2" /><path d="M10 19.2a2 2 0 0 0 4 0" /></>,
    settings: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
    list: <><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.5" cy="6.5" r="1.15" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.15" fill="currentColor" stroke="none" /><circle cx="4.5" cy="17.5" r="1.15" fill="currentColor" stroke="none" /></>,
    transfer: <><path d="M7 7h11" /><path d="m15 4 3 3-3 3" /><path d="M17 17H6" /><path d="m9 14-3 3 3 3" /></>,
    history: <><path d="M4.5 12a7.5 7.5 0 1 0 2.1-5.2" /><path d="M4.2 4.2v4.2h4.2" /><path d="M12 8v4.5l2.8 1.8" /></>
  };
  return <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}
const teacherMenu = [['수업', [['홈', '/coverage', 'home'], ['나의 시간표', '/timetable', 'calendar']]], ['기록', [['학생별 관찰', '/students', 'user'], ['학급 일괄 관찰', '/observations/batch', 'users'], ['진로', '/career', 'compass'], ['생기부', '/reports', 'file']]], ['계정', [['알림함', '/notifications', 'bell'], ['설정', '/settings', 'settings']]]];
const adminMenu = [['운영', [['관리자 홈', '/admin', 'home'], ['교사 계정', '/admin/teachers', 'users'], ['명단 관리', '/admin/rosters', 'list'], ['시간표 관리', '/admin/timetable', 'calendar']]], ['기록', [['학생 기록 이관', '/admin/transfer', 'transfer'], ['변경 이력', '/admin/audit', 'history']]], ['계정', [['알림함', '/admin/notifications', 'bell'], ['설정', '/admin/settings', 'settings']]]];
export default function App() {
  const location = useRoute(),
    requested = location.split('?')[0] === '/records' ? '/coverage' : location.split('?')[0],
    query = new URLSearchParams(location.split('?')[1] || '');
  const [account, setAccount] = useState(null),
    [initializing, setInitializing] = useState(true),
    [restoreError, setRestoreError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const [notice, notify] = useNotice(),
    [menu, setMenu] = useState(false),
    [neisSchool, setNeisSchool] = useState(readNeisSchool);
  useEffect(() => onNeisSchool(() => setNeisSchool(readNeisSchool())), []);
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
    document.title = `${titles[route] || (route === '/onboarding' ? '사용 환경 설정' : '학교 계정')}, 교육24`;
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
  function changeYear(next) {
    const number = Number(next);
    if (!Number.isInteger(number) || number < 2000 || number > 2100) return;
    setYear(String(number));
    classes.setPage(1);
    selectClass('');
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
  const menuGroups = adminRoute ? adminMenu : teacherMenu;
  const nav = <nav className="side-nav" aria-label={adminRoute ? '관리자 메뉴' : '교사 메뉴'}>{menuGroups.map(([section, items]) => <div className="nav-group" key={section}><p className="space-label">{section}</p>{items.map(([label, path, icon]) => <a key={path} href={`#${path}`} aria-current={route === path ? 'page' : undefined} onClick={() => setMenu(false)}><NavIcon name={icon} /><span className="nav-label">{label}</span>{path.endsWith('/notifications') && count > 0 && <span className="nav-unread">{count}</span>}</a>)}</div>)}</nav>;
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
  const homePath = adminRoute ? '/admin' : '/coverage';
  const studentPath = adminRoute ? '/admin/rosters' : '/students';
  const noticePath = adminRoute ? '/admin/notifications' : '/notifications';
  const schoolName = [account.school?.name, account.schoolName, neisSchool?.schoolName].find(value => typeof value === 'string' && value.trim()) || '';
  const settingsPath = adminRoute ? '/admin/settings' : '/settings';
  return <div className={`app-shell ${adminRoute ? 'admin-shell' : ''}`}><a className="skip-link" href="#main-content" onClick={e => {
      e.preventDefault();
      document.getElementById('main-content')?.focus();
    }}>본문으로 이동</a><aside className="sidebar"><SchoolBrand name={schoolName} href={`#${settingsPath}`} /><div className="sidebar-scroll">{nav}</div><a className="profile-button" href={`#${adminRoute ? '/admin/settings' : '/settings'}`}><span className="avatar" aria-hidden="true">{(account.name || '교').slice(0, 1)}</span><span className="profile-copy"><strong>{account.name}</strong><span>{admin ? '관리자' : '선생님'}</span></span></a></aside><header className="topbar"><span>{year}학년도</span></header><div className="workspace"><header className="mobile-brand"><SchoolBrand name={schoolName} onClick={() => setMenu(true)} /></header><main id="main-content" tabIndex={-1} className="screen"><div className="screen-heading"><div className="screen-title"><h1>{titles[route] || '메뉴 안내'}</h1>{descriptions[route] && <p className="page-description">{descriptions[route]}</p>}</div><div className="heading-tools"><div className="year-switch" role="group" aria-label="학년도"><button type="button" aria-label="이전 학년도" disabled={Number(year) <= 2000} onClick={() => changeYear(Number(year) - 1)}>‹</button><strong>{year}</strong><button type="button" aria-label="다음 학년도" disabled={Number(year) >= 2100} onClick={() => changeYear(Number(year) + 1)}>›</button>{String(year) !== currentYear && <button type="button" onClick={() => changeYear(currentYear)}>올해</button>}</div>{route === '/coverage' && <a className="primary-button" href="#/timetable">시간표 보기</a>}</div></div><div key={`${account.id}:${route}:${classId}:${studentId}:${year}`}>{screen}</div></main><footer className="mobile-footer"><nav className="bottom-nav" aria-label="하단 메뉴"><a href={`#${homePath}`} aria-current={route === homePath ? 'page' : undefined}>홈</a><a href={`#${studentPath}`} aria-current={route === studentPath ? 'page' : undefined}>학생</a><a href={`#${noticePath}`} aria-current={route === noticePath ? 'page' : undefined}>알림{count > 0 ? ` ${count}` : ''}</a><button type="button" onClick={() => setMenu(true)}>더보기</button></nav></footer></div>{menu && <Modal title="전체 메뉴" className="navigation-drawer" onClose={() => setMenu(false)}>{nav}</Modal>}<div className={`toast${notice ? ' is-visible' : ''}`} role="status">{notice}</div></div>;
}
