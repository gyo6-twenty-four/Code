import { compareClassItems } from '../lib/classrooms';
import { RECORD_TYPES, assignedRecordTypes, className, recordTypeLabel, statusLabel } from './model';
import { useState } from 'react';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { resource } from './client';
import { useMutation, usePage, useResource } from './hooks';
import { ApiState, ClassSelect, JsonDetails, MutationError, Pagination, SaveButton, StatusBoard, UsageMonths } from './shared';
import { SchoolPicker } from './NeisConnect';

function schoolCodeOf(school) {
  return school?.schoolCode || '';
}

function SchoolChoice({ school, onChange, notify }) {
  return <SchoolPicker value={schoolCodeOf(school) ? school : null} onChange={onChange} notify={notify} />;
}

export function AdminSchoolSwitch({ school, schools, onChange, notify }) {
  const [picking, setPicking] = useState(false);
  const items = Array.isArray(schools?.data) ? schools.data : [];
  const options = schoolCodeOf(school) && !items.some(item => item.schoolCode === school.schoolCode) ? [school, ...items] : items;
  return <div className="admin-school-bar"><div className="school-switch"><Field label="담당 학교" searchable searchPlaceholder="검색하세요" panelMinWidth={280} value={schoolCodeOf(school)} onChange={event => {
    const code = event.target.value;
    onChange(code ? options.find(item => item.schoolCode === code) || null : null);
  }}><option value="">전체 학교</option>{options.map(item => <option key={item.schoolCode} value={item.schoolCode}>{item.name}</option>)}</Field></div><button type="button" className="school-find" onClick={() => setPicking(true)}>학교 찾기</button>{picking && <Modal title="담당 학교 찾기" onClose={() => setPicking(false)}><SchoolChoice school={null} notify={notify} onChange={next => {
    if (!next) return;
    onChange(next);
    setPicking(false);
  }} /></Modal>}</div>;
}

function SchoolBoard({ schools, selected, onSelect }) {
  const items = Array.isArray(schools?.data) ? schools.data : [];
  const known = schoolCodeOf(selected) && !items.some(item => item.schoolCode === selected.schoolCode) ? [{ ...selected, teacherCount: 0, classCount: 0, studentCount: 0, pendingInvitations: 0 }, ...items] : items;
  return <div className="school-board"><button type="button" className={`metric-card school-card${!schoolCodeOf(selected) ? ' is-selected' : ''}`} aria-pressed={!schoolCodeOf(selected)} onClick={() => onSelect(null)}><h2>전체 학교</h2><p className="metric-value">{items.length}</p><p>담당 학교</p></button>{known.map(school => <button type="button" key={school.schoolCode} className={`metric-card school-card${selected?.schoolCode === school.schoolCode ? ' is-selected' : ''}`} aria-pressed={selected?.schoolCode === school.schoolCode} onClick={() => onSelect(school)}><h2>{school.name}</h2><p>{[school.officeName, school.kind].filter(Boolean).join(' · ') || `학교 코드 ${school.schoolCode}`}</p><p>교사 {school.teacherCount || 0}명 · 학급 {school.classCount || 0}개 · 학생 {school.studentCount || 0}명</p><p>초대 대기 {school.pendingInvitations || 0}명</p></button>)}{!schools?.loading && !known.length && <p className="agenda-empty">연결된 학교가 아직 없어요. 학교 찾기로 학교를 고르면 그 학교의 학급과 교사를 관리할 수 있어요.</p>}</div>;
}

