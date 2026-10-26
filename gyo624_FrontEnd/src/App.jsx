import { useSchedule } from './lib/schedule-store'
import { actorId } from './lib/schedule'
import { useEffect, useState } from 'react'
import { Brand, Modal, PrimaryButton } from './components/ui'
import { navigate, persist, readRecords, readSettings, settingsKey, useNotice, useRoute } from './lib/state'
import { pages, teacherMenu, adminMenu, menuActive } from './screens/catalog'
import { accountHome, accountSessionKey, canAccessAdmin, isActiveAccount, readAccountId } from './lib/account'
import { previewAccounts } from './lib/preview-auth'
import Recording from './screens/Recording'
import { observationDateError } from './lib/observations'
import Settings from './screens/Settings'
import { Auth, Onboarding } from './screens/Auth'
import { BatchObservation, StudentObservation, Timeline } from './screens/Records'
import Admin from './screens/Admin'
import Timetable from './screens/Timetable'
import { TeacherAccounts, Rosters, AuditLog } from './screens/AdminManagement'
import { TeacherDashboard, Evaluations, EvaluationEditor, Career, ReportEditor, ReportCheck, ReportExport, Transfer, Notifications } from './screens/Teacher'
import './App.css'
import './components/fields.css'
import './ux.css'

const authRoutes = ['/login', '/invite', '/reset-password', '/set-password']
const formIds = { '/students': 'observation-form', '/observations/batch': 'batch-form', '/evaluations/create': 'evaluation-form', '/career': 'career-form', '/reports/edit': 'report-form', '/reports/export': 'export-form', '/transfer': 'transfer-form', '/admin/teachers': 'teacher-invite-form', '/admin/rosters': 'roster-form', '/admin/timetable': 'timetable-form', '/admin/audit': 'audit-form' }
export default function App() {
  const location = useRoute()
  const requestedRoute = location.split('?')[0] === '/records' ? '/coverage' : location.split('?')[0]
  const query = new URLSearchParams(location.split('?')[1] || '')
  const [settings, setSettings] = useState(readSettings)
  const [accountId, setAccountId] = useState(() => { try { return readAccountId(localStorage.getItem(accountSessionKey)) } catch { return null } })
  const candidate = previewAccounts().find(item => item.id === accountId)
  const account = isActiveAccount(candidate) ? candidate : null
  const route = !account && !authRoutes.includes(requestedRoute) ? '/login' : requestedRoute
  useEffect(() => { if (route !== requestedRoute) navigate(route) }, [route, requestedRoute])
  useEffect(() => { const sync = event => { if (event.key === accountSessionKey || event.key === null) setAccountId(readAccountId(localStorage.getItem(accountSessionKey))) }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync) }, [])
  const denied = route.startsWith('/admin') && !canAccessAdmin(account)
  const [records, setRecords] = useState(readRecords)
  const [notice, notify] = useNotice()
  const { state: scheduleState } = useSchedule(account, notify)
  const scheduleUnread = scheduleState.notices.filter(item => item.userId === actorId(account) && !item.read).length
  const [menu, setMenu] = useState(false)
  const page = pages[route]
  const admin = route.startsWith('/admin')
  useEffect(() => { document.title = `${denied ? '접근 권한 없음' : page?.title || (route === '/set-password' ? '비밀번호 설정' : route === '/onboarding' ? '학교 정보 설정' : route === '/invite' ? '초대 수락' : route === '/reset-password' ? '비밀번호 재설정' : '로그인')} · 교육24` }, [page, route, denied])
  function saveSettings() {
    try { persist(settingsKey, settings); notify('변경 사항을 저장했어요.') } catch { notify('저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.') }
  }
  function saveObservations(items) {
    const invalid = items.map(item => observationDateError(item.date)).find(Boolean)
    if (invalid) { notify(invalid); return false }
    if (!items.length) { notify('기록을 저장할 학생을 선택해 주세요.'); return false }
    const next = [...items.map(item => ({ ...item, id: crypto.randomUUID() })), ...records]
    try { persist('classroom-observations', next); setRecords(next); notify(`${items.length}건의 관찰을 저장했어요.`); return true } catch { notify('저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.'); return false }
  }
  function saveRecords(next) {
    try { persist('classroom-observations', next); setRecords(next); return true } catch { notify('저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.'); return false }
  }
  function login(nextAccount) {
    const next = { ...settings, name: nextAccount.name, email: nextAccount.email }
    try { persist(accountSessionKey, nextAccount.id); persist(settingsKey, next); setAccountId(nextAccount.id); setSettings(next); setMenu(false); navigate(accountHome(nextAccount)); notify('로그인했어요.'); return true } catch { notify('계정 정보를 저장하지 못했어요. 다시 시도해 주세요.'); return false }
  }
  function logout() {
    try { persist(accountSessionKey, null); setAccountId(null); setMenu(false); navigate('/login'); notify('로그아웃했어요.'); return true } catch { notify('로그아웃 정보를 저장하지 못했어요. 다시 시도해 주세요.'); return false }
  }
  const common = { onLogout: logout, account, onLogin: login, settings, setSettings, records, saveObservations, saveRecords, notify, query }
  const action = page?.action && <PrimaryButton type={formIds[route] ? 'submit' : 'button'} form={formIds[route]} onClick={route === '/settings' ? saveSettings : route === '/timeline' ? () => navigate('/students') : page.destination ? () => navigate(page.destination + (route === '/reports/check' && query.get('id') ? `?id=${query.get('id')}` : '')) : undefined}>{page.action}</PrimaryButton>
  const backPath = { '/evaluations/create': '/evaluations', '/reports/edit': '/reports', '/reports/check': '/reports', '/reports/export': '/reports', '/transfer': '/students', '/career': '/coverage', '/settings': '/coverage', '/admin/settings': '/admin' }[route]
  const navigation = <><p className="space-label">{admin ? '학교 운영' : '수업과 학생'}</p><nav className="side-nav" aria-label={admin ? '관리자 메뉴' : '교사 메뉴'}>{(admin ? adminMenu : teacherMenu).map(([label, path]) => <a key={path} href={`#${path}`} onClick={() => setMenu(false)} aria-current={menuActive(path, route) ? 'page' : undefined}>{label}{path.endsWith('/notifications') && scheduleUnread > 0 && <span className="nav-unread" aria-label={`읽지 않은 알림 ${scheduleUnread}개`}>{scheduleUnread}</span>}</a>)}</nav></>

  return <>
    {denied ? <main className="not-found"><Brand /><h1>접근 권한이 없어요</h1><p>현재 계정으로 이용할 수 없는 페이지예요.</p><a href="#/coverage">교사 홈으로 돌아가기</a></main> : authRoutes.includes(route) ? <Auth key={route} route={route} {...common} /> : route === '/onboarding' ? <Onboarding {...common} /> : page ? <div className={`app-shell ${admin ? 'admin-shell' : ''}`}>
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>본문으로 이동</a>
      <aside className="sidebar">
        <Brand /><div className="sidebar-scroll">{navigation}</div>
        <button type="button" className="profile-button" onClick={() => navigate(admin ? '/admin/settings' : '/settings')}><span>{`${settings.name} ${admin ? '관리자' : '선생님'}`}</span><span className="avatar">{settings.name.slice(0, 1)}</span></button>
      </aside>
      <header className="topbar"><span>{settings.year}학년도 · {settings.school}</span><button type="button" onClick={() => navigate(admin ? '/admin/settings' : '/settings')}>{admin ? '관리자' : `${settings.name} 선생님`}</button></header>
      <div className="workspace">
        <header className="mobile-brand"><Brand label="교육24" onClick={() => setMenu(true)} /></header>
        <main id="main-content" className={`screen screen-${page.code}`} tabIndex={-1}>
          <>{backPath && <a className="back-link" href={`#${backPath}`}>← 취소하고 {backPath === '/evaluations' ? '평가 목록' : backPath === '/reports' ? '학생 기록 보드' : backPath === '/students' ? '학생별 관찰' : '홈'}으로</a>}</><div className="screen-heading"><div><h1>{page.title}</h1><p className="page-description">{page.description}</p></div><div className="desktop-action">{action}</div></div>
          {route === '/timeline' && <Timeline key={route} {...common} />}
          {route === '/students' && <StudentObservation key={route} {...common} />}
          {route === '/observations/batch' && <BatchObservation key={route} {...common} />}
          {['/settings', '/admin/settings'].includes(route) && <Settings key={route} {...common} />}
          {route === '/coverage' && <TeacherDashboard key={route} type="coverage" {...common} />}
          {route === '/evaluations' && <Evaluations key={route} {...common} />}
          {route === '/evaluations/create' && <EvaluationEditor key={location} {...common} />}
          {route === '/career' && <Career key={route} {...common} />}
          {route === '/reports' && <TeacherDashboard key={route} type="reports" {...common} />}
          {route === '/reports/edit' && <ReportEditor key={location} {...common} />}
          {route === '/reports/check' && <ReportCheck key={location} {...common} />}
          {route === '/reports/export' && <ReportExport key={route} {...common} />}
          {route === '/transfer' && <Transfer key={route} {...common} />}
          {route === '/recording' && <Recording key={route} {...common} />}
          {(route === '/notifications' || route === '/admin/notifications') && <Notifications key={route} {...common} />}
          {route === '/admin' && <Admin />}
          {route === '/admin/teachers' && <TeacherAccounts key={route} {...common} />}
          {route === '/admin/rosters' && <Rosters key={route} {...common} />}
          {(route === '/admin/timetable' || route === '/timetable') && <Timetable key={route} {...common} admin={admin} />}
          {route === '/admin/audit' && <AuditLog key={route} {...common} />}
        </main>
        <footer className="mobile-footer">{action}<nav className="bottom-nav" aria-label="하단 메뉴">
          {(admin ? [['현황', '/admin', 'admin'], ['교사', '/admin/teachers', 'admin-teachers'], ['시간표', '/admin/timetable', 'admin-timetable']] : [['홈', '/coverage', 'records'], ['학생', '/students', 'students'], ['타임라인', '/timeline', 'timeline']]).map(([label, path, group]) => <a key={path} href={`#${path}`} aria-current={page.group === group ? 'page' : undefined}>{label}</a>)}
          <button type="button" onClick={() => setMenu(true)} aria-label="더보기" aria-expanded={menu}>더보기</button>
        </nav></footer>
      </div>
    </div> : <main className="not-found"><h1>페이지를 찾을 수 없어요</h1><a href="#/coverage">홈으로 이동</a></main>}
    <div className={`toast${notice ? ' is-visible' : ''}`} role="status">{notice}</div>
    {menu && !denied && <Modal title={admin ? '교육24 관리자 메뉴' : '교육24 메뉴'} className="navigation-drawer" onClose={() => setMenu(false)}>{navigation}</Modal>}

  </>
}
