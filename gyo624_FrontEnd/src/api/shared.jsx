import { Field, PrimaryButton } from '../components/ui';
import { compareClassItems } from '../lib/classrooms';
import { className, safeDetails, statusLabel } from './model';
import { detailError } from './client';
export function ApiState({
  state,
  children,
  empty = '저장된 항목이 없어요.'
}) {
  if (state.loading) return <p role="status" className="agenda-empty">불러오는 중이에요.</p>;
  if (state.error) return <div className="api-error" role="alert"><p>{detailError(state.error)}</p><button type="button" className="secondary-button" onClick={state.reload}>다시 불러오기</button></div>;
  if (!state.data || Array.isArray(state.data) && !state.data.length) return <p className="agenda-empty">{empty}</p>;
  return children;
}
export function MutationError({
  mutation
}) {
  return mutation.error && <div className="field-error" role="alert"><p>{mutation.message}</p>{mutation.error.fields?.map((item, index) => <p key={index}>{item.field || item.studentId}: {item.reason || item.message}</p>)}</div>;
}
export function Pagination({
  state,
  onChange
}) {
  const totalPages = state.meta?.totalPages || 1;
  if (totalPages <= 1 && state.page <= 1) return null;
  return <nav className="api-pagination" aria-label="목록 페이지"><button type="button" className="secondary-button" disabled={state.loading || state.page <= 1} onClick={() => {
      onChange?.();
      state.setPage(state.page - 1);
    }}>이전</button><span>{state.page} / {totalPages}</span><button type="button" className="secondary-button" disabled={state.loading || state.page >= totalPages} onClick={() => {
      onChange?.();
      state.setPage(state.page + 1);
    }}>다음</button></nav>;
}
export function ClassSelect({
  classes,
  value,
  onChange,
  label = '학급',
  empty = '이 학년도에 등록된 학급이 없어요.'
}) {
  const options = Array.isArray(classes.data) ? [...classes.data].sort(compareClassItems) : [];
  return <><ApiState state={classes} empty={empty} /><Field label={label} required value={value} disabled={classes.loading || !!classes.error} onChange={event => onChange(event.target.value)}><option value="">학급 선택</option>{options.map(item => <option key={item.id} value={item.id}>{className(item)}</option>)}</Field>{classes.setPage && <Pagination state={classes} onChange={() => onChange('')} />}</>;
}
export function StudentSelect({
  students,
  value,
  onChange
}) {
  return <><ApiState state={students} empty="학급을 선택하거나 학생 명단을 확인해 주세요." /><Field label="학생" required value={value} disabled={students.loading || !!students.error} onChange={event => onChange(event.target.value)}><option value="">학생 선택</option>{Array.isArray(students.data) && students.data.map(item => <option key={item.id} value={item.id}>{item.number ? `${item.number}번, ` : ''}{item.name}</option>)}</Field><Pagination state={students} onChange={() => onChange('')} /></>;
}
export function SaveButton({ mutation, children = '저장하기', disabled = false, showError = true }) {
  return <>{showError && <MutationError mutation={mutation} />}<PrimaryButton type="submit" busy={mutation.busy} disabled={disabled}>{mutation.busy ? '처리 중…' : children}</PrimaryButton></>;
}
function statusParts(row) {
  return [
    row.studentCount != null ? `학생 ${row.studentCount}명` : '',
    row.recordCount != null ? `기록 ${row.recordCount}건` : '',
    row.completedCount != null ? `완료 ${row.completedCount}건` : ''
  ].filter(Boolean).join(', ');
}
export function StatusBoard({ title, rows }) {
  const list = Array.isArray(rows) ? rows : [];
  return <section className="api-panel"><h2>{title}</h2>{list.length ? <ul className="status-board">{list.map((row, index) => {
    const name = row.className || row.name || '항목';
    const base = row.studentCount || row.recordCount || 0;
    const value = row.studentCount ? row.recordCount || 0 : row.completedCount ?? row.recordCount ?? 0;
    const rate = base ? Math.min(100, Math.round(value / base * 100)) : 0;
    return <li key={`${name}-${index}`}><div className="status-copy"><strong>{name}</strong><span>{statusParts(row)}</span></div><div className="status-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate} aria-label={`${name} ${rate}%`}><span style={{ width: `${rate}%` }} /></div></li>;
  })}</ul> : <p className="agenda-empty">표시할 현황이 없어요.</p>}</section>;
}
export function UsageMonths({ months }) {
  const list = Array.isArray(months) ? months : [];
  return <section className="api-panel"><h2>기간별 사용 현황</h2><p className="dialog-hint">선택한 학년도의 월별 관찰, 생기부, 진로 기록 수예요.</p><div className="usage-months">{list.map(item => {
    const month = Number(String(item.month).slice(5));
    return <article key={item.month} className={item.total ? 'has-usage' : ''}><strong>{month}월</strong><span>{item.total || 0}건</span><small>관찰 {item.observations || 0}, 생기부 {item.records || 0}, 진로 {item.careers || 0}</small></article>;
  })}</div></section>;
}

const labels = {
  schoolYear: '학년도',
  studentId: '학생 ID',
  classId: '학급 ID',
  completionRate: '작성률',
  status: '상태',
  items: '항목',
  name: '이름',
  type: '종류',
  characterCount: '글자 수',
  maxCharacterCount: '최대 글자 수',
  updatedAt: '수정 시각',
  content: '내용',
  message: '안내',
  errors: '오류',
  warnings: '경고',
  total: '전체',
  valid: '검증 통과',
  issues: '확인할 내용',
  title: '제목',
  before: '변경 전',
  after: '변경 후',
  changes: '변경 내용',
  field: '항목',
  actor: '작업자',
  action: '작업',
  occurredAt: '작업 시각',
  resourceType: '대상 종류',
  recordCount: '기록 수',
  createdAt: '생성 시각',
  results: '결과',
  jobId: '작업 번호',
  transferId: '이관 번호',
  errorCount: '오류 수',
  warningCount: '경고 수',
  totalElements: '전체 항목 수',
  data: '결과',
  role: '역할',
  summary: '요약',
  className: '학급',
  studentCount: '학생 수',
  completedCount: '작성 완료',
  date: '날짜',
  count: '건수',
  email: '이메일',
  phone: '연락처'
};
export function JsonDetails({
  value
}) {
  const clean = safeDetails(value);
  if (Array.isArray(clean)) return <div className="api-details">{clean.map((item, i) => <div className="api-panel" key={i}><JsonDetails value={item} /></div>)}</div>;
  if (clean && typeof clean === 'object') return <dl className="api-details">{Object.entries(clean).map(([key, item]) => <div key={key}><dt>{labels[key] || key}</dt><dd><JsonDetails value={key.endsWith('At') && typeof item === 'string' && !Number.isNaN(Date.parse(item)) ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item)) : item} /></dd></div>)}</dl>;
  return <span>{clean === true ? '예' : clean === false ? '아니요' : statusLabel(String(clean ?? '—'))}</span>;
}
