export const pages = {
  '/timetable': { code: 'T21', title: '나의 시간표', description: '주간 수업을 등록하고 다른 교사와 수업 교체를 요청해요.', group: 'records' },
  '/admin/notifications': { code: 'A26', title: '알림함', description: '수업 교체 요청과 처리 결과를 확인해요.', group: 'admin-more' },
  '/timeline': { code: 'T06', title: '학급 타임라인', description: '수업과 학생 기록을 날짜별로 모아 봐요.', action: '기록 추가', group: 'timeline' },
  '/students': { code: 'T07', title: '학생별 관찰 기록', description: '구체적인 장면과 학생의 강점을 기록해요.', action: '관찰 저장하기', group: 'students' },
  '/observations/batch': { code: 'T08', title: '학급 관찰 한 번에 입력', description: '같은 수업 장면을 여러 학생에게 효율적으로 기록해요.', action: '선택 기록 저장하기', group: 'students' },
  '/coverage': { code: 'T09', title: '기록 커버리지', description: '학급과 기간별 기록 현황을 한눈에 확인해요.', action: '시간표 설정하기', destination: '/timetable', group: 'records' },
  '/evaluations': { code: 'T10', title: '평가 목록', description: '평가 기준과 진행 상태를 확인하고 새 평가를 만들어요.', action: '평가 만들기', destination: '/evaluations/create', group: 'more' },
  '/evaluations/create': { code: 'T11', title: '평가 만들기', description: '평가의 목적과 기준을 정하고 학생 기록과 연결해요.', action: '평가 저장하기', group: 'more' },
  '/career': { code: 'T12', title: '진로 탐색 기록', description: '학생의 관심과 경험을 바탕으로 다음 활동을 함께 찾아봐요.', action: '진로 기록 저장하기', group: 'more' },
  '/reports': { code: 'T13', title: '학생 기록 보드', description: '학생별 기록 진행 상황을 모아 확인해요.', group: 'more' },
  '/reports/edit': { code: 'T14', title: '기록 항목 편집', description: '관찰 기록을 바탕으로 학생의 성장 과정을 정리해요.', action: '임시 저장하기', group: 'more' },
  '/reports/check': { code: 'T15', title: '기재 요령 확인 결과', description: '기록을 제출하기 전에 표현과 필수 항목을 점검해요.', action: '수정할 항목 보기', destination: '/reports/edit', group: 'more' },
  '/transfer': { code: 'T17', title: '학생 기록 이관', description: '학급이 바뀌어도 필요한 기록을 안전하게 이어가요.', action: '선택 기록 이관하기', group: 'more' },
  '/notifications': { code: 'T19', title: '알림함', description: '기록과 학급 운영에 필요한 소식을 확인해요.', action: '알림 설정 보기', destination: '/settings', group: 'more' },
  '/settings': { code: 'T20', title: '설정', description: '계정과 알림, 표시 환경을 관리해요.', group: 'more' },
  '/admin': { code: 'A20', title: '학교 운영 현황', description: '학교의 기록 진행 상황과 운영 이슈를 살펴봐요.', group: 'admin' },
  '/admin/teachers': { code: 'A21', title: '교사 계정 관리', description: '학교 구성원의 역할과 계정 상태를 관리해요.', action: '교사 초대하기', group: 'admin-teachers' },
  '/admin/rosters': { code: 'A22', title: '학생 명단 관리', description: '학급 명단을 확인하고 학생 정보를 정리해요.', action: '학생 명단 추가하기', group: 'admin-more' },
  '/admin/timetable': { code: 'A23', title: '시간표 관리', description: '학급별 수업 시간과 담당 교사를 관리해요.', group: 'admin-timetable' },
  '/admin/settings': { code: 'A25', title: '설정', description: '계정과 학교 정보, 알림을 관리해요.', group: 'admin-more' },
  '/admin/audit': { code: 'A24', title: '감사 로그', description: '계정과 학급 정보의 주요 변경 내역을 확인해요.', group: 'admin-more' },
}
export const teacherMenu = [
  ['홈', '/coverage'], ['나의 시간표', '/timetable'], ['학생별 관찰', '/students'], ['학급 일괄 관찰', '/observations/batch'], ['타임라인 · 수업 메모', '/timeline'],
  ['평가', '/evaluations'], ['진로', '/career'], ['생기부', '/reports'], ['학생 기록 이관', '/transfer'], ['알림함', '/notifications'], ['설정', '/settings'],
]
export const adminMenu = [['관리자 홈', '/admin'], ['교사 계정', '/admin/teachers'], ['명단 관리', '/admin/rosters'], ['시간표 관리', '/admin/timetable'], ['알림함', '/admin/notifications'], ['감사 로그', '/admin/audit'], ['설정', '/admin/settings']]

export function menuActive(path, route) { return path === route || (path === '/evaluations' && route.startsWith('/evaluations/')) || (path === '/reports' && route.startsWith('/reports/')) }