export function AdminHome({
  year,
  adminSchool,
  schools,
  selectSchool
}) {
  const code = schoolCodeOf(adminSchool);
  const summary = useResource(resource('/admin/dashboard/summary', {
      schoolYear: year,
      schoolCode: code
    })),
    completion = useResource(resource('/admin/dashboard/completion', {
      schoolYear: year,
      schoolCode: code
    })),
    usage = useResource(resource('/admin/dashboard/usage', {
      schoolYear: year,
      schoolCode: code
    })),
    activity = useResource(resource('/admin/dashboard/activity', {
      schoolYear: year,
      schoolCode: code
    }));
  const scope = code ? `${adminSchool.name} 현황이에요.` : '전체 학교 현황이에요. 학교를 고르면 그 학교만 봐요.';
  return <section className="api-stack">{schools?.loading ? <p role="status" className="agenda-empty">불러오는 중이에요.</p> : schools?.error ? <div className="api-error" role="alert"><p>{schools.error.message}</p><button type="button" className="secondary-button" onClick={schools.reload}>다시 불러오기</button></div> : <SchoolBoard schools={schools} selected={adminSchool} onSelect={selectSchool} />}<p className="dialog-hint">{scope}</p><ApiState state={summary}><div className="metric-grid">{[['교사', 'teacherCount'], ['학급', 'classCount'], ['학생', 'studentCount'], ['작성률 (%)', 'recordCompletionRate'], ['초대 대기', 'pendingInvitations'], ['내용 확인 필요', 'gateFailureCount']].map(([label, key]) => <article className="metric-card" key={key}><h2>{label}</h2><p className="metric-value">{summary.data?.[key] ?? '—'}</p></article>)}</div></ApiState><ApiState state={completion} empty="이 학년도에 등록된 학급이 없어요."><StatusBoard title="학급별 작성 현황" rows={completion.data} /></ApiState><ApiState state={usage}><UsageMonths months={usage.data} /></ApiState><section className="api-panel"><h2>최근 변경</h2><ApiState state={activity}>{Array.isArray(activity.data) && <ul className="status-board">{activity.data.map((item, index) => <li key={`${item.occurredAt}-${index}`}><div className="status-copy"><strong>{item.name}</strong><span>{[statusLabel(item.action), item.schoolName, item.occurredAt ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.occurredAt)) : ''].filter(Boolean).join(', ')}</span></div></li>)}</ul>}</ApiState></section></section>;
}

function RecordTypeFields({ value = [], onChange }) {
  return <fieldset className="type-picker"><legend>작성할 수 있는 생기부</legend>{RECORD_TYPES.map(([id, label]) => <label className="api-check" key={id}><input type="checkbox" checked={value.includes(id)} onChange={event => onChange(event.target.checked ? [...value, id] : value.filter(item => item !== id))} />{label}</label>)}</fieldset>;
}

function teacherSchoolGroup(item) {
  if (item.role === 'ADMIN') return '관리자';
  return item.school?.name || item.schoolName || '학교 미연결';
}

function groupTeachers(items = []) {
  const groups = new Map();
  for (const item of items) {
    const name = teacherSchoolGroup(item);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  const rank = name => name === '관리자' ? 0 : name === '학교 미연결' ? 2 : 1;
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'ko'));
}

function classesFor(classes, schoolCode) {
  return [...(classes?.data || [])].filter(item => !schoolCode || !item.schoolCode || item.schoolCode === schoolCode).sort(compareClassItems);
}

