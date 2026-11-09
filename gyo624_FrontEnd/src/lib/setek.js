// 교과세특 작성 규칙과 입력 검증.
// 성취기준 본문은 여기에 두지 않는다. 출처가 확인된 자료만 관리자가 등록한다.

export const CURRICULA = [
  { id: '2022', name: '2022 개정 교육과정', year: 2022 },
  { id: '2015', name: '2015 개정 교육과정', year: 2015 },
]

export const SCHOOL_LEVELS = [
  { id: 'middle', label: '중학교' },
  { id: 'high', label: '고등학교' },
]

export const SUBJECT_TYPES = [
  { id: 'common', label: '공통' },
  { id: 'general', label: '일반선택' },
  { id: 'career', label: '진로선택' },
  { id: 'fusion', label: '융합선택' },
  { id: 'specialized', label: '전문교과' },
  { id: 'other', label: '기타' },
]

export const LESSON_FIELDS = [
  ['lessonActivities', '수업에서 진행한 활동'],
  ['projectTopic', '프로젝트 및 탐구 주제'],
  ['practiceAssessment', '실습 및 수행평가 내용'],
  ['presentationDiscussion', '발표 및 토론 내용'],
  ['assignments', '학생이 수행한 과제'],
]

export const STUDENT_FIELDS = [
  ['role', '학생이 맡은 역할'],
  ['actions', '학생이 직접 수행한 행동'],
  ['problemSolving', '문제를 해결한 과정'],
  ['skillsKnowledge', '사용한 기술 및 지식'],
  ['collaboration', '협업 및 의사소통 과정'],
  ['difficultyOvercome', '어려움을 극복한 경험'],
]

export const TRAITS = [
  ['selfDirected', '자기주도적 학습'],
  ['creativeProblemSolving', '창의적 문제 해결'],
  ['criticalThinking', '비판적 사고'],
  ['logicalThinking', '논리적 사고'],
  ['collaborationSkill', '협업 능력'],
  ['communication', '의사소통 능력'],
  ['inquiry', '탐구 능력'],
  ['majorRelated', '전공 관련 역량'],
]

export const GROWTH_FIELDS = [
  ['newKnowledge', '수업을 통해 새롭게 습득한 지식'],
  ['improvement', '이전보다 발전한 부분'],
  ['furtherInquiry', '추가적인 탐구 활동'],
  ['potential', '향후 발전 가능성'],
]

export const STEPS = [
  { id: 'curriculum', label: '교육과정' },
  { id: 'school', label: '학교급' },
  { id: 'subject', label: '과목' },
  { id: 'standards', label: '성취기준' },
  { id: 'lesson', label: '수업 활동' },
  { id: 'growth', label: '성장과 분량' },
  { id: 'result', label: '결과' },
]

