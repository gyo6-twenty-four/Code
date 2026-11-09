import { RECORD_TYPES, assignedRecordTypes, blocksGate, hasWarnings, recordTypeLabel, statusLabel } from './model';
import { useEffect, useId, useState } from 'react';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { WritingPane, WritingWorkspace } from '../components/WritingWorkspace';
import { navigate } from '../lib/state';
import { resource } from './client';
import { useMutation, usePage, useResource } from './hooks';
import { loadClasses, onNeisSchool, readNeisSchool } from './neis';
import { ApiState, ClassSelect, StudentSelect, JsonDetails, MutationError, Pagination, SaveButton, StatusBoard } from './shared';
export function Reports({
  year,
  notify,
  account
}) {
  const localClasses = usePage('/classes', {
    schoolYear: year,
    scope: 'school'
  });
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [neisSchool, setNeisSchool] = useState(readNeisSchool);
  const [classFetch, setClassFetch] = useState({ id: '', error: '', data: [] });
  const [attempt, setAttempt] = useState(0);
  const classQuery = neisSchool ? `${year}|${attempt}|${neisSchool.officeCode}|${neisSchool.schoolCode}` : '';
  useEffect(() => onNeisSchool(() => {
    setNeisSchool(readNeisSchool());
    setClassId('');
  }), []);
  useEffect(() => {
    if (!classQuery) return undefined;
    const controller = new AbortController();
    const id = classQuery;
    loadClasses(neisSchool, year, controller.signal).then(data => setClassFetch({ id, error: '', data })).catch(error => {
      if (error.name !== 'AbortError') setClassFetch({ id, error: error.message, data: [] });
    });
    return () => controller.abort();
  }, [classQuery, neisSchool, year]);
  const neisClasses = classQuery && classFetch.id === classQuery
    ? { loading: false, error: classFetch.error, data: classFetch.data }
    : { loading: Boolean(classQuery), error: '', data: [] };
  const seen = new Set();
  const classes = {
    loading: localClasses.loading || neisClasses.loading,
    error: localClasses.error || (neisClasses.error ? new Error(neisClasses.error) : null),
    data: [...(localClasses.data || []), ...neisClasses.data].filter(item => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }),
    reload: () => {
      localClasses.reload?.();
      setAttempt(value => value + 1);
    }
  };
  const students = usePage(classId ? `/classes/${classId}/students` : null, {
    schoolYear: year,
    scope: 'school'
  });
  function selectClass(id) {
    setClassId(id);
    setStudentId('');
    students.setPage(1);
  }
  function selectStudent(id) {
    setStudentId(id);
  }
  const board = useResource(classId ? resource(`/classes/${classId}/record-board`, {
    schoolYear: year
  }) : null);
  const studentBoard = useResource(studentId ? resource(`/students/${studentId}/record-board`, {
    schoolYear: year
  }) : null);
  const list = useResource(studentId ? resource(`/students/${studentId}/record-items`, {
    schoolYear: year
  }) : null);
  const allowed = assignedRecordTypes(account);
  const [create, setCreate] = useState(false),
    [type, setType] = useState(allowed[0] || '');
  const mutation = useMutation(notify);
  return <section className="api-stack"><div className="api-toolbar"><ClassSelect classes={classes} value={classId} onChange={selectClass} empty={neisSchool ? '이 학년도의 나이스 학급이 없어요.' : '이 학년도에 등록된 학급이 없어요.'} /><StudentSelect students={students} value={studentId} onChange={selectStudent} /></div><ApiState state={board} empty="학급을 선택하면 작성 현황이 보여요."><StatusBoard title="학급별 작성 현황" rows={board.data} /></ApiState><ApiState state={studentBoard} empty="학생을 선택하면 작성 현황이 보여요."><StatusBoard title="선택한 학생 작성 현황" rows={studentBoard.data} /></ApiState><ApiState state={list} empty="학생을 선택하거나 생기부 항목을 추가해 주세요.">{Array.isArray(list.data) && list.data.map(item => <article className="api-panel" key={item.id}><h2>{recordTypeLabel(item.type)}</h2><p>{statusLabel(item.status)}, {item.characterCount ?? item.content?.length ?? 0}자</p><a href={`/reports/edit?id=${item.id}&studentId=${studentId}`}>항목 열기 →</a></article>)}</ApiState>{account.role === 'TEACHER' && <PrimaryButton disabled={!studentId || !allowed.length} onClick={() => { setType(allowed[0] || ''); setCreate(true); }}>생기부 항목 추가</PrimaryButton>}{create && <Modal title="생기부 항목 추가" onClose={() => setCreate(false)}><form onSubmit={async e => {
        e.preventDefault();
        const result = await mutation.run(`/students/${studentId}/record-items`, {
          body: {
            schoolYear: year,
            type,
            content: '',
            status: 'DRAFT'
          }
        }, '항목을 추가했어요.');
        if (result?.data?.id) {
          setCreate(false);
          navigate(`/reports/edit?id=${result.data.id}&studentId=${studentId}`);
        } else if (result) {
          setCreate(false);
          list.reload();
        }
      }}><Field label="항목" value={type} onChange={e => setType(e.target.value)}>{RECORD_TYPES.filter(([key]) => allowed.includes(key)).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Field><SaveButton mutation={mutation} disabled={!allowed.includes(type)}>항목 추가하기</SaveButton></form></Modal>}</section>;
}
export function RecordEditor({
  query,
  notify,
  account,
  checkOnly = false
}) {
  const id = query.get('id'),
    state = useResource(id ? `/record-items/${encodeURIComponent(id)}` : null);
  return <ApiState state={state} empty="학생 기록 보드에서 항목을 선택해 주세요.">{state.data && <RecordDraft key={`${state.data.id}:${state.data.version}`} initial={state.data} notify={notify} account={account} reload={state.reload} checkOnly={checkOnly} />}</ApiState>;
}
function RecordDraft({
  initial,
  notify,
  account,
  reload,
  checkOnly
}) {
  const [content, setContent] = useState(initial.content || ''),
    [gate, setGate] = useState(null),
    [ack, setAck] = useState(false),
    [versionsOpen, setVersionsOpen] = useState(false),
    [restoreId, setRestoreId] = useState(''),
    [checkedVersion, setCheckedVersion] = useState(null),
    [rulesOpen, setRulesOpen] = useState(false);
  const rules = useResource(rulesOpen ? '/gate-rules' : null);
  const mutation = useMutation(notify),
    versions = useResource(versionsOpen ? `/record-items/${initial.id}/versions` : null);
  const dirty = content !== (initial.content || '');
  const warning = hasWarnings(gate);
  async function check() {
    setGate(null);
    setCheckedVersion(null);
    setAck(false);
    const result = await mutation.run(`/record-items/${initial.id}/gate-checks`, {
      body: {}
    });
    if (result) {
      setGate(result.data);
      setCheckedVersion(result.data?.version ?? initial.version);
    }
  }
  async function save(event) {
    event.preventDefault();
    if (await mutation.run(`/record-items/${initial.id}`, {
      method: 'PATCH',
      body: {
        schoolYear: initial.schoolYear,
        type: initial.type,
        content,
        status: 'DRAFT',
        version: initial.version
      }
    }, '임시 저장했어요.')) reload();
  }
  const formId = useId();
  const canEdit = account.role === 'TEACHER' && !checkOnly && assignedRecordTypes(account).includes(initial.type);
  const count = content.length;
  const countLabel = `${count.toLocaleString('ko-KR')}자${initial.maxCharacterCount ? ` / ${initial.maxCharacterCount.toLocaleString('ko-KR')}자` : ''}`;
  const canComplete = canEdit && !mutation.busy && !dirty && checkedVersion === initial.version && !blocksGate(gate) && (!warning || ack);
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      notify('기록 내용을 복사했어요.');
    } catch {
      notify('복사하지 못했어요. 미리보기에서 내용을 선택해 복사해 주세요.');
    }
  }
  async function complete() {
    if (await mutation.run(`/record-items/${initial.id}/submit`, {
      body: { version: initial.version, warningsAcknowledged: ack }
    }, '작성 완료 처리했어요.')) reload();
  }
  async function loadCheck() {
    const result = await mutation.run(`/record-items/${initial.id}/gate-checks/latest`, { method: 'GET' });
    if (result) {
      setGate(result.data);
      setCheckedVersion(result.data?.version ?? null);
      setAck(false);
    }
  }
  return <section className="api-stack">
    <div className="writing-metadata">
      <p><strong>{recordTypeLabel(initial.type)}</strong> · {statusLabel(initial.status)} · 버전 {initial.version}</p>
      <a href="/reports">작성 현황으로</a>
    </div>
    <WritingWorkspace
      source={<WritingPane variant="source" title="기록 작성" description="관찰한 사실을 바탕으로 내용을 작성해 주세요." footer={<>
        <span>{countLabel}</span>
        {canEdit && <PrimaryButton type="submit" form={formId} disabled={!dirty || mutation.busy}>{mutation.busy ? '처리 중…' : '임시 저장'}</PrimaryButton>}
      </>}>
        <form className="writing-record-form" id={formId} onSubmit={canEdit ? save : event => event.preventDefault()}>
          <Field label="기록 내용" multiline required readOnly={!canEdit} maxLength={initial.maxCharacterCount || undefined} value={content} placeholder="학생의 활동과 성장 내용을 입력해 주세요." onChange={e => {
            setContent(e.target.value);
            setGate(null);
            setCheckedVersion(null);
            setAck(false);
          }} />
        </form>
      </WritingPane>}
      result={<WritingPane variant="result" title="미리보기" description="작성한 내용과 확인 결과를 함께 볼 수 있어요." actions={<button type="button" className="secondary-button" disabled={!content.trim()} onClick={copy}>복사</button>} footer={canEdit && <>
        <button type="button" className="secondary-button" disabled={dirty || mutation.busy || !content.trim()} onClick={check}>글자 수 확인</button>
        <PrimaryButton disabled={!canComplete} onClick={complete}>작성 완료</PrimaryButton>
      </>}>
        <p className="writing-result-label">기록 문장</p>
        <div className={`writing-preview${content.trim() ? '' : ' is-empty'}`}>{content.trim() ? content : '기록을 입력하면 여기에 미리보기가 표시돼요.'}</div>
        {dirty && <p className="dialog-hint">임시 저장한 뒤 글자 수를 확인하고 작성 완료할 수 있어요.</p>}
        {gate && <section className="api-stack writing-check" aria-label="검사 결과" aria-live="polite">
          <h3>검사 결과 · {statusLabel(gate.status)}</h3>
          {gate.issues?.map((issue, index) => <article key={index}>
            <strong>{statusLabel(issue.severity)} · {issue.message}</strong>
            {Number.isInteger(issue.start) && Number.isInteger(issue.end) && <p><mark>{content.slice(issue.start, issue.end)}</mark></p>}
            {issue.suggestion && <p>{issue.suggestion}</p>}
          </article>)}
          {warning && <label className="api-check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />경고 내용을 확인했어요.</label>}
        </section>}
      </WritingPane>}
    />
    <div className="exchange-actions">
      <button type="button" className="text-button" disabled={dirty || mutation.busy} onClick={loadCheck}>최근 검사 결과</button>
      <button type="button" className="text-button" onClick={() => setVersionsOpen(true)}>변경 이력</button>
      <button type="button" className="text-button" onClick={() => setRulesOpen(true)}>작성 기준</button>
      <button type="button" className="text-button" disabled={dirty || mutation.busy} onClick={reload}>최신 내용 불러오기</button>
    </div>
    <MutationError mutation={mutation} />
    {rulesOpen && <Modal title="작성 기준" onClose={() => setRulesOpen(false)}><ApiState state={rules}><JsonDetails value={rules.data} /></ApiState></Modal>}{versionsOpen && <Modal title="변경 이력" onClose={() => {
      setVersionsOpen(false);
      setRestoreId('');
    }}><ApiState state={versions}>{Array.isArray(versions.data) && versions.data.map(item => <article className="api-panel" key={item.id}><p>버전 {item.version}, {item.createdAt}</p><p className="detail-copy">{item.content}</p>{canEdit && <button type="button" className="secondary-button" onClick={() => setRestoreId(item.id)}>이 버전 복원 선택</button>}</article>)}</ApiState>{restoreId && <><p>선택한 버전을 복원할까요? 편집 중인 내용은 먼저 보관해 주세요.</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
          if (await mutation.run(`/record-items/${initial.id}/versions/${restoreId}/restore`, {
            body: {
              version: initial.version
            }
          }, '과거 버전을 복원했어요.')) {
            setVersionsOpen(false);
            reload();
          }
        }}>복원 확인</PrimaryButton></>}<MutationError mutation={mutation} /></Modal>}</section>;
}
function useJobPolling(job) {
  useEffect(() => {
    if (!['QUEUED', 'PROCESSING'].includes(job.data?.status)) return;
    const timer = setInterval(job.reload, 3000);
    return () => clearInterval(timer);
  }, [job.data?.status, job.reload]);
}
export function Transfer({
  classes,
  classId,
  selectClass,
  students,
  year,
  notify
}) {
  const [selected, setSelected] = useState([]),
    [target, setTarget] = useState(''),
    [targetYear, setTargetYear] = useState(String(Number(year) + 1)),
    [policy, setPolicy] = useState('SKIP'),
    [includeCareers, setIncludeCareers] = useState(false),
    [preview, setPreview] = useState(null),
    [jobId, setJobId] = useState(''),
    [confirm, setConfirm] = useState(false);
  const targets = usePage('/classes', {
      schoolYear: targetYear
    }),
    mutation = useMutation(notify),
    job = useResource(jobId ? `/transfers/${jobId}` : null);
  useJobPolling(job);
  const body = {
    studentIds: selected,
    source: {
      schoolYear: year,
      classId
    },
    target: {
      schoolYear: targetYear,
      classId: target
    },
    include: ['OBSERVATIONS', ...(includeCareers ? ['CAREER_RECORDS'] : [])],
    conflictPolicy: policy
  };
  const change = fn => {
    fn();
    setPreview(null);
    setConfirm(false);
  };
  return <section className="api-stack"><ClassSelect classes={classes} value={classId} label="이관할 학급" onChange={value => change(() => {
      selectClass(value);
      setSelected([]);
    })} /><Field label="이관 받을 학년도" type="number" min={2000} max={2100} required value={targetYear} onChange={e => change(() => {
      setTargetYear(e.target.value);
      setTarget('');
    })} /><ClassSelect classes={targets} value={target} onChange={value => change(() => setTarget(value))} label="이관 받을 학급" /><Field label="충돌 처리" value={policy} onChange={e => change(() => setPolicy(e.target.value))}><option value="SKIP">기존 항목 건너뛰기</option><option value="CREATE_COPY">복사본 만들기</option><option value="OVERWRITE">기존 항목 덮어쓰기</option></Field><label className="api-check"><input type="checkbox" checked={includeCareers} onChange={e => change(() => setIncludeCareers(e.target.checked))} />진로 기록도 포함</label><ApiState state={students} empty={classId ? '이 학급에 등록된 학생이 없어요.' : '이관할 학급을 먼저 선택해 주세요.'}>{students.data?.map(item => <label className="api-check api-panel" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e => change(() => setSelected(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id)))} />{item.name}</label>)}</ApiState><Pagination state={students} /><PrimaryButton disabled={!selected.length || !target || mutation.busy || target === classId && targetYear === year} onClick={async () => {
      const result = await mutation.run('/transfers/preview', {
        body
      });
      if (result) setPreview(result.data);
    }}>이관 대상 미리보기</PrimaryButton>{preview && <section className="api-panel"><JsonDetails value={preview} /><PrimaryButton disabled={mutation.busy || preview.valid === false || !!preview.errors?.length} onClick={() => setConfirm(true)}>이관 실행하기</PrimaryButton></section>}{confirm && <Modal title="학생 기록 이관 확인" onClose={() => setConfirm(false)}><p>{year}학년도에서 {targetYear}학년도로 선택한 학생 {selected.length}명의 기록을 이관할까요?</p><p>중복 기록: {{ SKIP: '기존 항목 건너뛰기', CREATE_COPY: '복사본 만들기', OVERWRITE: '기존 항목 덮어쓰기' }[policy]}</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
        const result = await mutation.run('/transfers', {
          body,
          idempotent: true
        }, '이관을 요청했어요.');
        if (result) {
          setJobId(result.data?.transferId || result.data?.id || '');
          setConfirm(false);
          setPreview(null);
        }
      }}>이관 확인</PrimaryButton><MutationError mutation={mutation} /></Modal>}{jobId && <ApiState state={job}><p>이관 상태: {statusLabel(job.data?.status)}</p><JsonDetails value={job.data} />{job.data?.status === 'QUEUED' && <button type="button" className="secondary-button" disabled={mutation.busy} onClick={async () => {
        if (await mutation.run(`/transfers/${jobId}/cancel`, {
          body: {}
        }, '대기 중인 이관을 취소했어요.')) job.reload();
      }}>이관 취소</button>}</ApiState>}<MutationError mutation={mutation} /></section>;
}