export function Teachers({
  classes,
  notify,
  account,
  adminSchool,
  reloadSchools
}) {
  const [keyword, setKeyword] = useState(''),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState(null),
    [bulk, setBulk] = useState(false),
    [bulkSchool, setBulkSchool] = useState(null),
    [bulkText, setBulkText] = useState(''),
    [confirm, setConfirm] = useState(false),
    [removeTarget, setRemoveTarget] = useState(null),
    [delivery, setDelivery] = useState(null);
  const schoolCode = schoolCodeOf(adminSchool);
  const list = usePage('/admin/teachers', {
      keyword: search,
      schoolCode
    }),
    mutation = useMutation(notify);
  const guardsSelf = draft?.id === account.id && draft.role !== 'ADMIN';
  const draftSchool = draft?.school?.schoolCode ? draft.school : null;
  const classOptions = classesFor(classes, draftSchool?.schoolCode || '');
  const grouped = Array.isArray(list.data) ? groupTeachers(list.data) : [];
  const refresh = () => {
    list.reload();
    reloadSchools?.();
  };
  const chooseInviteSchool = school => {
    setDraft(current => ({ ...current, school, classIds: [] }));
  };
  const form = <><Field label="이름" required value={draft?.name || ''} onChange={e => setDraft({
      ...draft,
      name: e.target.value
    })} /><Field label="이메일" type="email" required readOnly={!!draft?.id} value={draft?.email || ''} onChange={e => setDraft({
      ...draft,
      email: e.target.value
    })} /><Field label="역할" value={draft?.role || 'TEACHER'} onChange={e => setDraft({
      ...draft,
      role: e.target.value
    })}><option value="TEACHER">교사</option><option value="ADMIN">관리자</option></Field>{draft?.id ? <p className="dialog-hint">{draft.role === 'ADMIN' ? '관리자 계정은 특정 학교에 속하지 않아요.' : draftSchool?.name || draft.schoolName || '학교 미연결'}</p> : draft?.role === 'TEACHER' ? <SchoolChoice school={draftSchool} onChange={chooseInviteSchool} notify={notify} /> : null}<RecordTypeFields value={draft?.recordTypes || []} onChange={recordTypes => setDraft({
      ...draft,
      recordTypes
    })} />{draftSchool ? <><p className="dialog-hint">{draftSchool.name} 학급을 배정할 수 있어요. 학생 기록은 이 배정과 관계없이 그 학교의 모든 학생에게 열려 있어요.</p>{classOptions.map(item => <label className="api-check" key={item.id}><input type="checkbox" checked={draft?.classIds?.includes(item.id) || false} onChange={e => setDraft({
        ...draft,
        classIds: e.target.checked ? [...(draft.classIds || []), item.id] : draft.classIds.filter(id => id !== item.id)
      })} />{className(item)}</label>)}</> : !draft?.id && draft?.role === 'TEACHER' ? <p className="dialog-hint">학교를 고르면 그 학교 학급을 배정할 수 있어요.</p> : null}</>;
  return <section className="api-stack"><p className="dialog-hint">{schoolCode ? `${adminSchool.name} 교사예요.` : '전체 학교 교사예요. 학교별로 묶어서 보여요.'}</p><form className="api-toolbar" onSubmit={e => {
      e.preventDefault();
      list.setPage(1);
      setSearch(keyword);
    }}><Field label="교사 검색" placeholder="검색하세요" value={keyword} onChange={e => setKeyword(e.target.value)} /><PrimaryButton type="submit">검색</PrimaryButton></form><div className="exchange-actions"><PrimaryButton onClick={() => setDraft({
        name: '',
        email: '',
        role: 'TEACHER',
        classIds: [],
        recordTypes: [...assignedRecordTypes({})],
        school: adminSchool?.schoolCode ? adminSchool : null
      })}>교사 초대</PrimaryButton><button type="button" className="secondary-button" onClick={() => {
        setBulkSchool(adminSchool?.schoolCode ? adminSchool : null);
        setBulk(true);
      }}>일괄 초대</button></div><ApiState state={list} empty={schoolCode ? '이 학교의 교사 계정이 없어요.' : '등록된 교사 계정이 없어요.'}>{grouped.map(([school, items]) => <section className="teacher-school-group" key={school}><h2 className="teacher-school">{school}</h2>{items.map(item => <article className="api-panel" key={item.id}><h2>{item.name}</h2><p>{item.email}, {item.role === 'ADMIN' ? '관리자' : '교사'}, {statusLabel(item.status)}</p><div className="type-pills">{assignedRecordTypes(item).map(id => <span key={id}>{recordTypeLabel(id)}</span>)}</div><button type="button" className="text-button" onClick={async () => {
          const result = await mutation.run(`/admin/teachers/${item.id}`, {
            method: 'GET'
          });
          if (result) {
            setDraft({
              ...result.data,
              recordTypes: assignedRecordTypes(result.data)
            });
            setConfirm(false);
          }
        }} disabled={item.status === 'INVITED'}>계정 관리</button>{item.role === 'TEACHER' && item.status !== 'INVITED' && item.id !== account.id && <button type="button" className="text-button danger" onClick={() => setRemoveTarget({
          id: item.id,
          name: item.name,
          schoolName: item.school?.name || item.schoolName || '',
          invited: false,
          teacher: true
        })}>교사 삭제</button>}{item.status === 'INVITED' && <button type="button" className="text-button danger" onClick={() => setRemoveTarget({
          id: item.id,
          name: item.name,
          schoolName: item.school?.name || item.schoolName || '',
          invited: true
        })}>초대 취소</button>}{item.status === 'INVITED' && item.invitationId && <button type="button" className="text-button" disabled={mutation.busy} onClick={async () => {
          const result = await mutation.run(`/admin/teachers/invitations/${item.invitationId}/resend`, { body: {}, idempotent: true });
          if (result) { setDelivery([result.data]); refresh(); }
        }}>초대 링크 다시 만들기</button>}</article>)}</section>)}</ApiState><Pagination state={list} />{draft && <Modal title={draft.id ? '교사 계정 관리' : '교사 초대'} onClose={() => {
      setDraft(null);
      setConfirm(false);
    }}><form className="api-stack" onSubmit={async e => {
        e.preventDefault();
        if (guardsSelf) {
          notify('현재 로그인한 관리자 자신의 권한은 이 화면에서 해제할 수 없어요.');
          return;
        }
        if (!draft.recordTypes?.length) {
          notify('작성할 생기부 유형을 하나 이상 선택해 주세요.');
          return;
        }
        if (!draft.id && draft.role === 'TEACHER' && !draftSchool?.schoolCode) {
          notify('초대할 학교를 선택해 주세요.');
          return;
        }
        const result = await mutation.run(draft.id ? `/admin/teachers/${draft.id}` : '/admin/teachers/invitations', {
          method: draft.id ? 'PATCH' : 'POST',
          body: {
            email: draft.email,
            name: draft.name,
            role: draft.role,
            classIds: draft.classIds || [],
            recordTypes: draft.recordTypes,
            ...(!draft.id && draft.role === 'TEACHER' ? { school: draft.school } : {})
          },
          idempotent: !draft.id
        }, draft.id ? '계정 정보를 변경했어요.' : `${draftSchool?.name || '선택한 학교'}에 초대를 만들었어요.`);
        if (result) {
          if (!draft.id) setDelivery([result.data]);
          setDraft(null);
          refresh();
        }
      }}>{form}<SaveButton mutation={mutation} disabled={guardsSelf}>{draft.id ? '변경 저장' : '초대 생성'}</SaveButton></form>{draft.id && draft.id !== account.id && <div className="api-stack"><button type="button" className="secondary-button" disabled={mutation.busy} onClick={async () => {
          if (await mutation.run(`/admin/teachers/${draft.id}/status`, {
            method: 'PATCH',
            body: {
              status: draft.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
            }
          }, '계정 상태를 변경했어요.')) {
            setDraft(null);
            refresh();
          }
        }}>{draft.status === 'ACTIVE' ? '계정 정지' : '계정 활성화'}</button><button type="button" className="text-button danger" onClick={() => setConfirm(true)}>계정 비활성화</button>{confirm && <><p>이 계정을 비활성화할까요? 목록에는 남고, 로그인만 막혀요.</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
            if (await mutation.run(`/admin/teachers/${draft.id}/status`, {
              method: 'PATCH',
              body: {
                status: 'INACTIVE'
              }
            }, '비활성화했어요.')) {
              setDraft(null);
              setConfirm(false);
              refresh();
            }
          }}>비활성화 확인</PrimaryButton></>}<button type="button" className="text-button danger" onClick={() => setRemoveTarget({
            id: draft.id,
            name: draft.name,
            schoolName: draft.school?.name || draft.schoolName || '',
            invited: false,
            teacher: draft.role === 'TEACHER'
          })}>{draft.role === 'TEACHER' ? '교사 삭제' : '계정 삭제'}</button></div>}<MutationError mutation={mutation} /></Modal>}{bulk && <Modal title="교사 일괄 초대" onClose={() => setBulk(false)}><form onSubmit={async e => {
        e.preventDefault();
        if (!bulkSchool?.schoolCode) {
          notify('초대할 학교를 선택해 주세요.');
          return;
        }
        const invitations = bulkText.split('\n').filter(line => line.trim()).map(line => {
          const [email, name] = line.split(',').map(value => value.trim());
          return {
            email,
            name,
            role: 'TEACHER',
            classIds: [],
            recordTypes: [...assignedRecordTypes({})],
            school: bulkSchool
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
        }, `${bulkSchool.name}에 초대 링크를 생성했어요.`);
        if (result) {
          setDelivery(result.data.invitations);
          setBulk(false);
          refresh();
        }
      }}><SchoolChoice school={bulkSchool} onChange={setBulkSchool} notify={notify} /><Field label="이메일, 이름 (한 줄에 한 명)" multiline required value={bulkText} onChange={e => setBulkText(e.target.value)} /><SaveButton mutation={mutation}>초대 생성</SaveButton></form></Modal>}{delivery && <Modal title="학교 초대 링크" onClose={() => setDelivery(null)}><div className="api-stack"><p>초대받을 교사에게 아래 링크를 전달해 주세요. 링크에서 학교 코드와 비밀번호를 확인하고 가입할 수 있어요.</p>{delivery.map(item => <article className="api-panel api-stack" key={item.invitationId || item.id}><strong>{item.email}</strong><Field label="초대 링크" readOnly value={item.invitationUrl ? new URL(item.invitationUrl, window.location.origin).href : ''} onFocus={e => e.target.select()} />{item.expiresAt && <p>만료: {item.expiresAt}</p>}<button type="button" className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(new URL(item.invitationUrl, window.location.origin).href); notify('초대 링크를 복사했어요.'); } catch { notify('초대 링크를 선택해 복사해 주세요.'); } }}>링크 복사</button></article>)}</div></Modal>}{removeTarget && <Modal title={removeTarget.invited ? '초대 취소' : removeTarget.teacher ? '교사 삭제' : '계정 삭제'} onClose={() => setRemoveTarget(null)}><div className="api-stack"><p>{removeTarget.invited ? `${removeTarget.name} 초대를 취소할까요? 전달한 링크는 더 이상 쓸 수 없어요.` : `${removeTarget.name} 계정을 ${removeTarget.schoolName ? `${removeTarget.schoolName}에서` : '목록에서'} 제거할까요? 목록에서 빠지고 로그인할 수 없어요. 작성한 관찰과 생기부는 남고, 같은 이메일로는 다시 가입할 수 없어요.`}</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
        if (await mutation.run(`/admin/teachers/${removeTarget.id}`, {
          method: 'DELETE'
        }, removeTarget.invited ? '초대를 취소했어요.' : '계정을 삭제했어요.')) {
          setRemoveTarget(null);
          setDraft(null);
          setConfirm(false);
          refresh();
        }
      }}>{removeTarget.invited ? '초대 취소' : removeTarget.teacher ? '교사 삭제' : '삭제 확인'}</PrimaryButton><MutationError mutation={mutation} /></div></Modal>}<MutationError mutation={mutation} /></section>;
}