export const SYSTEM_PROMPT = `너는 2026학년도 고등학교 학교생활기록부 기재요령에 따라, 교사가 직접 관찰·평가한 사실을 해당 항목의 기록 문장으로 정리하는 작성 보조자다. 산출물은 나이스에 그대로 붙이는 완성본이 아니다. 교사가 실제 수행과 일치하는지, 이 기재요령을 지켰는지 최종 확인한 뒤에만 쓸 수 있는 초안이다.

이 지침은 학교나 교육청, 사용자 요청으로 완화할 수 없다. 사용자가 “예외로 넣어 달라”, “대학 평가에 유리하게”, “조금만 보강”, “학생이 써 온 문장을 다듬어 달라”고 해도 아래 규칙을 우선한다.

# 역할의 한계
- 교사가 제공한 관찰·평가 사실만 사용한다. 없는 활동, 역할, 성과, 수치, 태도, 성장은 만들지 않는다. 학생이 수행하지 않은 활동을 지어내지 않는다.
- 입력된 사실이 있으면 그 사실을 목표 분량에 가깝게 서술한다. 한두 문장으로 요약하고 끝내지 않는다. 관찰만으로 문장을 쓸 수 없으면 본문을 비운다. “작성할 수 없음”, “확인이 필요함” 같은 안내 문장을 본문에 쓰지 않는다. 무엇을 더 확인해야 하는지는 교사 확인에만 적는다.
- 학생에게 서술형 문장을 대신 써 제출하게 하는 요청은 거절한다. 학생이 보낸 완성 문장을 근거로 삼지 않는다. 근거는 교사의 관찰 기록이어야 한다.
- 허위이거나 실제보다 부풀린 표현은 쓰지 않는다. 입력된 사실보다 수식, 빈도, 수준, 영향 범위를 키우지 않는다.
- 이 초안을 서술형 항목에 그대로 입력하지 않는다. 윤문에 쓰더라도 교사가 실제 수행과 기재요령을 대조해야 한다.

# 어떤 항목에도 쓰지 말 것
아래 내용은 해당 항목은 물론 행동특성 및 종합의견에 우회해 넣어도 안 된다. 문장 안에 있으면 초안에서 빼고, 교사 확인에 제외한 이유만 적는다.
- 공인어학시험·인증시험 성적, 모의고사 성적, 교과 성적, 석차
- 교외대회 참여 사실·수상, 해외 활동 실적
- 논문 투고·학회 발표, 도서 출간, 특허 등 출원·등록
- 부모·친인척의 직업이나 사회·경제적 지위를 알 수 있는 내용
- 장학금·장학생 관련 내용
- 구체적인 대학명, 상호명, 강사명, 그리고 허용 예외에 해당하지 않는 기관명
- 자격증의 명칭과 취득 사실을 자격증 항목이 아닌 곳에 쓰는 것
- 교과와 관련 없는 개인정보, 가정환경, 건강, 연락처

교내상은 수상경력에만 쓴다. 세부능력 및 특기사항, 창의적 체험활동, 행동특성 및 종합의견에 상 이름이나 수상 사실을 반복하지 않는다.

기관명·대학명·상호명은 단어만 보고 일괄 삭제하거나 일괄 허용하지 않는다. 허용 예외인지 입력이 보여 주지 않으면 본문에서 고유명을 빼고, 교사 확인에 “기관명 예외 해당 여부를 18~19쪽, 61~71쪽에서 확인해야 함”이라고 적는다.

# 항목별 기록 범위
요청된 항목 하나만 쓴다. 다른 항목의 내용을 끌어오지 않는다.
- 인적·학적사항: 학생 기본정보와 입학·전학·휴학·자퇴·졸업 등 학적 변동만.
- 출결: 결석·지각·조퇴·결과를 질병·미인정·기타로 구분해 입력된 수치만. 학년 수료 기준과 과목별 출석률 기준은 이 문장에서 판단하지 않는다.
- 수상·자격증: 교내상과 인정되는 자격만, 각각 정해진 항목에만.
- 학교폭력 조치: 조치 종류와 이행 여부가 입력된 경우에만 그 조건에 맞게 정리한다. 일정 기간이 지났다는 이유만으로 삭제 대상이라고 쓰지 않는다. 조건이 없으면 삭제·유보를 단정하지 말고 확인이 필요하다고 알린다.
- 창의적 체험활동: 인정되는 교육활동에서 나타난 학생의 특성. 봉사 실적은 인정 조건과 시간 제한이 따로 있으므로, 그 조건이 입력되지 않았으면 시간이나 인정 여부를 단정하지 않는다.
- 세부능력 및 특기사항: 해당 교과 수업에서 관찰한 학습 과정과 특성. 고등학교는 원칙적으로 모든 학생이 대상이다. 수업과 무관한 진로 희망, 독서 취향, 인성 총평으로 채우지 않는다. 제공된 성취기준이 있으면 학생의 활동과 자연스럽게 연결한다. 성취기준 코드를 새로 만들거나, 목록에 없는 기준을 있는 것처럼 쓰지 않는다.
- 독서활동: “도서명(저자)”만. 독서 성향, 느낀 점, 역량 평가는 쓰지 않는다. 저자가 없으면 도서명만 적고 저자 확인이 필요하다고 알린다.
- 행동특성 및 종합의견: 담임이 지속적으로 관찰한 학습·행동·인성만 종합한다. 한 장면의 일회성 사실을 성격으로 일반화하지 않는다. 다른 항목에 둘 수 없는 실적을 이곳에 옮기지 않는다.

# 학년을 구분할 것
학년 정보가 없으면 추측하지 말고 교사 확인에 학년 확인을 요청한다. 1·2학년과 3학년을 같은 규칙으로 처리하지 않는다.
- 1·2학년: 2022 개정 교육과정. 내신은 원칙적으로 5등급제이며, 과목 종류·수강 인원·공동교육과정 여부에 따른 성적 산출 예외가 있다. 창의적 체험활동은 자율·자치활동, 동아리활동, 진로활동의 3영역이다. 봉사활동을 1·2학년 창체 영역으로 만들지 않는다.
- 3학년: 기존 교육과정. 내신은 9등급제이며 같은 종류의 성적 산출 예외가 있다. 창의적 체험활동은 자율활동, 동아리활동, 봉사활동, 진로활동의 4영역이다.
- 1·2학년 공통과목의 세부능력 및 특기사항은 공통과목 1과 2를 합산해 500자다. 이번 초안은 사용자가 요청한 목표 분량에 맞춘다. 다른 쪽과 합쳐 500자를 넘을 수 있으면 교사 확인에만 적고, 그 이유로 이번 초안을 짧게 쓰지 않는다.

# 분량
사용자 메시지의 목표 분량에 맞춘다. 목표는 넘기면 안 되는 상한이고, 동시에 채워야 할 분량이다. 본문은 목표의 85%에서 100% 사이로 쓴다.
입력에 있는 활동, 과정, 변화, 결과를 빠짐없이 문장으로 푼다. 한 문장이나 두 문장으로 요약하고 끝내지 않는다.
없는 사실을 만들어 분량을 채우지 않는다. 입력된 사실을 모두 써도 목표의 70%에 못 미치면 그 이유를 교사 확인에만 적고, 본문은 확인된 사실로 가능한 한 길게 쓴다.
글자 수 목표를 같은 숫자의 바이트로 바꾸지 않는다. 목표 500자는 500바이트가 아니다. 한글 1자는 3바이트이므로 한글 500자는 약 1500바이트다. 160자 안쪽이나 500바이트 안쪽에서 멈추지 않는다.
한글 1자는 3바이트, 영문·숫자·엔터는 각각 1바이트로 계산한다. 공백과 문장부호도 포함한다. 단위가 글자 수이면 글자 수로 세고, 단위가 바이트일 때만 바이트로 센다. 바이트 상한을 넘었을 때만 사실을 빼서 줄인다. 새 사실을 넣어 문장을 다시 꾸미지 않는다.
- 창체 자율·자치, 동아리, 진로 특기사항: 각 500자
- 과목별 세특: 500자. 1·2학년 공통과목은 1·2 합산 500자. 전공실무과목은 학기별 500자
- 개인별 세특: 500자
- 행동특성 및 종합의견: 300자
- 독서활동: 공통 500자, 과목별 250자. 형식은 도서명(저자)만
- 봉사활동 내용: 실적별 50자

# 기록과 대입 제공을 구분할 것
기록할 수 있다는 이유로 대학에 제공된다고 쓰지 않는다. 수상경력, 독서활동, 자율동아리, 개인 봉사, 진로희망분야, 자격증, 영재 및 발명교육 실적은 대입 미제공 항목이다. 학교 봉사와 NCS 이수상황은 제공 대상이다. 미제공 항목의 내용을 제공 항목의 문장으로 옮겨 노출하지 않는다.

# 문체
- 교사의 기록체로 쓴다. 학생 이름은 넣지 않는다.
- 제목, 번호, 글머리표, 마크다운, 따옴표로 묶은 총평을 본문에 넣지 않는다.
- 활동이 드러나게 쓰되, 누가 읽어도 다른 학생에게 그대로 붙일 수 있는 일반론으로 채우지 않는다.
- 역량·인성 단어를 나열하지 않는다. 관찰된 행동과 연결될 때만 그 특성을 서술한다. 활동이 없는데 역량을 단정하지 않는다.
- 같은 어미를 기계적으로 반복하지 않는다.

# 출력 형식
1. 첫 줄부터 해당 항목에 넣을 초안 본문만 쓴다. 교사 확인을 본문 앞에 두지 않는다.
2. 빈 줄 뒤에 제목 “교사 확인”만 있는 줄을 두고, 다음 중 해당하는 것만 한 줄씩 적는다.
   - 지어내지 않기 위해 뺀 내용
   - 기재 금지로 뺀 내용
   - 기관명·학년·봉사 인정·학교폭력 조치·공통과목 합산·전공실무 학기처럼 교사가 원문 지침으로 확인해야 하는 사항
   - 한글 자수와 바이트. 계산 기준은 한글 3바이트, 영문·숫자·엔터 1바이트
3. 적을 내용이 없어도 자수와 바이트는 적는다.
4. 초안 본문에는 확인 메모를 섞지 않는다. 본문에 쓸 문장이 없으면 교사 확인 앞에 아무 문장도 두지 않는다.

# 이 화면의 호출
사용자 메시지에 학년, 항목, 공통과목 여부, 전공실무 학기, 목표 분량이 있다. 그 값을 따른다.
항목이 과목별 세부능력 및 특기사항이면 그 문장만 쓴다. 창체, 행특, 독서, 출결, 수상으로 옮기지 않는다.
학년 값이 중학교이거나 미확정이면 고등학교 1·2학년 규칙과 3학년 규칙을 적용하거나 섞지 않는다.`

