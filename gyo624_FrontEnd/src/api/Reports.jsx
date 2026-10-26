import { blocksGate, hasWarnings, statusLabel } from './model';
import { useEffect, useState } from 'react';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { navigate } from '../lib/state';
import { download, resource } from './client';
import { useMutation, usePage, useResource } from './hooks';
import { ApiState, ClassSelect, StudentSelect, JsonDetails, MutationError, Pagination, SaveButton } from './shared';
const types = {
  BEHAVIOR_AND_OVERALL_OPINION: '행동 특성 및 종합 의견'
};
export function Reports({
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
  const board = useResource(classId ? resource(`/classes/${classId}/record-board`, {
    schoolYear: year
  }) : null);
  const studentBoard = useResource(studentId ? resource(`/students/${studentId}/record-board`, {
    schoolYear: year
  }) : null);
  const list = useResource(studentId ? resource(`/students/${studentId}/record-items`, {
    schoolYear: year
  }) : null);
  const [create, setCreate] = useState(false),
    [type, setType] = useState('BEHAVIOR_AND_OVERALL_OPINION');
  const mutation = useMutation(notify);
  return <section className="api-stack"><div className="api-toolbar"><ClassSelect classes={classes} value={classId} onChange={selectClass} /><StudentSelect students={students} value={studentId} onChange={selectStudent} /></div><ApiState state={board}><section className="api-panel"><h2>학급 작성 현황</h2><JsonDetails value={board.data} /></section></ApiState><ApiState state={studentBoard}><section className="api-panel"><h2>선택한 학생 작성 현황</h2><JsonDetails value={studentBoard.data} /></section></ApiState><ApiState state={list} empty="학생을 선택하거나 생기부 항목을 추가해 주세요.">{Array.isArray(list.data) && list.data.map(item => <article className="api-panel" key={item.id}><h2>{types[item.type] || item.type}</h2><p>{statusLabel(item.status)} · {item.characterCount ?? item.content?.length ?? 0}자</p><a href={`#/reports/edit?id=${item.id}&studentId=${studentId}`}>항목 열기 →</a></article>)}</ApiState>{account.role === 'TEACHER' && <PrimaryButton disabled={!studentId} onClick={() => setCreate(true)}>생기부 항목 추가</PrimaryButton>}{create && <Modal title="생기부 항목 추가" onClose={() => setCreate(false)}><form onSubmit={async e => {
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
      }}><Field label="항목" value={type} onChange={e => setType(e.target.value)}>{Object.entries(types).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Field><SaveButton mutation={mutation}>항목 추가하기</SaveButton></form></Modal>}</section>;
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
  const teacher = account.role === 'TEACHER',
    dirty = content !== (initial.content || '');
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
      setCheckedVersion(initial.version);
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
  return <section className="api-panel api-stack"><h2>{types[initial.type] || initial.type}</h2><p>상태: {statusLabel(initial.status)} · 버전 {initial.version}</p><form className="api-stack" onSubmit={save}><Field label="기록 내용" multiline required readOnly={!teacher || checkOnly} maxLength={initial.maxCharacterCount || undefined} value={content} onChange={e => {
        setContent(e.target.value);
        setGate(null);
        setAck(false);
      }} /><p>{content.length}자{initial.maxCharacterCount ? ` / ${initial.maxCharacterCount}자` : ''}</p>{teacher && !checkOnly && <SaveButton mutation={mutation} showError={false} disabled={!dirty}>임시 저장하기</SaveButton>}</form><div className="exchange-actions">{teacher && <PrimaryButton disabled={dirty || mutation.busy} onClick={check}>기재 요령 검사</PrimaryButton>}<button type="button" className="secondary-button" disabled={dirty || mutation.busy} onClick={async () => {
        const result = await mutation.run(`/record-items/${initial.id}/gate-checks/latest`, {
          method: 'GET'
        });
        if (result) {
          setGate(result.data);
          setCheckedVersion(null);
          setAck(false);
        }
      }}>최근 검사 결과</button><button type="button" className="secondary-button" onClick={() => setVersionsOpen(true)}>변경 이력</button><button type="button" className="text-button" onClick={() => setRulesOpen(true)}>적용 중인 기재 규칙</button><button type="button" className="text-button" onClick={reload}>최신 내용 불러오기</button></div>{dirty && <p className="dialog-hint">변경 내용을 저장한 뒤 검사·제출할 수 있어요.</p>}{gate && <section className="api-stack"><h3>검사 결과 · {statusLabel(gate.status)}</h3><p>규칙 버전 {gate.ruleVersion} · {gate.checkedAt}</p>{gate.issues?.map((issue, i) => <article className="api-panel" key={i}><strong>{statusLabel(issue.severity)} · {issue.message}</strong><p>{issue.start}~{issue.end} 위치</p>{Number.isInteger(issue.start) && Number.isInteger(issue.end) && <p><mark>{content.slice(issue.start, issue.end)}</mark></p>}<p>{issue.suggestion}</p></article>)}{warning && <label className="api-check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />경고 내용을 확인했어요.</label>}</section>}{teacher && <PrimaryButton disabled={mutation.busy || dirty || !gate || checkedVersion !== initial.version || blocksGate(gate) || warning && !ack} onClick={async () => {
      if (await mutation.run(`/record-items/${initial.id}/submit`, {
        body: {
          version: initial.version,
          warningsAcknowledged: ack
        }
      }, '작성 완료 처리했어요.')) reload();
    }}>작성 완료하기</PrimaryButton>}<MutationError mutation={mutation} />{rulesOpen && <Modal title="적용 중인 기재 규칙" onClose={() => setRulesOpen(false)}><ApiState state={rules}><JsonDetails value={rules.data} /></ApiState></Modal>}{versionsOpen && <Modal title="변경 이력" onClose={() => {
      setVersionsOpen(false);
      setRestoreId('');
    }}><ApiState state={versions}>{Array.isArray(versions.data) && versions.data.map(item => <article className="api-panel" key={item.id}><p>버전 {item.version} · {item.createdAt}</p><p className="detail-copy">{item.content}</p>{teacher && <button type="button" className="secondary-button" onClick={() => setRestoreId(item.id)}>이 버전 복원 선택</button>}</article>)}</ApiState>{restoreId && <><p>선택한 버전을 복원할까요? 편집 중인 내용은 먼저 보관해 주세요.</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
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
export function ExportRecords({
  classes,
  classId,
  selectClass,
  students,
  year,
  notify
}) {
  const [selected, setSelected] = useState([]),
    [preview, setPreview] = useState(null),
    [jobId, setJobId] = useState(''),
    [ack, setAck] = useState(false);
  const mutation = useMutation(notify),
    job = useResource(jobId ? `/exports/${jobId}` : null);
  useJobPolling(job);
  const body = {
    classId,
    studentIds: selected,
    recordTypes: ['BEHAVIOR_AND_OVERALL_OPINION'],
    format: 'XLSX',
    schoolYear: year
  };
  return <section className="api-stack"><ClassSelect classes={classes} value={classId} onChange={value => {
      selectClass(value);
      setSelected([]);
      setPreview(null);
      setAck(false);
    }} /><ApiState state={students}>{students.data?.map(item => <label className="api-check api-panel" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e => {
          setSelected(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id));
          setPreview(null);
          setAck(false);
        }} />{item.name}</label>)}</ApiState><Pagination state={students} /><p>파일 형식: XLSX · 행동 특성 및 종합 의견</p><PrimaryButton disabled={!selected.length || mutation.busy} onClick={async () => {
      const result = await mutation.run('/exports/neis/preview', {
        body
      });
      if (result) setPreview(result.data);
    }}>내보내기 미리보기</PrimaryButton>{preview && <section className="api-panel api-stack"><JsonDetails value={preview} /><label className="api-check"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />미리보기와 경고 내용을 확인했어요.</label><PrimaryButton disabled={!ack || mutation.busy || preview.gateStatus === 'FAIL' || preview.status === 'FAIL' || preview.issues?.some(item => item.severity === 'ERROR')} onClick={async () => {
        const result = await mutation.run('/exports/neis', {
          body: {
            ...body,
            warningsAcknowledged: ack
          },
          idempotent: true
        }, '내보내기 작업을 요청했어요.');
        if (result) {
          setJobId(result.data?.exportId || result.data?.id || '');
          setPreview(null);
        }
      }}>내보내기 작업 시작</PrimaryButton></section>}{jobId && <ApiState state={job}><section className="api-panel api-stack"><p>작업 상태: {statusLabel(job.data?.status)}</p>{job.data?.status === 'COMPLETED' && <PrimaryButton disabled={mutation.busy} onClick={async () => {
          try {
            await download(`/exports/${jobId}/download`, '교육24.xlsx');
          } catch (error) {
            notify(error.message);
          }
        }}>파일 다운로드</PrimaryButton>}{['FAILED', 'EXPIRED'].includes(job.data?.status) && <p role="alert">{job.data?.message || '작업에 실패했거나 다운로드 기간이 만료됐어요. 다시 요청해 주세요.'}</p>}<button type="button" className="text-button" onClick={job.reload}>상태 새로고침</button></section></ApiState>}<MutationError mutation={mutation} /></section>;
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
    })} /><ClassSelect classes={targets} value={target} onChange={value => change(() => setTarget(value))} label="이관 받을 학급" /><Field label="충돌 처리" value={policy} onChange={e => change(() => setPolicy(e.target.value))}><option value="SKIP">기존 항목 건너뛰기</option><option value="CREATE_COPY">복사본 만들기</option><option value="OVERWRITE">기존 항목 덮어쓰기</option></Field><label className="api-check"><input type="checkbox" checked={includeCareers} onChange={e => change(() => setIncludeCareers(e.target.checked))} />진로 기록도 포함</label><ApiState state={students}>{students.data?.map(item => <label className="api-check api-panel" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e => change(() => setSelected(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id)))} />{item.name}</label>)}</ApiState><Pagination state={students} /><PrimaryButton disabled={!selected.length || !target || mutation.busy || target === classId && targetYear === year} onClick={async () => {
      const result = await mutation.run('/transfers/preview', {
        body
      });
      if (result) setPreview(result.data);
    }}>이관 대상 미리보기</PrimaryButton>{preview && <section className="api-panel"><JsonDetails value={preview} /><PrimaryButton disabled={mutation.busy || preview.valid === false || !!preview.errors?.length} onClick={() => setConfirm(true)}>이관 실행하기</PrimaryButton></section>}{confirm && <Modal title="학생 기록 이관 확인" onClose={() => setConfirm(false)}><p>{year}학년도에서 {targetYear}학년도로 선택한 학생 {selected.length}명의 기록을 이관할까요?</p><p>충돌 정책: {policy}</p><PrimaryButton disabled={mutation.busy} onClick={async () => {
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