export function Rosters({
  classes,
  classId,
  selectClass,
  students,
  year,
  notify,
  adminSchool,
  selectSchool,
  reloadSchools
}) {
  const [draft, setDraft] = useState(null),
    [studentDraft, setStudentDraft] = useState(null),
    [remove, setRemove] = useState(false);
  const mutation = useMutation(notify);
  const showSchool = !schoolCodeOf(adminSchool);
  const draftSchool = draft?.school?.schoolCode ? draft.school : null;
  const neisClass = String(classId || '').startsWith('neis:');
  const usesNeis = (classes.data || []).some(item => String(item.id).startsWith('neis:'));
  return <section className="api-stack"><p className="dialog-hint">{showSchool ? '전체 학교 학급이에요. 학급을 만들 때는 학교를 고릅니다.' : `${adminSchool.name} 학급은 나이스, 학생은 Firebase에 저장해요.`}</p><ClassSelect classes={classes} value={classId} onChange={selectClass} showSchool={showSchool} empty={showSchool ? undefined : '이 학년도의 나이스 학급이 없어요.'} /><div className="exchange-actions">{!usesNeis && <PrimaryButton onClick={() => {
        setRemove(false);
        setDraft({
          name: '',
          grade: '1',
          classNumber: '1',
          school: schoolCodeOf(adminSchool) ? adminSchool : null
        });
      }}>학급 추가</PrimaryButton>}{!usesNeis && <button className="secondary-button" type="button" disabled={!classId || neisClass} onClick={() => {
        setRemove(false);
        const current = (classes.data || []).find(item => item.id === classId);
        setDraft(current ? { ...current, school: current.schoolCode ? { name: current.schoolName, schoolCode: current.schoolCode, officeCode: current.officeCode, officeName: current.officeName, kind: current.kind } : null } : null);
      }}>학급 수정</button>}<button className="secondary-button" type="button" disabled={!classId} onClick={() => setStudentDraft({
        name: '',
        number: ''
      })}>학생 등록</button></div><ApiState state={students}>{students.data?.map(item => <article className="api-panel" key={item.id}><strong>{item.number}번, {item.name}</strong><button type="button" className="text-button" onClick={() => setStudentDraft(item)}>학생 정보 수정</button></article>)}</ApiState><Pagination state={students} />
    {draft && <Modal title={remove ? '학급 삭제' : '학급 정보'} onClose={() => setDraft(null)}><form onSubmit={async e => {
        e.preventDefault();
        if (!remove && !draftSchool?.schoolCode) {
          notify('학급을 만들 학교를 선택해 주세요.');
          return;
        }
        const body = {
          schoolYear: year,
          name: `${draft.grade}학년 ${draft.classNumber}반`,
          grade: Number(draft.grade),
          classNumber: Number(draft.classNumber),
          school: draftSchool
        };
        if (await mutation.run(`/admin/classes${draft.id ? `/${draft.id}` : ''}`, {
          method: remove ? 'DELETE' : draft.id ? 'PATCH' : 'POST',
          ...(remove ? {} : {
            body
          })
        }, '학급 정보를 변경했어요.')) {
          const savedSchool = draftSchool;
          setDraft(null);
          if (!remove && savedSchool?.schoolCode) selectSchool?.(savedSchool);
          else selectClass('');
          classes.reload();
          reloadSchools?.();
        }
      }}>{remove ? <p>학생이 없는 학급만 삭제할 수 있어요. 이 학급을 삭제할까요?</p> : <>{draft.id && draftSchool ? <p className="dialog-hint">{draftSchool.name}</p> : <SchoolChoice school={draftSchool} notify={notify} onChange={school => setDraft(current => ({ ...current, school }))} />}<Field label="학년" required type="number" min={1} max={6} value={draft.grade || ''} onChange={e => setDraft({
            ...draft,
            grade: e.target.value
          })} /><Field label="반" required type="number" min={1} max={99} value={draft.classNumber || ''} onChange={e => setDraft({
            ...draft,
            classNumber: e.target.value
          })} /></>}<SaveButton mutation={mutation}>{remove ? '삭제 확인' : '저장하기'}</SaveButton>{draft.id && !remove && <button type="button" className="text-button danger" onClick={() => setRemove(true)}>학급 삭제</button>}</form></Modal>}
    {studentDraft && <Modal title="학생 정보" onClose={() => setStudentDraft(null)}><form onSubmit={async e => {
        e.preventDefault();
        if (await mutation.run(studentDraft.id ? `/admin/students/${studentDraft.id}` : `/admin/classes/${encodeURIComponent(classId)}/students`, {
          method: studentDraft.id ? 'PATCH' : 'POST',
          body: {
            name: studentDraft.name.trim(),
            number: Number(studentDraft.number),
            schoolYear: year,
            school: adminSchool
          }
        }, '학생 정보를 저장했어요.')) {
          setStudentDraft(null);
          students.reload();
          if (!studentDraft.id) reloadSchools?.();
        }
      }}><Field label="학생 이름" required value={studentDraft.name} onChange={e => setStudentDraft({
          ...studentDraft,
          name: e.target.value
        })} /><Field label="출석 번호" type="number" required min={1} max={999} value={studentDraft.number || ''} onChange={e => setStudentDraft({
          ...studentDraft,
          number: e.target.value
        })} /><SaveButton mutation={mutation} /></form></Modal>}<MutationError mutation={mutation} /></section>;
}