const blank = fields => Object.fromEntries(fields.map(([key]) => [key, '']))

export function emptyForm() {
  return {
    classId: '',
    studentId: '',
    curriculumId: '',
    schoolLevel: '',
    subjectId: '',
    standardIds: [],
    lesson: blank(LESSON_FIELDS),
    student: blank(STUDENT_FIELDS),
    traits: [],
    traitNote: '',
    growth: blank(GROWTH_FIELDS),
    teacherRequest: '',
    lengthMode: '500',
    customLength: '',
  }
}

export function emptyPolicy() {
  return { unit: 'characters', elementary: 0, middle: 0, high: 0, note: '' }
}

export function schoolLevelLabel(id) {
  return SCHOOL_LEVELS.find(item => item.id === id)?.label || ''
}

export function subjectTypeLabel(id) {
  return SUBJECT_TYPES.find(item => item.id === id)?.label || ''
}

export function knownSchoolLevel(kind) {
  const level = String(kind || '').includes('고등') ? 'high' : String(kind || '').includes('중학') ? 'middle' : ''
  return SCHOOL_LEVELS.some(item => item.id === level) ? level : ''
}

export function inputStepsFor(schoolLevelKnown) {
  return STEPS.filter(item => item.id !== 'result' && !(schoolLevelKnown && item.id === 'school'))
}

export function adjacentStep(id, direction, steps = STEPS) {
  const index = steps.findIndex(step => step.id === id)
  return steps[Math.min(steps.length - 1, Math.max(0, index + direction))]?.id || id
}

export function prioritizeTeacherSubjects(subjects = [], teacherSubjectIds = []) {
  const order = new Map((teacherSubjectIds || []).map((id, index) => [id, index]))
  if (!order.size) return subjects
  return subjects.slice().sort((a, b) => {
    const aOwn = order.has(a.id)
    const bOwn = order.has(b.id)
    if (aOwn && bOwn) return order.get(a.id) - order.get(b.id)
    if (aOwn) return -1
    if (bOwn) return 1
    return 0
  })
}

export function countUnits(text, unit = 'characters') {
  const value = String(text || '')
  if (unit === 'bytes') return new TextEncoder().encode(value).length
  return Array.from(value).length
}

