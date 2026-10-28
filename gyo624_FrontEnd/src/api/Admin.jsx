import { className, statusLabel } from './model';
import { useState } from 'react';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { resource } from './client';
import { useMutation, usePage, useResource } from './hooks';
import { ApiState, ClassSelect, JsonDetails, MutationError, Pagination, SaveButton } from './shared';
export function AdminHome({
  year
}) {
  const summary = useResource(resource('/admin/dashboard/summary', {
      schoolYear: year
    })),
    completion = useResource(resource('/admin/dashboard/completion', {
      schoolYear: year
    })),
    activity = useResource(resource('/admin/dashboard/activity', {
      schoolYear: year
    }));
  return <section className="api-stack"><ApiState state={summary}><div className="metric-grid">{[['교사', 'teacherCount'], ['학급', 'classCount'], ['학생', 'studentCount'], ['작성률 (%)', 'recordCompletionRate'], ['초대 대기', 'pendingInvitations'], ['내용 확인 필요', 'gateFailureCount']].map(([label, key]) => <article className="metric-card" key={key}><h2>{label}</h2><p className="metric-value">{summary.data?.[key] ?? '—'}</p></article>)}</div></ApiState><section className="api-panel"><h2>학급별 작성 현황</h2><ApiState state={completion}><JsonDetails value={completion.data} /></ApiState></section><section className="api-panel"><h2>최근 변경 현황</h2><ApiState state={activity}><JsonDetails value={activity.data} /></ApiState></section></section>;
}
export function Teachers({
  classes,
  notify,
  account
}) {
  const [keyword, setKeyword] = useState(''),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState(null),
    [bulk, setBulk] = useState(false),
    [bulkText, setBulkText] = useState(''),
    [confirm, setConfirm] = useState(false),
    [delivery, setDelivery] = useState(null);
  const list = usePage('/admin/teachers', {
      keyword: search
    }),
    mutation = useMutation(notify);
  const guardsSelf = draft?.id === account.id && draft.role !== 'ADMIN';
  const form = <><Field label="이름" required value={draft?.name || ''} onChange={e => setDraft({
      ...draft,
      name: e.target.value
    })} /><Field label="이메일" type="email" required readOnly={!!draft?.id} value={draft?.email || ''} onChange={e => setDraft({
      ...draft,
      email: e.target.value
    })} /><Field label="역할" value={draft?.role || 'TEACHER'} onChange={e => setDraft({
      ...draft,
      role: e.target.value
    })}><option value="TEACHER">교사</option><option value="ADMIN">관리자</option></Field><p className="dialog-hint">담당 학급은 여러 개 선택할 수 있어요.</p>{classes.data?.map(item => <label className="api-check" key={item.id}><input type="checkbox" checked={draft?.classIds?.includes(item.id) || false} onChange={e => setDraft({
        ...draft,
        classIds: e.target.checked ? [...(draft.classIds || []), item.id] : draft.classIds.filter(id => id !== item.id)
      })} />{className(item)}</label>)}</>;
  return <section className="api-stack"><form className="api-toolbar" onSubmit={e => {
      e.preventDefault();
      list.setPage(1);
      setSearch(keyword);
    }}><Field label="교사 검색" value={keyword} onChange={e => setKeyword(e.target.value)} /><PrimaryButton type="submit">검색</PrimaryButton></form><div className="exchange-actions"><PrimaryButton onClick={() => setDraft({
        name: '',
        email: '',
        role: 'TEACHER',
        classIds: []
      })}>교사 초대</PrimaryButton><button type="button" className="secondary-button" onClick={() => setBulk(true)}>일괄 초대</button></div><ApiState state={list}>{list.data?.map(item => <article className="api-panel" key={item.id}><h2>{item.name}</h2><p>{item.email} · {item.role === 'ADMIN' ? '관리자' : '교사'} · {statusLabel(item.status)}</p><button type="button" className="text-button" onClick={async () => {
          const result = await mutation.run(`/admin/teachers/${item.id}`, {
            method: 'GET'
          });
          if (result) {
            setDraft(result.data);
            setConfirm(false);
          }
        }} disabled={item.status === 'INVITED'}>계정 관리</button>{item.invitationId && <button type="button" className="text-button" disabled={mutation.busy} onClick={async () => {
          const result = await mutation.run(`/admin/teachers/invitations/${item.invitationId}/resend`, { body: {}, idempotent: true });
          if (result) { setDelivery([result.data]); list.reload(); }
        }}>초대 링크 다시 만들기</button>}</article>)}</ApiState><Pagination state={list} />{draft && <Modal title={draft.id ? '교사 계정 관리' : '교사 초대'} onClose={() => {
      setDraft(null);
      setConfirm(false);
    }}><form className="api-stack" onSubmit={async e => {
        e.preventDefault();
        if (guardsSelf) {
          notify('현재 로그인한 관리자 자신의 권한은 이 화면에서 해제할 수 없어요.');
          return;
        }
        const result = await mutation.run(draft.id ? `/admin/teachers/${draft.id}` : '/admin/teachers/invitations', {
          method: draft.id ? 'PATCH' : 'POST',
          body: {
            email: draft.email,
            name: draft.name,
            role: draft.role,
            classIds: draft.classIds || []
          },
          idempotent: !draft.id
        }, draft.id ? '계정 정보를 변경했어요.' : '초대를 생성했어요.');
        if (result) {
          if (!draft.id) setDelivery([result.data]);
          setDraft(null);
          list.reload();
        }
      }}>{form}<SaveButton mutation={mutation} disabled={guardsSelf}>{draft.id ? '변경 저장' : '초대 생성'}</SaveButton></form>{draft.id && draft.id !== account.id && <div className="api-stack"><button type="button" className="secondary-button" disabled={mutation.busy} onClick={async () => {
          if (await mutation.run(`/admin/teachers/${draft.id}/status`, {
            method: 'PATCH',
            body: {
              status: draft.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
            }
          }, '계정 상태를 변경했어요.')) {
            setDraft(null);
            list.reload();
          }
        }}>{draft.status === 'ACTIVE' ? '계정 정지' : '계정 활성화'}</button><button type="button" className="text-button danger" onClick={() => setConfirm(true)}>계정 비활성화</button>{confirm && <><p>이 계정을 비활성화할까요?</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
            if (await mutation.run(`/admin/teachers/${draft.id}`, {
              method: 'DELETE'
            }, '비활성화했어요.')) {
              setDraft(null);
              setConfirm(false);
              list.reload();
            }
          }}>비활성화 확인</PrimaryButton></>}</div>}<MutationError mutation={mutation} /></Modal>}{bulk && <Modal title="교사 일괄 초대" onClose={() => setBulk(false)}><form onSubmit={async e => {
        e.preventDefault();
        const invitations = bulkText.split('\n').filter(line => line.trim()).map(line => {
          const [email, name] = line.split(',').map(value => value.trim());
          return {
            email,
            name,
            role: 'TEACHER',
            classIds: []
          };
        });
        if (invitations.some(item => !item.name || !item.email?.includes('@'))) {
          notify('각 줄에 이메일, 이름을 입력해 주세요.');
          return;
        }
        const result = await mutation.run('/admin/teachers/invitations/bulk', {
          body: {
            invitations
          },
          idempotent: true
        }, '초대 링크를 생성했어요.');
        if (result) {
          setDelivery(result.data.invitations);
          setBulk(false);
          list.reload();
        }
      }}><Field label="이메일, 이름 (한 줄에 한 명)" multiline required value={bulkText} onChange={e => setBulkText(e.target.value)} /><SaveButton mutation={mutation}>초대 생성</SaveButton></form></Modal>}{delivery && <Modal title="학교 초대 링크" onClose={() => setDelivery(null)}><div className="api-stack"><p>초대받을 교사에게 아래 링크를 전달해 주세요. 링크에서 비밀번호를 설정하고 가입할 수 있어요.</p>{delivery.map(item => <article className="api-panel api-stack" key={item.invitationId || item.id}><strong>{item.email}</strong><Field label="초대 링크" readOnly value={item.invitationUrl ? new URL(item.invitationUrl, window.location.origin).href : ''} onFocus={e => e.target.select()} />{item.expiresAt && <p>만료: {item.expiresAt}</p>}<button type="button" className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(new URL(item.invitationUrl, window.location.origin).href); notify('초대 링크를 복사했어요.'); } catch { notify('초대 링크를 선택해 복사해 주세요.'); } }}>링크 복사</button></article>)}</div></Modal>}<MutationError mutation={mutation} /></section>;
}
export function Rosters({
  classes,
  classId,
  selectClass,
  students,
  year,
  notify
}) {
  const [draft, setDraft] = useState(null),
    [studentDraft, setStudentDraft] = useState(null),
    [remove, setRemove] = useState(false);
  const mutation = useMutation(notify);
  return <section className="api-stack"><ClassSelect classes={classes} value={classId} onChange={selectClass} /><div className="exchange-actions"><PrimaryButton onClick={() => {
        setRemove(false);
        setDraft({
          name: '',
          grade: '1',
          classNumber: '1'
        });
      }}>학급 추가</PrimaryButton><button className="secondary-button" type="button" disabled={!classId} onClick={() => {
        setRemove(false);
        setDraft(classes.data.find(item => item.id === classId));
      }}>학급 수정</button><button className="secondary-button" type="button" disabled={!classId} onClick={() => setStudentDraft({
        name: '',
        number: ''
      })}>학생 등록</button></div><ApiState state={students}>{students.data?.map(item => <article className="api-panel" key={item.id}><strong>{item.number}번 · {item.name}</strong><button type="button" className="text-button" onClick={() => setStudentDraft(item)}>학생 정보 수정</button></article>)}</ApiState><Pagination state={students} />
    {draft && <Modal title={remove ? '학급 삭제' : '학급 정보'} onClose={() => setDraft(null)}><form onSubmit={async e => {
        e.preventDefault();
        const body = {
          schoolYear: year,
          name: `${draft.grade}학년 ${draft.classNumber}반`,
          grade: Number(draft.grade),
          classNumber: Number(draft.classNumber)
        };
        if (await mutation.run(`/admin/classes${draft.id ? `/${draft.id}` : ''}`, {
          method: remove ? 'DELETE' : draft.id ? 'PATCH' : 'POST',
          ...(remove ? {} : {
            body
          })
        }, '학급 정보를 변경했어요.')) {
          setDraft(null);
          selectClass('');
          classes.reload();
        }
      }}>{remove ? <p>학생이 없는 학급만 삭제할 수 있어요. 이 학급을 삭제할까요?</p> : <><Field label="학년" required type="number" min={1} max={6} value={draft.grade || ''} onChange={e => setDraft({
            ...draft,
            grade: e.target.value
          })} /><Field label="반" required type="number" min={1} max={99} value={draft.classNumber || ''} onChange={e => setDraft({
            ...draft,
            classNumber: e.target.value
          })} /></>}<SaveButton mutation={mutation}>{remove ? '삭제 확인' : '저장하기'}</SaveButton>{draft.id && !remove && <button type="button" className="text-button danger" onClick={() => setRemove(true)}>학급 삭제</button>}</form></Modal>}
    {studentDraft && <Modal title="학생 정보" onClose={() => setStudentDraft(null)}><form onSubmit={async e => {
        e.preventDefault();
        if (await mutation.run(studentDraft.id ? `/admin/students/${studentDraft.id}` : `/admin/classes/${classId}/students`, {
          method: studentDraft.id ? 'PATCH' : 'POST',
          body: {
            name: studentDraft.name.trim(),
            number: Number(studentDraft.number)
          }
        }, '학생 정보를 저장했어요.')) {
          setStudentDraft(null);
          students.reload();
        }
      }}><Field label="학생 이름" required value={studentDraft.name} onChange={e => setStudentDraft({
          ...studentDraft,
          name: e.target.value
        })} /><Field label="출석 번호" type="number" required min={1} max={999} value={studentDraft.number || ''} onChange={e => setStudentDraft({
          ...studentDraft,
          number: e.target.value
        })} /><SaveButton mutation={mutation} /></form></Modal>}<MutationError mutation={mutation} /></section>;
}
export function Audit({
  notify
}) {
  const [action, setAction] = useState(''),
    [actor, setActor] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [filters, setFilters] = useState({}),
    [detail, setDetail] = useState(null);
  const people = usePage('/admin/teachers');
  const list = usePage('/admin/audit-logs', filters),
    mutation = useMutation(notify);
  return <section className="api-stack"><form className="api-toolbar" onSubmit={e => {
      e.preventDefault();
      list.setPage(1);
      setFilters({
        action,
        actorId: actor,
        from: from ? `${from}T00:00:00+09:00` : '',
        to: to ? `${to}T23:59:59+09:00` : ''
      });
    }}><Field label="작업" value={action} onChange={e => setAction(e.target.value)}><option value="">전체</option><option value="CREATE">생성</option><option value="UPDATE">수정</option><option value="DELETE">삭제</option></Field><Field label="작업자" value={actor} onChange={e => setActor(e.target.value)}><option value="">전체</option>{people.data?.filter(person => person.status !== 'INVITED').map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</Field><Field label="시작 날짜" type="date" value={from} onChange={e => setFrom(e.target.value)} /><Field label="종료 날짜" type="date" value={to} onChange={e => setTo(e.target.value)} /><PrimaryButton type="submit">검색</PrimaryButton></form><ApiState state={list}>{list.data?.map(item => <article className="api-panel" key={item.id}><h2>{item.actor?.name} · {statusLabel(item.action)}</h2><p>{item.occurredAt} · {item.resourceType}</p><button type="button" className="text-button" onClick={async () => {
          const result = await mutation.run(`/admin/audit-logs/${item.id}`, {
            method: 'GET'
          });
          if (result) setDetail(result.data);
        }}>작업 상세</button></article>)}</ApiState><Pagination state={list} />{detail && <Modal title="변경 이력" onClose={() => setDetail(null)}><JsonDetails value={detail} /></Modal>}<MutationError mutation={mutation} /></section>;
}
