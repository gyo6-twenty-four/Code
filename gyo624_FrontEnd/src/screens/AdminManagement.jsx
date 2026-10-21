import { registeredTeachers } from '../lib/registry'
import { useState } from 'react'
import { Field, Filters, InfoPanel, ListRow, Modal, PrimaryButton } from '../components/ui'
import { ClassroomEditor, ClassroomField } from '../components/ClassroomField'
import { normalizeClassroom } from '../lib/classrooms'
import { useCollection } from '../lib/state'
import { downloadDelimited } from '../lib/export'
import { appendAudit, auditSeed, rosterSeed, teacherSeed } from './AdminData'

function logChange(action, target, notify) { if (!appendAudit(action, target)) notify('변경은 저장했지만 감사 로그를 저장하지 못했어요.') }
export function TeacherAccounts({ notify }) {
  const [items, save] = useCollection('classroom-teachers', teacherSeed, notify)
  const [filter, setFilter] = useState('전체')
  const [editor, setEditor] = useState(null)
  const [draft, setDraft] = useState(null)
  const edit = item => { setEditor(item?.id || 'new'); setDraft(item ? { ...item } : { name: '', email: '', role: '교사', classroom: '', status: '대기' }) }
  const visible = filter === '초대 대기' ? items.filter(item => item.status === '대기') : filter === '담당 학급' ? items.filter(item => item.classroom) : items
  return <><Filters items={['전체', '초대 대기', '담당 학급']} value={filter} onChange={setFilter} /><form id="teacher-invite-form" className="content-columns" onSubmit={e => { e.preventDefault(); edit(null) }}><div className="settings-list">{visible.map(item => <ListRow key={item.id} title={item.name} detail={item.status === '대기' ? (item.id === 'jung' ? '초대 메일을 보냈어요' : '초대 정보 · 미리보기') : item.role === '관리자' ? '학교 관리자' : `${item.classroom || '학급 미배정'} · 교사`} meta={item.status} onClick={() => edit(item)} />)}{!visible.length && <p className="empty-state">해당하는 계정이 없어요.</p>}</div><InfoPanel title="계정 관리 안내" lines={['역할은 필요한 범위로 부여해요', '초대 링크는 학교 구성원에게만 전달해요']} /></form>
    {editor && <Modal title={editor === 'new' ? '교사 초대하기' : '교사 계정 관리'} onClose={() => setEditor(null)}><form onSubmit={e => {
      e.preventDefault()
      if (!draft.name.trim()) return
      if (items.some(item => item.email.toLowerCase() === draft.email.trim().toLowerCase() && item.id !== editor)) { notify('이미 등록된 학교 이메일이에요.'); return }
      const next = { ...draft, id: editor === 'new' ? crypto.randomUUID() : editor, name: draft.name.trim(), email: draft.email.trim(), classroom: normalizeClassroom(draft.classroom) }
      if (save(editor === 'new' ? [next, ...items] : items.map(item => item.id === editor ? next : item), editor === 'new' ? '초대 정보를 브라우저에 저장했어요. 실제 메일 발송은 연결 후 가능해요.' : '계정 미리보기 정보를 이 브라우저에 저장했어요.')) { logChange(editor === 'new' ? '교사 초대 정보 작성' : '계정 정보 변경', next.name, notify); setEditor(null) }
    }}><Field label="교사 이름" required pattern=".*\S.*" maxLength={30} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /><Field label="학교 이메일" type="email" required value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /><Field label="역할" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}><option>교사</option><option>관리자</option></Field><ClassroomField label="담당 학급" optional value={draft.classroom} onChange={e => setDraft({ ...draft, classroom: e.target.value })} />{editor !== 'new' && <Field label="계정 상태" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option>활성</option><option>대기</option><option>관리자</option><option>비활성</option></Field>}<p className="dialog-hint">현재는 계정 UI 미리보기예요. 실제 계정 권한 변경이나 메일 발송은 이루어지지 않아요.</p><PrimaryButton type="submit" className="dialog-apply">{editor === 'new' ? '초대 정보 저장하기' : '변경 사항 저장하기'}</PrimaryButton></form></Modal>}
  </>
}
export function Rosters({ notify }) {
  const [items, save] = useCollection('classroom-rosters', rosterSeed, notify)
  const [filter, setFilter] = useState('전체')
  const [editor, setEditor] = useState(null)
  const [draft, setDraft] = useState(null)
  const edit = item => { setEditor(item?.id || 'new'); setDraft(item ? { ...item } : { classroom: '', count: '1', teacher: '', status: '검토' }) }
  const visible = filter === '검토 필요' ? items.filter(item => item.status === '검토') : filter === '담당 학급' ? items.filter(item => item.teacher === '김지현') : items
  return <><Filters items={['전체', '검토 필요', '담당 학급']} value={filter} onChange={setFilter} /><form id="roster-form" className="content-columns" onSubmit={e => { e.preventDefault(); edit(null) }}><div className="settings-list">{visible.map(item => <ListRow key={item.id} title={item.classroom} detail={`학생 ${item.count}명 · 담임 ${item.teacher}`} meta={item.status} onClick={() => edit(item)} />)}{!visible.length && <p className="empty-state">해당하는 학급 명단이 없어요.</p>}</div><InfoPanel title="학급 명단 안내" lines={['학년과 반을 선택해 학급을 만들어요', '담임 교사와 학생 수를 확인해 주세요', '이미 등록한 학급은 목록에서 수정해요']} /></form>
    {editor && <Modal title={editor === 'new' ? '학생 명단 추가하기' : '학급 명단 확인'} onClose={() => setEditor(null)}><form onSubmit={e => {
      e.preventDefault()
      if (!normalizeClassroom(draft.classroom)) { notify('학년과 반을 선택해 주세요.'); return }
      if (!registeredTeachers().includes(draft.teacher)) { notify('등록된 담임 교사를 선택해 주세요.'); return }
      if (items.some(item => normalizeClassroom(item.classroom) === normalizeClassroom(draft.classroom) && item.id !== editor)) { notify('이미 등록된 학급이에요. 기존 명단을 선택해 수정해 주세요.'); return }
      const next = { ...draft, id: editor === 'new' ? crypto.randomUUID() : editor, classroom: normalizeClassroom(draft.classroom), teacher: draft.teacher.trim(), count: Number(draft.count) }
      if (save(editor === 'new' ? [next, ...items] : items.map(item => item.id === editor ? next : item), '학급 명단 요약을 이 브라우저에 저장했어요.')) { logChange('명단 요약 변경', next.classroom, notify); setEditor(null) }
    }}><ClassroomEditor value={draft.classroom} onChange={classroom => setDraft({ ...draft, classroom })} /><Field label="담임 교사" required value={draft.teacher} onChange={e => setDraft({ ...draft, teacher: e.target.value })}><option value="">담임 교사 선택</option>{registeredTeachers().map(name => <option key={name}>{name}</option>)}</Field><Field label="명단 학생 수" type="number" required min="1" max="100" value={draft.count} onChange={e => setDraft({ ...draft, count: e.target.value })} /><Field label="확인 상태" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option>검토</option><option>확인</option></Field><p className="dialog-hint">학급별 학생 수와 담당 교사 정보를 관리하는 화면이에요.</p><PrimaryButton type="submit" className="dialog-apply">명단 정보 저장하기</PrimaryButton></form></Modal>}
  </>
}
export function AuditLog({ notify }) {
  const [items] = useCollection('classroom-audit', auditSeed, notify)
  const [filter, setFilter] = useState('전체')
  const [detail, setDetail] = useState(null)
  const visible = filter === '최근 기록' ? items.slice(0, 3) : filter === '담당 학급' ? items.filter(item => item.target.includes('학년')) : items
  return <><Filters value={filter} onChange={setFilter} /><form id="audit-form" className="content-columns" onSubmit={e => { e.preventDefault(); downloadDelimited('교육24-감사로그.csv', [['시간', '사용자', '작업', '대상', '접속'], ...visible.map(item => [item.timestamp, item.actor, item.action, item.target, item.channel])]); notify('현재 표시된 로그를 CSV로 내보냈어요.') }}><div className="settings-list">{visible.map(item => <ListRow key={item.id} className={item.id === 'audit-4' ? 'desktop-only' : ''} title={`${item.timestamp} · ${item.actor}`} detail={`${item.action} · ${item.target}`} meta={item.channel} onClick={() => setDetail(item)} />)}{!visible.length && <p className="empty-state">해당하는 변경 내역이 없어요.</p>}</div><InfoPanel title="로그 안내" lines={['운영 확인을 위한 변경 내역이에요', '화면에는 학생 상세 기록을 표시하지 않아요']} /></form>{detail && <Modal title="변경 내역" onClose={() => setDetail(null)}><p className="detail-copy">{detail.timestamp} · {detail.actor}</p><p className="dialog-hint">{detail.action} · {detail.target}</p><p className="dialog-hint">현재 브라우저에서 확인하는 운영 UI 예시 로그입니다.</p><PrimaryButton className="dialog-apply" onClick={() => setDetail(null)}>확인</PrimaryButton></Modal>}</>
}