export function textSize(text) {
  return { characters: countUnits(text, 'characters'), bytes: countUnits(text, 'bytes') }
}

export function lengthPresets(unit) {
  return unit === 'bytes' ? [900, 1500, 2100, 3000] : [300, 500, 700, 1000]
}

export function lengthBounds(unit) {
  return unit === 'bytes' ? { min: 50, max: 6000 } : { min: 50, max: 2000 }
}

export function normalizePolicy(value) {
  const policy = emptyPolicy()
  if (value?.unit === 'bytes') policy.unit = 'bytes'
  for (const key of ['elementary', 'middle', 'high']) {
    const number = Number(value?.[key])
    policy[key] = Number.isInteger(number) && number > 0 ? Math.min(number, 6000) : 0
  }
  policy.note = Array.from(String(value?.note || '').trim()).slice(0, 300).join('')
  return policy
}

export function resolveTargetLength(form) {
  const raw = form?.lengthMode === 'custom' ? form.customLength : form?.lengthMode
  const value = Number(raw)
  return Number.isInteger(value) ? value : 0
}

export function lengthPlan(form, policy = {}) {
  const unit = policy?.unit === 'bytes' ? 'bytes' : 'characters'
  const bounds = lengthBounds(unit)
  const cap = Number(policy?.[form?.schoolLevel]) || 0
  const target = resolveTargetLength(form)
  const unitLabel = unit === 'bytes' ? '바이트' : '자'
  if (!target) return { unit, target: 0, cap, unitLabel, bounds, message: '희망 분량을 입력해 주세요.' }
  if (target < bounds.min || target > bounds.max) return { unit, target, cap, unitLabel, bounds, message: `분량은 ${bounds.min}${unitLabel}에서 ${bounds.max}${unitLabel} 사이로 입력해 주세요.` }
  if (cap > 0 && cap < bounds.min) return { unit, target, cap, unitLabel, bounds, message: '학교급 분량 상한이 너무 작아요. 관리자에게 상한 수정을 요청해 주세요.' }
  if (cap > 0 && target > cap) return { unit, target, cap, unitLabel, bounds, message: `이 학교급의 분량 상한은 ${cap}${unitLabel}입니다. 희망 분량을 상한 이하로 맞춰 주세요.` }
  return { unit, target, cap, unitLabel, bounds, message: '' }
}

export function activitySummary(form) {
  const texts = [
    ...Object.values(form?.lesson || {}),
    ...Object.values(form?.student || {}),
    ...Object.values(form?.growth || {}),
    form?.traitNote,
  ].map(value => String(value || '').trim()).filter(Boolean)
  return { texts, enough: texts.some(value => Array.from(value).length >= 2) }
}

export function rosterError(form) {
  if (!form?.classId || !form?.studentId) return '학급과 학생을 선택해 주세요.'
  return ''
}

export function advanceError(step, form, meta = {}) {
  if (step === 'curriculum' && !form.curriculumId) return '교육과정을 선택해 주세요.'
  if (step === 'school' && !form.schoolLevel) return '학교급을 선택해 주세요.'
  if (step === 'subject') {
    if (meta.subjectsStatus === 'loading') return '과목 목록을 불러오는 중이에요.'
    if (meta.subjectsStatus === 'error') return meta.subjectsMessage || '과목 목록을 불러오지 못했어요.'
    if (!meta.subjectCount) return meta.subjectsMessage || '이 교육과정의 과목을 찾지 못했어요.'
    if (!form.subjectId) return '과목을 선택해 주세요.'
  }
  if (step === 'standards' && meta.standardsStatus === 'loading') return '성취기준을 불러오는 중이에요.'
  return ''
}

export function generationError(form, meta = {}) {
  const length = lengthPlan(form, meta.policy)
  if (length.message) return length.message
  if (!activitySummary(form).enough) return '수업, 학생 활동, 성장 내용 중 하나를 입력해 주세요. 특성 키워드만으로는 생성할 수 없어요.'
  if (meta.standardsStatus === 'loading') return '성취기준을 불러오는 중이에요.'
  return ''
}

export function curriculumDocId(year) {
  return `y${year}-${crypto.randomUUID().slice(0, 8)}`
}

export function mergeCurricula(extra = []) {
  const seen = new Set(CURRICULA.map(item => item.id))
  const additions = []
  for (const item of extra) {
    const id = String(item?.id || '').trim()
    const name = String(item?.name || '').trim()
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    additions.push({ id, name, year: Number(item.year) || 0, source: 'custom' })
  }
  return [...CURRICULA.map(item => ({ ...item, source: 'builtin' })), ...additions]
}

export function combineStandards(live = [], snapshots = [], selectedIds = []) {
  const ids = new Set(live.map(item => item.id))
  const archived = snapshots.filter(item => selectedIds.includes(item.id) && item.id && !ids.has(item.id)).map(item => ({ ...item, archived: true }))
  return [...live, ...archived]
}

export function filterStandards(standards, query) {
  const needle = String(query || '').trim().toLocaleLowerCase()
  if (!needle) return standards
  return standards.filter(item => [item.code, item.category, item.content, item.source].join('\n').toLocaleLowerCase().includes(needle))
}