function groupLogs(items = []) {
  const groups = new Map();
  for (const item of items) {
    const name = item.schoolName || '학교 미지정';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  return [...groups.entries()].sort((a, b) => (a[0] === '학교 미지정') - (b[0] === '학교 미지정') || a[0].localeCompare(b[0], 'ko'));
}

export function Audit({
  notify,
  adminSchool
}) {
  const [action, setAction] = useState(''),
    [actor, setActor] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [filters, setFilters] = useState({}),
    [detail, setDetail] = useState(null);
  const schoolCode = schoolCodeOf(adminSchool);
  const people = usePage('/admin/teachers', { schoolCode });
  const list = usePage('/admin/audit-logs', { ...filters, schoolCode }),
    mutation = useMutation(notify);
  const rows = Array.isArray(list.data) ? list.data : [];
  const groups = schoolCode ? [['', rows]] : groupLogs(rows);
  return <section className="api-stack"><p className="dialog-hint">{schoolCode ? `${adminSchool.name}에서 바뀐 내용이에요.` : '전체 학교의 변경 이력이에요.'}</p><form className="api-toolbar" onSubmit={e => {
      e.preventDefault();
      list.setPage(1);
      setFilters({
        action,
        actorId: actor,
        from: from ? `${from}T00:00:00+09:00` : '',
        to: to ? `${to}T23:59:59+09:00` : ''
      });
    }}><Field label="작업" value={action} onChange={e => setAction(e.target.value)}><option value="">전체</option><option value="CREATE">생성</option><option value="UPDATE">수정</option><option value="DELETE">삭제</option></Field><Field label="작업자" value={actor} onChange={e => setActor(e.target.value)}><option value="">전체</option>{people.data?.filter(person => person.status !== 'INVITED').map(person => <option key={person.id} value={person.id}>{person.school?.name && !schoolCode ? `${person.name} · ${person.school.name}` : person.name}</option>)}</Field><Field label="시작 날짜" type="date" value={from} onChange={e => setFrom(e.target.value)} /><Field label="종료 날짜" type="date" value={to} onChange={e => setTo(e.target.value)} /><PrimaryButton type="submit">검색</PrimaryButton></form><ApiState state={list}>{groups.map(([school, items]) => <section className="teacher-school-group" key={school || 'current'}>{school ? <h2 className="teacher-school">{school}</h2> : null}{items.map(item => <article className="api-panel" key={item.id}><h2>{item.actor?.name}, {statusLabel(item.action)}</h2><p>{[item.schoolName, item.occurredAt, item.resourceType].filter(Boolean).join(', ')}</p><button type="button" className="text-button" onClick={async () => {
          const result = await mutation.run(`/admin/audit-logs/${item.id}`, {
            method: 'GET'
          });
          if (result) setDetail(result.data);
        }}>작업 상세</button></article>)}</section>)}</ApiState><Pagination state={list} />{detail && <Modal title="변경 이력" onClose={() => setDetail(null)}><JsonDetails value={detail} /></Modal>}<MutationError mutation={mutation} /></section>;
}
