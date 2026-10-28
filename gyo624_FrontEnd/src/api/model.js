export const className = item => item?.name || item?.className || (item?.grade && item?.classNumber ? `${item.grade}학년 ${item.classNumber}반` : '학급');
export function assertUser(user) {
  if (!user?.id || !['TEACHER', 'ADMIN'].includes(user.role)) throw new Error('사용자 정보 응답을 확인할 수 없어요. 다시 로그인해 주세요.');
  return user;
}
export function blocksGate(gate) {
  return !gate || !['PASS', 'WARNING'].includes(gate.status) || (gate.summary?.errorCount || 0) > 0 || gate.issues?.some(item => item.severity === 'ERROR');
}
export function hasWarnings(gate) {
  return gate?.status === 'WARNING' || (gate?.summary?.warningCount || 0) > 0 || gate?.issues?.some(item => item.severity === 'WARNING');
}
export function safeDetails(value) {
  if (Array.isArray(value)) return value.map(safeDetails);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/token|password|secret|credential/i.test(key)).map(([key, item]) => [key, safeDetails(item)]));
  return value;
}
export const statusLabel = value => ({
  CREATE: '추가',
  UPDATE: '수정',
  DELETE: '삭제',
  DRAFT: '작성 중',
  SUBMITTED: '작성 완료',
  PASS: '통과',
  FAIL: '수정 필요',
  WARNING: '경고',
  ERROR: '오류',
  ACTIVE: '활성',
  SUSPENDED: '정지',
  INACTIVE: '비활성',
  INVITED: '초대 대기',
  QUEUED: '대기 중',
  PROCESSING: '처리 중',
  COMPLETED: '완료',
  FAILED: '실패',
  EXPIRED: '만료'
})[value] || value || '—';