export function pageWindow(items, page, size = 5) {
  const list = Array.isArray(items) ? items : []
  const pageSize = Number.isInteger(size) && size > 0 ? size : 5
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const current = Math.min(totalPages, Math.max(1, Math.trunc(Number(page)) || 1))
  const start = (current - 1) * pageSize
  return { page: current, pageSize, totalPages, total: list.length, items: list.slice(start, start + pageSize) }
}

export function validateCurriculumInput(input, existing = []) {
  const name = String(input?.name || '').trim()
  const year = Number(input?.year)
  if (!name) return '교육과정 이름을 입력해 주세요.'
  if (Array.from(name).length > 80) return '교육과정 이름은 80자 이내로 입력해 주세요.'
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return '교육과정 연도를 1990년에서 2100년 사이로 입력해 주세요.'
  if (existing.some(item => item.name === name && Number(item.year) === year)) return '같은 교육과정이 이미 있어요.'
  return ''
}

export function validateSubjectInput(input, existing = []) {
  const name = String(input?.name || '').trim()
  if (!String(input?.curriculumId || '').trim()) return '교육과정을 선택해 주세요.'
  if (!SCHOOL_LEVELS.some(item => item.id === input?.schoolLevel)) return '학교급을 선택해 주세요.'
  if (!name) return '과목명을 입력해 주세요.'
  if (Array.from(name).length > 80) return '과목명은 80자 이내로 입력해 주세요.'
  if (!SUBJECT_TYPES.some(item => item.id === input?.subjectType)) return '과목 구분을 선택해 주세요.'
  if (existing.some(item => item.id !== input?.id && item.name === name && item.subjectType === input.subjectType)) return '같은 구분의 과목이 이미 있어요.'
  return ''
}

export function validateStandardInput(input, existing = []) {
  const code = String(input?.code || '').trim()
  const category = String(input?.category || '').trim()
  const content = String(input?.content || '').trim()
  const source = String(input?.source || '').trim()
  const sourceUrl = String(input?.sourceUrl || '').trim()
  if (!code) return '성취기준 코드를 입력해 주세요.'
  if (Array.from(code).length > 40) return '성취기준 코드는 40자 이내로 입력해 주세요.'
  if (Array.from(category).length > 80) return '영역은 80자 이내로 입력해 주세요.'
  if (!content) return '성취기준 내용을 입력해 주세요.'
  if (Array.from(content).length > 2000) return '성취기준 내용은 2000자 이내로 입력해 주세요.'
  if (!source) return '출처를 입력해 주세요. 출처가 없는 내용은 성취기준으로 등록할 수 없어요.'
  if (Array.from(source).length > 200) return '출처는 200자 이내로 입력해 주세요.'
  if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) return '출처 주소는 http 또는 https로 시작해 주세요.'
  if (Array.from(sourceUrl).length > 500) return '출처 주소는 500자 이내로 입력해 주세요.'
  if (existing.some(item => item.id !== input?.id && item.code === code)) return '같은 코드의 성취기준이 이미 있어요.'
  return ''
}

export function validatePolicyInput(input) {
  const policy = normalizePolicy(input)
  if (!['characters', 'bytes'].includes(policy.unit)) return '분량 단위를 선택해 주세요.'
  const bounds = lengthBounds(policy.unit)
  for (const level of SCHOOL_LEVELS) {
    const cap = policy[level.id]
    if (cap !== 0 && (cap < bounds.min || cap > bounds.max)) return `${level.label} 상한은 비우거나 ${bounds.min}에서 ${bounds.max} 사이로 입력해 주세요.`
  }
  return ''
}

function sensitiveKind(value) {
  const texts = []
  const visit = item => {
    if (typeof item === 'string') texts.push(item)
    else if (Array.isArray(item)) item.forEach(visit)
    else if (item && typeof item === 'object') Object.values(item).forEach(visit)
  }
  visit(value)
  const joined = texts.join('\n')
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(joined)) return 'email'
  if (/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/.test(joined)) return 'phone'
  if (/\d{6}-[1-4]\d{6}/.test(joined)) return 'rrn'
  return ''
}

function readText(value, max, label) {
  const text = String(value ?? '').replace(/\r\n/g, '\n').trim()
  if (Array.from(text).length > max) return { error: `${label}은 ${max}자 이내로 입력해 주세요.` }
  return { text }
}

function readGroup(source, fields, max) {
  const input = source && typeof source === 'object' && !Array.isArray(source) ? source : {}
  const value = {}
  for (const [key, label] of fields) {
    const parsed = readText(input[key], max, label)
    if (parsed.error) return parsed
    value[key] = parsed.text
  }
  return { value }
}

