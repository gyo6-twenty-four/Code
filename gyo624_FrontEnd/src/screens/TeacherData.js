export const evaluationSeed = [
  { id: 'reading', name: '2학기 읽기 성장 기록', subject: '국어', criteria: ['읽은 내용을 자신의 말로 설명해요', '근거를 들어 생각을 설명해요', '내용을 문맥과 연결해요', '친구의 생각을 들어요'], status: '진행 중' },
  { id: 'math', name: '수학 문제 해결 과정', subject: '수학', criteria: ['풀이 과정을 설명해요', '다른 방법을 찾아봐요', '결과를 확인해요'], status: '검토' },
  { id: 'books', name: '함께 읽는 책 모임', subject: '창체', criteria: ['읽은 느낌을 나눠요', '친구의 생각을 들어요'], status: '초안' },
  { id: 'cooperation', name: '협력 활동 관찰', subject: '통합', criteria: ['역할을 함께 정해요', '의견을 나눠요', '활동을 돌아봐요'], status: '완료' },
]
export const careerSeed = [
  { id: 'minjun', student: '김민준', content: '과학 실험을 더 해 보고 싶다고 했어요', category: '관심' },
  { id: 'seoyeon', student: '박서연', content: '그림으로 생각을 표현하는 걸 좋아해요', category: '활동' },
  { id: 'doyun', student: '이도윤', content: '친구에게 규칙을 설명하는 일을 맡았어요', category: '강점' },
]
export const reportSeed = [
  { id: 'minjun', student: '김민준', item: '교과 학습 발달 상황', content: '', status: '검토', detail: '교과 기록 · 검토가 필요해요' },
  { id: 'seoyeon', student: '박서연', item: '행동 특성 및 종합 의견', content: '', status: '초안', detail: '행동 특성 · 초안이 있어요' },
  { id: 'doyun', student: '이도윤', item: '교과 학습 발달 상황', content: '', status: '완료', detail: '교과 기록 · 필수 항목을 확인했어요' },
]
export const notificationSeed = [
  { id: 'review', title: '기록 검토가 필요해요', detail: '기재 요령 확인 결과 · 김민준', meta: '10분 전', path: '/reports/check', read: false },
  { id: 'invite', title: '새 초대를 보냈어요', detail: '교사 계정 초대 · 정다은', meta: '어제', read: false },
  { id: 'timetable', title: '시간표가 바뀌었어요', detail: '1학년 2반 · 수요일 3교시', meta: '10.12', read: false },
  { id: 'export', title: '기록 내보내기가 완료됐어요', detail: '학생 기록 · CSV', meta: '10.11', path: '/reports/export', read: true },
]
