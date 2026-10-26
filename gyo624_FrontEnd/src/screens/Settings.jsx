import '../components/dashboard-calendar.css'
import { accountHome } from '../lib/account'
import { useState } from 'react'
import { persist, settingsKey } from '../lib/state'
import { Field, Filters, InfoPanel, ListRow, Modal, PrimaryButton } from '../components/ui'

export default function Settings({ settings, setSettings, notify, account, onLogout }) {
  const [filter, setFilter] = useState('전체')
  const [changed, setChanged] = useState([])
  const [editor, setEditor] = useState(null)
  const rows = [
    ['account', '내 계정', `${settings.name} ${accountHome(account) === '/admin' ? '관리자' : '선생님'} · ${settings.email}`, '관리'],
    ['school', '학교 정보 설정', `${settings.school} · ${settings.grade}학년 ${settings.classroom}반`, '설정'],
    ['login', '계정 · 로그인', '다른 계정 로그인과 계정 복구', '보기'],
    ['notifications', '알림 설정', '기록 검토 · 학급 변경', settings.notifications ? '켜짐' : '꺼짐'],
    ['display', '표시 환경', `${settings.year}학년도 · ${settings.grade}학년 ${settings.classroom}반`, '관리'],
    ['privacy', '개인정보 안내', '기록 접근 권한과 보관 안내', '보기'],
  ]
  const visible = rows.filter(([id]) => filter === '전체' || (filter === '담당 학급' ? id === 'display' : changed.includes(id)))
  return <>
    <Filters value={filter} onChange={setFilter} />
    <div className="content-columns">
      <div className="settings-list">{visible.map(([id, title, detail, meta]) => <ListRow className={id === 'privacy' ? 'desktop-only' : ''} key={id} title={title} detail={detail} meta={meta} href={id === 'school' ? '/onboarding' : id === 'login' ? '/login' : undefined} onClick={() => setEditor(id)} />)}{visible.length === 0 && <p className="empty-state">최근 변경한 설정이 없어요.</p>}</div>
      <InfoPanel title="계정 도움말" lines={['학교 관리자는 계정 권한을 관리해요', '개인 설정은 언제든 바꿀 수 있어요']} />
    </div>
    <section className="logout-section" aria-label="로그아웃"><div><h2>로그아웃</h2><p>현재 계정에서 나와 로그인 화면으로 이동해요.</p></div><button type="button" className="secondary-button danger" onClick={onLogout}>로그아웃</button></section>
    {editor && <Editor key={editor} section={editor} settings={settings} account={account} onClose={() => setEditor(null)} onApply={(next) => { try { persist(settingsKey, next); setSettings(next); setChanged(previous => [...new Set([...previous, editor])]); setEditor(null); notify('설정을 저장했어요.') } catch { notify('저장하지 못했어요. 다시 시도해 주세요.') } }} />}
  </>
}
function Editor({ section, settings, account, onClose, onApply }) {
  const [draft, setDraft] = useState(settings)
  const titles = { account: '내 계정', notifications: '알림 설정', display: '표시 환경', privacy: '개인정보 안내' }
  const change = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  return <Modal title={titles[section]} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onApply({ ...draft, name: draft.name.trim(), email: draft.email.trim() }) }}>
    {section === 'account' && <><Field label="이름" required pattern=".*\S.*" maxLength={30} autoComplete="name" value={draft.name} onChange={change('name')} /><Field label="이메일" type="email" required autoComplete="email" value={draft.email} onChange={change('email')} /><p className="dialog-hint">계정 역할: {accountHome(account) === '/admin' ? '관리자' : '교사'}. 로그인한 계정 정보에 따라 자동 적용돼요.</p></>}
    {section === 'notifications' && <label className="notification-control"><span>기록 검토 · 학급 변경<span className="dialog-hint">알림 수신 여부를 설정해요.</span></span><input type="checkbox" role="switch" className="switch" checked={draft.notifications} onChange={e => setDraft({ ...draft, notifications: e.target.checked })} /></label>}
    {section === 'display' && <><Field label="학년도" value={draft.year} onChange={change('year')}>{['2025', '2026', '2027'].map(year => <option key={year} value={year}>{year}학년도</option>)}</Field><div className="class-fields"><Field label="학년" value={draft.grade} onChange={change('grade')}>{[1, 2, 3, 4, 5, 6].map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</Field><Field label="반" required value={draft.classroom} onChange={change('classroom')}>{Array.from({ length: 99 }, (_, i) => <option key={i} value={i + 1}>{i + 1}반</option>)}</Field></div></>}
    {section === 'privacy' ? <><p className="dialog-hint">학생 기록은 담당 업무에 필요한 범위에서만 열람해 주세요. 내보낸 파일은 학교의 보관 기준에 따라 관리하고 다른 사람과 계정을 공유하지 마세요.</p><PrimaryButton className="dialog-apply" onClick={onClose}>확인</PrimaryButton></> : <PrimaryButton type="submit" className="dialog-apply">설정 저장하기</PrimaryButton>}
  </form></Modal>
}