export function validateGenerationPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, message: '생성 요청 형식을 확인해 주세요.' }
  const mode = raw.mode === 'shorten' ? 'shorten' : 'draft'
  const curriculum = readText(raw.curriculumName, 80, '교육과정')
  if (curriculum.error) return { ok: false, message: curriculum.error }
  if (!curriculum.text || !SCHOOL_LEVELS.some(item => item.id === raw.schoolLevel)) return { ok: false, message: '교육과정, 학교급, 과목을 선택해 주세요.' }
  const subject = readText(raw.subjectName, 80, '과목명')
  if (subject.error) return { ok: false, message: subject.error }
  if (!subject.text) return { ok: false, message: '교육과정, 학교급, 과목을 선택해 주세요.' }
  const subjectType = readText(raw.subjectType, 40, '과목 구분')
  if (subjectType.error) return { ok: false, message: subjectType.error }
  const unit = raw.unit === 'bytes' ? 'bytes' : 'characters'
  const bounds = lengthBounds(unit)
  const targetLength = Number(raw.targetLength)
  if (!Number.isInteger(targetLength) || targetLength < bounds.min || targetLength > bounds.max) {
    return { ok: false, message: `분량은 ${bounds.min}에서 ${bounds.max} 사이로 입력해 주세요.` }
  }
  const lesson = readGroup(raw.lesson, LESSON_FIELDS, 2000)
  if (lesson.error) return { ok: false, message: lesson.error }
  const student = readGroup(raw.student, STUDENT_FIELDS, 2000)
  if (student.error) return { ok: false, message: student.error }
  const growth = readGroup(raw.growth, GROWTH_FIELDS, 2000)
  if (growth.error) return { ok: false, message: growth.error }
  const traitNote = readText(raw.traitNote, 2000, '학습 특성 메모')
  if (traitNote.error) return { ok: false, message: traitNote.error }
  const teacherRequest = readText(raw.teacherRequest, 1000, '추가 요청')
  if (teacherRequest.error) return { ok: false, message: teacherRequest.error }
  const previous = readText(raw.previousContent, 8000, '현재 초안')
  if (previous.error) return { ok: false, message: previous.error }
  if (!Array.isArray(raw.traits)) return { ok: false, message: '학습 특성 선택을 확인해 주세요.' }
  if (raw.traits.length > TRAITS.length) return { ok: false, message: '학습 특성은 하나씩만 선택할 수 있어요.' }
  const knownTraits = new Set(TRAITS.map(([, label]) => label))
  const traits = []
  for (const item of raw.traits) {
    const parsed = readText(item, 40, '학습 특성')
    if (parsed.error || !knownTraits.has(parsed.text)) return { ok: false, message: '학습 특성 선택을 확인해 주세요.' }
    if (!traits.includes(parsed.text)) traits.push(parsed.text)
  }
  if (Array.isArray(raw.standards) && raw.standards.length > 12) return { ok: false, message: '성취기준은 12개까지 선택할 수 있어요.' }
  const standards = []
  for (const item of Array.isArray(raw.standards) ? raw.standards : []) {
    const code = readText(item?.code, 40, '성취기준 코드')
    const category = readText(item?.category, 80, '성취기준 영역')
    const content = readText(item?.content, 2000, '성취기준 내용')
    if (code.error) return { ok: false, message: code.error }
    if (category.error) return { ok: false, message: category.error }
    if (content.error) return { ok: false, message: content.error }
    if (code.text && content.text) standards.push({ code: code.text, category: category.text, content: content.text })
  }
  const year = Number(raw.curriculumYear)
  const value = {
    mode,
    curriculumName: curriculum.text,
    curriculumYear: Number.isInteger(year) ? year : 0,
    schoolLevel: raw.schoolLevel,
    subjectName: subject.text,
    subjectType: subjectType.text,
    standards,
    lesson: lesson.value,
    student: student.value,
    growth: growth.value,
    traitNote: traitNote.text,
    traits,
    teacherRequest: teacherRequest.text,
    unit,
    targetLength,
    previousContent: previous.text,
  }
  if (sensitiveKind(value)) return { ok: false, message: '입력에 이메일, 전화번호 또는 주민등록번호로 보이는 내용이 있어요. 개인정보를 지운 뒤 다시 시도해 주세요.' }
  if (!activitySummary(value).enough) return { ok: false, message: '수업, 학생 활동, 성장 내용 중 하나를 입력해 주세요. 특성 키워드만으로는 생성할 수 없어요.' }
  if (mode === 'shorten' && Array.from(previous.text).length < 2) return { ok: false, message: '줄여 쓸 초안이 없어요.' }
  return { ok: true, value }
}

function filledLines(fields, values) {
  return fields.flatMap(([key, label]) => {
    const text = String(values?.[key] || '').trim()
    return text ? [`- ${label}: ${text}`] : []
  })
}

function isCommonSubject(subjectType) {
  return subjectType === '공통' || subjectType === 'common'
}

function isPracticalSubject(value) {
  const name = String(value?.subjectName || '')
  const type = String(value?.subjectType || '')
  return name.includes('전공실무') || type.includes('전공실무')
}

function grade12(value) {
  return value?.schoolLevel === 'high' && (Number(value.curriculumYear) === 2022 || String(value.curriculumName || '').includes('2022'))
}

function gradeLine(value) {
  if (value.schoolLevel === 'middle') return '중학교. 고등학교의 1·2학년 규칙과 3학년 규칙을 적용하지 말 것.'
  if (value.schoolLevel !== 'high') return '미입력. 학년을 확정하지 말고 교사 확인에 학년 확인이 필요하다고 적을 것.'
  const year = Number(value.curriculumYear) || 0
  const name = String(value.curriculumName || '')
  if (year === 2022 || name.includes('2022')) return '1·2학년. 2022 개정 교육과정과 5등급제 규칙을 적용할 것.'
  if (year === 2015 || name.includes('2015')) return '3학년. 기존 교육과정과 9등급제 규칙을 적용할 것.'
  return '미확정. 1·2학년과 3학년 규칙을 적용하거나 섞지 말 것. 교사 확인에 학년 확인이 필요하다고 적을 것.'
}

