import { useState } from 'react';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { todayValue } from '../components/field-utils';
import { observationDateError } from '../lib/observations';
import { useMutation, usePage } from './hooks';
import { ApiState, ClassSelect, StudentSelect, MutationError, Pagination, SaveButton } from './shared';
const categories = {
  CLASS_ATTITUDE: '수업 태도',
  PEER_RELATIONSHIP: '교우 관계',
  LEADERSHIP: '리더십',
  CAREER: '진로',
  OTHER: '기타'
};
export function Observation({
  classes,
  classId,
  selectClass,
  students,
  studentId,
  selectStudent,
  notify,
  account,
  year,
  batch = false,
  timeline = false
}) {
  const list = usePage(studentId && !batch ? `/students/${studentId}/observations` : null);
  const mutation = useMutation(notify);
  const [date, setDate] = useState(todayValue),
    [category, setCategory] = useState('CLASS_ATTITUDE'),
    [content, setContent] = useState('');
  const [selected, setSelected] = useState({}),
    [validated, setValidated] = useState(false),
    [editor, setEditor] = useState(null),
    [deleting, setDeleting] = useState(false),
    [localError, setLocalError] = useState('');
  const admin = account.role === 'ADMIN';
  const body = batch ? {
    observedAt: date,
    category,
    items: Object.entries(selected).map(([id, text]) => ({
      studentId: id,
      content: text.trim() || content.trim()
    }))
  } : {
    classId,
    schoolYear: year,
    observedAt: date,
    category,
    content: content.trim(),
    version: editor ? editor.version : 1
  };
  function changed(fn) {
    fn();
    setValidated(false);
  }
  async function submit(event) {
    event.preventDefault();
    setLocalError('');
    if (editor && typeof editor.version !== 'number') {
      setLocalError('기록 버전이 없어 수정할 수 없어요. 최신 기록을 다시 불러와 주세요.');
      return;
    }
    const invalid = observationDateError(date);
    if (invalid) {
      setLocalError(invalid);
      return;
    }
    if (batch && (!body.items.length || body.items.some(item => !item.content))) {
      setLocalError('학생을 선택하고 관찰 내용을 입력해 주세요.');
      return;
    }
    const path = batch ? `/classes/${classId}/observations/bulk${validated ? '' : '/validate'}` : editor ? `/observations/${editor.id}` : `/students/${studentId}/observations`;
    const result = await mutation.run(path, {
      method: editor ? 'PATCH' : 'POST',
      body,
      idempotent: batch
    }, batch && !validated ? '입력 내용을 검증했어요.' : '관찰을 저장했어요.');
    if (!result) return;
    if (batch && !validated) {
      if (result.data?.valid === false || result.data?.errors?.length) {
        setLocalError('검증 결과를 확인해 주세요.');
        return;
      }
      setValidated(true);
    } else {
      setContent('');
      setSelected({});
      setValidated(false);
      setEditor(null);
      list.reload();
    }
  }
  async function edit(item) {
    const result = await mutation.run(`/observations/${item.id}`, {
      method: 'GET'
    });
    if (!result) return;
    const record = result.data;
    setEditor(record);
    setDate(record.observedAt);
    setContent(record.content);
    setCategory(record.category);
  }
  const fields = <><Field label="관찰 날짜" type="date" required max={todayValue()} value={date} onChange={e => changed(() => setDate(e.target.value))} /><Field label="관찰 범주" value={category} onChange={e => changed(() => setCategory(e.target.value))}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Field><Field label={batch ? '공통 관찰 내용' : '관찰 내용'} multiline required={!batch} maxLength={2000} value={content} onChange={e => changed(() => setContent(e.target.value))} placeholder="확인한 학생의 말과 행동을 기록해 주세요." /></>;
  return <section className="api-stack"><div className="api-toolbar"><ClassSelect classes={classes} value={classId} onChange={value => {
        selectClass(value);
        setSelected({});
        setValidated(false);
        setEditor(null);
        setContent('');
      }} />{!batch && <StudentSelect students={students} value={studentId} onChange={value => {
        selectStudent(value);
        setEditor(null);
        setContent('');
      }} />}</div>
    {batch ? <form className="api-panel api-stack" onSubmit={submit}>{fields}<ApiState state={students}>{Array.isArray(students.data) && students.data.map(student => <div className="api-panel" key={student.id}><label className="api-check"><input type="checkbox" checked={Object.hasOwn(selected, student.id)} onChange={e => changed(() => setSelected(previous => {
              const next = {
                ...previous
              };
              if (e.target.checked) next[student.id] = '';else delete next[student.id];
              return next;
            }))} />{student.name}</label>{Object.hasOwn(selected, student.id) && <Field label={`${student.name} 개별 관찰 (공통 내용 대신 적용)`} multiline value={selected[student.id]} onChange={e => changed(() => setSelected({
            ...selected,
            [student.id]: e.target.value
          }))} />}</div>)}</ApiState><Pagination state={students} /><p>{Object.keys(selected).length}명 선택 · {validated ? '사전 검증 완료' : '저장 전 사전 검증이 필요해요.'}</p>{localError && <p role="alert" className="field-error">{localError}</p>}<SaveButton mutation={mutation} showError={false} disabled={admin || !classId || !Object.keys(selected).length}>{validated ? '선택한 관찰 저장하기' : '입력 내용 검증하기'}</SaveButton></form> : <>
      {!timeline && !admin && <form className="api-panel api-stack" onSubmit={submit}>{fields}{localError && <p className="field-error" role="alert">{localError}</p>}<SaveButton mutation={mutation} showError={false} disabled={!studentId}>관찰 저장하기</SaveButton></form>}
      <ApiState state={list} empty={studentId ? '저장된 관찰이 없어요.' : '학생을 선택해 주세요.'}>{Array.isArray(list.data) && list.data.map(item => <article className="api-panel api-stack" key={item.id}><header className="exchange-heading"><strong>{item.observedAt} · {categories[item.category] || item.category}</strong></header><p className="detail-copy">{item.content}</p>{!admin && <div className="exchange-actions"><button className="secondary-button" type="button" onClick={() => edit(item)}>수정</button><button className="text-button danger" type="button" onClick={() => {
              setEditor(item);
              setDeleting(true);
            }}>삭제</button></div>}</article>)}</ApiState><Pagination state={list} />
      {editor && <Modal title={deleting ? '관찰 삭제' : '관찰 수정'} onClose={() => {
        if (!deleting) { setContent(''); setDate(todayValue()); setCategory('CLASS_ATTITUDE'); }
        setEditor(null);
        setDeleting(false);
      }}><form onSubmit={async e => {
          if (!deleting) return submit(e);
          e.preventDefault();
          if (await mutation.run(`/observations/${editor.id}`, {
            method: 'DELETE'
          }, '관찰을 삭제했어요.')) {
            setEditor(null);
            setDeleting(false);
            list.reload();
          }
        }}>{deleting ? <p>이 관찰을 삭제할까요?</p> : fields}<SaveButton mutation={mutation}>{deleting ? '삭제 확인' : '수정 저장하기'}</SaveButton>{mutation.error?.code === 'VERSION_CONFLICT' && <button type="button" className="secondary-button" onClick={() => {
            setEditor(null);
            list.reload();
          }}>최신 목록 불러오기</button>}</form></Modal>}
    </>}
    <MutationError mutation={mutation} />
  </section>;
}
export function Career({
  classes,
  classId,
  selectClass,
  students,
  studentId,
  selectStudent,
  year,
  notify,
  account
}) {
  const list = usePage(studentId ? `/students/${studentId}/career-records` : null, {
    schoolYear: year
  });
  const mutation = useMutation(notify),
    [draft, setDraft] = useState(null),
    [remove, setRemove] = useState(false);
  return <section className="api-stack"><div className="api-toolbar"><ClassSelect classes={classes} value={classId} onChange={selectClass} /><StudentSelect students={students} value={studentId} onChange={selectStudent} /></div>{account.role === 'TEACHER' && <PrimaryButton disabled={!studentId} onClick={() => {
      setRemove(false);
      setDraft({
        schoolYear: year,
        type: 'CAREER_ACTIVITY',
        title: '',
        activityDate: todayValue(),
        content: '',
        interests: []
      });
    }}>진로 기록 추가</PrimaryButton>}<ApiState state={list}>{Array.isArray(list.data) && list.data.map(item => <article className="api-panel" key={item.id}><h2>{item.title}</h2><p>{item.activityDate} · {(item.interests || []).join(', ')}</p><p className="detail-copy">{item.content}</p>{account.role === 'TEACHER' && <button type="button" className="text-button" onClick={() => {
          setRemove(false);
          setDraft(item);
        }}>수정</button>}<button type="button" className="text-button danger" onClick={() => {
          setRemove(true);
          setDraft(item);
        }}>삭제</button></article>)}</ApiState><Pagination state={list} />{draft && <Modal title={remove ? '진로 기록 삭제' : '진로 기록'} onClose={() => setDraft(null)}><form className="api-stack" onSubmit={async e => {
        e.preventDefault();
        const body = {
          schoolYear: draft.schoolYear,
          type: draft.type,
          title: draft.title,
          activityDate: draft.activityDate,
          content: draft.content,
          interests: draft.interests,
          ...(draft.id ? {
            version: draft.version
          } : {})
        };
        if (await mutation.run(draft.id ? `/career-records/${draft.id}` : `/students/${studentId}/career-records`, {
          method: remove ? 'DELETE' : draft.id ? 'PATCH' : 'POST',
          ...(remove ? {} : {
            body
          })
        }, '처리했어요.')) {
          setDraft(null);
          list.reload();
        }
      }}>{remove ? <p>{draft.title} 기록을 삭제할까요?</p> : <><Field label="활동명" required value={draft.title} onChange={e => setDraft({
            ...draft,
            title: e.target.value
          })} /><Field label="활동 날짜" type="date" required value={draft.activityDate} onChange={e => setDraft({
            ...draft,
            activityDate: e.target.value
          })} /><Field label="관심사 (쉼표로 구분)" value={draft.interests.join(',')} onChange={e => setDraft({
            ...draft,
            interests: e.target.value.split(',')
          })} /><Field label="활동 내용" multiline required value={draft.content} onChange={e => setDraft({
            ...draft,
            content: e.target.value
          })} /></>}<SaveButton mutation={mutation}>{remove ? '삭제 확인' : '저장하기'}</SaveButton></form></Modal>}</section>;
}
