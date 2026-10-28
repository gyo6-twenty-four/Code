import { useState } from 'react';
import { clearSession } from './client';
import { navigate } from '../lib/state';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { useMutation, useResource, usePage } from './hooks';
import { ApiState, JsonDetails, MutationError, Pagination, SaveButton } from './shared';
import PhoneField from '../components/PhoneField';
import { phoneDigits } from '../lib/phone';
export default function Settings({
  account,
  notify,
  onLogout,
  updateProfile
}) {
  const profile = useResource('/settings/profile'),
    notifications = useResource('/settings/notifications'),
    school = useResource(account.role === 'ADMIN' ? '/settings/school' : null);
  const [draft, setDraft] = useState(null),
    [kind, setKind] = useState('');
  const mutation = useMutation(notify);
  function edit(key, value) {
    setKind(key);
    setDraft({
      ...value
    });
  }
  return <section className="api-stack"><ApiState state={profile}><article className="api-panel"><h2>내 계정</h2><p>{profile.data?.name} · {account.email}</p><button className="text-button" type="button" onClick={() => edit('profile', profile.data)}>이름·연락처 변경</button></article></ApiState><ApiState state={notifications}><article className="api-panel"><h2>알림 설정</h2><p>이메일 · 서비스 내 알림</p><button className="text-button" type="button" onClick={() => edit('notifications', notifications.data)}>알림 채널 변경</button></article></ApiState>{account.role === 'ADMIN' && <ApiState state={school}><article className="api-panel"><h2>학교 정보</h2><JsonDetails value={school.data} /><button className="text-button" type="button" onClick={() => edit('school', school.data)}>학교 정보 변경</button></article></ApiState>}<PrimaryButton onClick={() => edit('password/change', {
      currentPassword: '',
      newPassword: '',
      passwordConfirmation: ''
    })}>비밀번호 변경</PrimaryButton><section className="logout-section"><h2>로그아웃</h2><button className="secondary-button danger" type="button" onClick={onLogout}>로그아웃</button></section>{draft && <Modal title={{
      profile: '내 계정',
      notifications: '알림 설정',
      school: '학교 정보',
      'password/change': '비밀번호 변경'
    }[kind]} onClose={() => setDraft(null)}><form className="api-stack" onSubmit={async e => {
        e.preventDefault();
        if (kind === 'password/change' && draft.newPassword !== draft.passwordConfirmation) {
          notify('새 비밀번호 확인이 일치하지 않아요.');
          return;
        }
        const body = kind === 'profile' ? {
          name: draft.name,
          phone: phoneDigits(draft.phone)
        } : kind === 'school' ? {
          name: draft.name
        } : kind === 'notifications' ? {
          notificationEmail: !!draft.notificationEmail,
          notificationInApp: !!draft.notificationInApp
        } : draft;
        if (await mutation.run(`/settings/${kind}`, {
          method: kind === 'password/change' ? 'POST' : 'PATCH',
          body
        }, '설정을 변경했어요.')) {
          setDraft(null);
          if (kind === 'password/change') { clearSession(); navigate('/login'); notify('비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.'); return; }
          profile.reload();
          notifications.reload();
          school.reload();
          if (kind === 'profile') updateProfile();
        }
      }}>{kind === 'profile' ? <><Field label="이름" required value={draft.name || ''} onChange={e => setDraft({
            ...draft,
            name: e.target.value
          })} /><PhoneField value={draft.phone || ''} onChange={phone => setDraft({
            ...draft,
            phone
          })} /></> : kind === 'school' ? <Field label="학교 이름" required value={draft.name || ''} onChange={e => setDraft({
          ...draft,
          name: e.target.value
        })} /> : kind === 'notifications' ? <>{[['notificationEmail', '이메일 알림'], ['notificationInApp', '서비스 내 알림']].map(([key, label]) => <label className="notification-control" key={key}><span>{label}</span><input type="checkbox" role="switch" className="switch" checked={!!draft[key]} onChange={e => setDraft({
              ...draft,
              [key]: e.target.checked
            })} /></label>)}</> : <>{[['currentPassword', '현재 비밀번호'], ['newPassword', '새 비밀번호'], ['passwordConfirmation', '새 비밀번호 확인']].map(([key, label]) => <Field key={key} label={label} type="password" required minLength={key === 'currentPassword' ? undefined : 8} value={draft[key]} onChange={e => setDraft({
            ...draft,
            [key]: e.target.value
          })} />)}</>}<SaveButton mutation={mutation} /></form></Modal>}</section>;
}
export function Notifications({
  notify,
  refreshUnread
}) {
  const [status, setStatus] = useState(''),
    [type, setType] = useState(''),
    [detail, setDetail] = useState(null);
  const list = usePage('/notifications', {
      status,
      type
    }),
    mutation = useMutation(notify);
  async function changed(path, method) {
    if (await mutation.run(path, {
      method
    }, '알림을 처리했어요.')) {
      list.reload();
      refreshUnread();
    }
  }
  return <section className="api-stack"><div className="api-toolbar"><Field label="읽음 상태" value={status} onChange={e => {
        setStatus(e.target.value);
        list.setPage(1);
      }}><option value="">전체</option><option value="UNREAD">읽지 않음</option></Field><Field label="알림 종류" value={type} onChange={e => {
        setType(e.target.value);
        list.setPage(1);
      }}><option value="">전체</option><option value="INVITATION">초대</option></Field><PrimaryButton disabled={mutation.busy} onClick={() => changed('/notifications/read-all', 'POST')}>전체 읽음</PrimaryButton></div><ApiState state={list}>{list.data?.map(item => <article className="api-panel" key={item.id}><h2>{item.title}</h2><p className="detail-copy">{item.message || item.content || item.body}</p><p>{item.createdAt}</p><button className="text-button" type="button" disabled={mutation.busy} onClick={() => changed(`/notifications/${item.id}/read`, 'PATCH')}>읽음 표시</button><button className="text-button danger" type="button" onClick={() => setDetail(item)}>알림 삭제</button></article>)}</ApiState><Pagination state={list} /><MutationError mutation={mutation} />{detail && <Modal title="알림 삭제" onClose={() => setDetail(null)}><p>{detail.title} 알림을 삭제할까요?</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
        if (await mutation.run(`/notifications/${detail.id}`, {
          method: 'DELETE'
        }, '알림을 삭제했어요.')) {
          setDetail(null);
          list.reload();
          refreshUnread();
        }
      }}>삭제 확인</PrimaryButton><MutationError mutation={mutation} /></Modal>}</section>;
}