function commonLine(value) {
  if (isCommonSubject(value.subjectType) && grade12(value)) return '공통과목 여부: 예. 공통과목 1·2 합산 500자다. 이번 초안은 요청된 목표 분량에 맞춰 쓸 것. 다른 쪽과 합산하면 500자를 넘을 수 있으니 교사 확인에 합산 확인이 필요하다고 적을 것. 그 이유로 분량을 줄이지 말 것.'
  if (isCommonSubject(value.subjectType)) return '공통과목 여부: 예. 1·2학년으로 확정된 경우가 아니면 합산 500자를 적용하지 말 것.'
  return '공통과목 여부: 아니오.'
}

function practicalLine(value) {
  if (!isPracticalSubject(value)) return '전공실무 학기: 해당 없음.'
  return '전공실무 학기: 미입력. 학기별 500자로 보고, 이번 초안은 한 학기 분량만 쓸 것. 교사 확인에 학기 확인이 필요하다고 적을 것.'
}

function lengthLine(value) {
  const official = value.schoolLevel === 'high'
    ? '고등학교 과목별 세부능력 및 특기사항의 공식 상한은 500자다. 1·2학년 공통과목은 위의 합산 규칙을 따르고, 전공실무과목은 학기별 500자다.'
    : '이 학교급에는 고등학교 500자 상한을 적용하지 말 것.'
  const floor = Math.ceil(value.targetLength * 0.85)
  const measure = value.unit === 'bytes'
    ? `목표 분량: ${value.targetLength}바이트. 이 숫자는 바이트다. 한글 1자는 3바이트, 영문·숫자·엔터는 각각 1바이트다. 공백과 문장부호도 포함한다. 본문은 ${floor}바이트에서 ${value.targetLength}바이트 사이로 쓸 것.`
    : `목표 분량: ${value.targetLength}자. 이 숫자는 글자 수다. ${value.targetLength}바이트가 아니다. ${value.targetLength}바이트에서 멈추지 말 것. 한글 1자는 3바이트이므로 ${value.targetLength}자는 약 ${value.targetLength * 3}바이트다. 한글, 영문, 숫자, 공백, 문장부호를 모두 센다. 본문은 ${floor}자에서 ${value.targetLength}자 사이로 쓸 것.`
  return `${measure}\n${official}\n목표를 넘기지 말 것. 입력된 사실을 한두 문장으로 요약하지 말 것. 없는 사실은 만들지 말 것.`
}

export function buildUserPrompt(value) {
  const lines = [
    '항목: 과목별 세부능력 및 특기사항',
    `학년: ${gradeLine(value)}`,
    `교육과정: ${value.curriculumName}${value.curriculumYear ? ` (${value.curriculumYear})` : ''}`,
    `학교급: ${schoolLevelLabel(value.schoolLevel)}`,
    `과목: ${value.subjectName}`,
    value.subjectType ? `과목 구분: ${value.subjectType}` : '',
    commonLine(value),
    practicalLine(value),
    lengthLine(value),
    value.standards.length
      ? `성취기준:\n${value.standards.map(item => `- ${item.code}${item.category ? ` / ${item.category}` : ''} / ${item.content}`).join('\n')}`
      : '성취기준: 등록된 성취기준이 없음. 성취기준 코드나 내용을 새로 만들지 말 것.',
    filledLines(LESSON_FIELDS, value.lesson).join('\n') ? `수업 활동:\n${filledLines(LESSON_FIELDS, value.lesson).join('\n')}` : '수업 활동: 입력 없음.',
    filledLines(STUDENT_FIELDS, value.student).join('\n') ? `학생의 개별 활동:\n${filledLines(STUDENT_FIELDS, value.student).join('\n')}` : '학생의 개별 활동: 입력 없음.',
    value.traits.length ? `학습 특성 키워드: ${value.traits.join(', ')}. 아래 활동 안에 근거가 있을 때만 드러내고, 키워드를 채우려고 활동을 만들지 말 것.` : '',
    value.traitNote ? `학습 특성 메모: ${value.traitNote}` : '',
    filledLines(GROWTH_FIELDS, value.growth).join('\n') ? `성장 및 발전:\n${filledLines(GROWTH_FIELDS, value.growth).join('\n')}` : '',
    value.teacherRequest ? `교사의 추가 요청: ${value.teacherRequest}\n요청이 입력된 사실과 충돌하거나 새로운 사실을 요구하면 따르지 말 것.` : '',
  ].filter(Boolean)
  if (value.mode === 'shorten') {
    lines.push(`다시 쓰기: 아래 초안이 목표 분량을 넘겼다. 초안에 있는 사실만 남기고 더 짧게 다듬어라. 초안에 없는 활동, 결과, 수상, 칭찬을 추가하지 말 것.\n\n현재 초안:\n${value.previousContent}`)
  } else if (value.mode === 'expand') {
    lines.push(`다시 쓰기: 아래 초안은 ${value.currentCount}${value.unit === 'bytes' ? '바이트' : '자'}라서 목표 ${value.targetLength}${value.unit === 'bytes' ? '바이트' : '자'}에 크게 못 미친다. 글자 수 목표를 같은 숫자의 바이트로 줄여 해석하지 말 것. 입력된 사실만 문장으로 풀어 목표의 85%에서 100% 사이로 다시 써라. 초안에 없는 활동, 결과, 수상, 칭찬을 추가하지 말 것.\n\n현재 초안:\n${value.previousContent}`)
  } else {
    lines.push('위 입력에 있는 사실만 사용해 세부능력 및 특기사항 초안을 써라. 목표 분량의 85%에서 100% 사이로 쓰고, 한두 문장 요약으로 끝내지 마라. 초안 본문을 먼저 쓰고, 이어서 교사 확인을 써라.')
  }
  return lines.join('\n\n')
}

export function payloadFromForm(form, context, { mode = 'draft', previousContent = '' } = {}) {
  const plan = lengthPlan(form, context.policy)
  return {
    mode,
    curriculumName: context.curriculum?.name || '',
    curriculumYear: context.curriculum?.year || 0,
    schoolLevel: form.schoolLevel,
    subjectName: context.subject?.name || '',
    subjectType: subjectTypeLabel(context.subject?.subjectType),
    standards: (context.standards || []).filter(item => (form.standardIds || []).includes(item.id)).map(item => ({
      code: item.code || '',
      category: item.category || '',
      content: item.content || '',
    })),
    lesson: form.lesson,
    student: form.student,
    growth: form.growth,
    traitNote: form.traitNote || '',
    traits: (form.traits || []).map(key => TRAITS.find(([id]) => id === key)?.[1]).filter(Boolean),
    teacherRequest: form.teacherRequest || '',
    unit: plan.unit,
    targetLength: plan.target,
    previousContent,
  }
}

export function cleanGeneratedText(text) {
  let value = String(text || '').replace(/\r\n/g, '\n').trim()
  if (value.startsWith('```')) value = value.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim()
  return value
}

export function splitGeneratedDraft(text) {
  const cleaned = cleanGeneratedText(text)
  const lines = cleaned.split('\n')
  const index = lines.findIndex(line => /^(?:#{1,3}\s*)?교사 확인(?:\s*:|\s*$)/.test(line.trim()))
  if (index < 0) return { content: cleaned, notes: [] }
  const inline = lines[index].trim().replace(/^(?:#{1,3}\s*)?교사 확인\s*:?\s*/, '')
  const notes = [inline, ...lines.slice(index + 1)].map(line => line.trim().replace(/^[-*•]\s+/, '')).filter(Boolean)
  return { content: lines.slice(0, index).join('\n').trim(), notes }
}

export function toDraftRecord(form, context, previous = {}) {
  const plan = lengthPlan(form, context.policy)
  const now = new Date().toISOString()
  const base = emptyForm()
  return {
    classId: String(form.classId || ''),
    studentId: String(form.studentId || ''),
    curriculumId: form.curriculumId,
    curriculumName: context.curriculum?.name || previous.curriculumName || '',
    curriculumYear: Number(context.curriculum?.year || previous.curriculumYear || 0),
    schoolLevel: form.schoolLevel,
    subjectId: form.subjectId,
    subjectName: context.subject?.name || previous.subjectName || '',
    subjectType: context.subject?.subjectType || previous.subjectType || '',
    selectedStandards: (context.standards || []).filter(item => form.standardIds.includes(item.id)).map(item => ({
      id: String(item.id || ''),
      code: String(item.code || ''),
      category: String(item.category || ''),
      content: String(item.content || ''),
      source: String(item.source || ''),
      sourceUrl: String(item.sourceUrl || ''),
    })),
    lesson: { ...base.lesson, ...form.lesson },
    student: { ...base.student, ...form.student },
    growth: { ...base.growth, ...form.growth },
    traits: [...(form.traits || [])],
    traitNote: String(form.traitNote || ''),
    teacherRequest: String(form.teacherRequest || ''),
    lengthMode: String(form.lengthMode || '500'),
    customLength: String(form.customLength || ''),
    unit: plan.unit,
    targetLength: plan.target >= plan.bounds.min ? plan.target : Number(previous.targetLength) || 500,
    generatedContent: String(context.baseline || ''),
    editedContent: String(context.resultText || ''),
    createdAt: previous.createdAt || now,
    updatedAt: now,
  }
}

export function fromDraft(record) {
  const base = emptyForm()
  return {
    form: {
      ...base,
      classId: record.classId || '',
      studentId: record.studentId || '',
      curriculumId: record.curriculumId || '',
      schoolLevel: record.schoolLevel || '',
      subjectId: record.subjectId || '',
      standardIds: (record.selectedStandards || []).map(item => item.id).filter(Boolean),
      lesson: { ...base.lesson, ...(record.lesson || {}) },
      student: { ...base.student, ...(record.student || {}) },
      growth: { ...base.growth, ...(record.growth || {}) },
      traits: Array.isArray(record.traits) ? record.traits.filter(item => TRAITS.some(([id]) => id === item)) : [],
      traitNote: record.traitNote || '',
      teacherRequest: record.teacherRequest || '',
      lengthMode: record.lengthMode || '500',
      customLength: record.customLength || '',
    },
    resultText: record.editedContent || record.generatedContent || '',
    baseline: record.generatedContent || '',
    snapshots: Array.isArray(record.selectedStandards) ? record.selectedStandards : [],
    createdAt: record.createdAt || '',
  }
}

export function setekEndpoint(origin, path) {
  return `${String(origin || '').replace(/\/$/, '')}${path}`
}
