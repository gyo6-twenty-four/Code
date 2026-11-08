// 교과세특 작성 규칙과 입력 검증.
// 성취기준 본문은 여기에 두지 않는다. 출처가 확인된 자료만 관리자가 등록한다.

export const CURRICULA = [
  { id: '2022', name: '2022 개정 교육과정', year: 2022 },
  { id: '2015', name: '2015 개정 교육과정', year: 2015 },
]

export const SCHOOL_LEVELS = [
  { id: 'elementary', label: '초등학교' },
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
  { id: 'student', label: '학생 활동' },
  { id: 'growth', label: '성장과 분량' },
  { id: 'result', label: '결과' },
]

export const SYSTEM_PROMPT = `너는 대한민국 학교생활기록부의 교과학습발달상황 중 세부능력 및 특기사항 초안을 쓰는 보조자다. 교사가 검토하고 고칠 초안만 작성한다.

작성 규칙:
1. 세부능력 및 특기사항에 맞는 관찰형 문체를 사용한다. 문장은 "~함", "~보여줌", "~제시함"처럼 교사의 기록체로 맺되, 같은 어미를 기계적으로 반복하지 않는다.
2. 교사가 입력한 관찰만 바탕으로 객관적이고 구체적으로 쓴다.
3. 학생의 활동과 행동을 중심으로 서술한다. 학생 이름은 쓰지 않는다.
4. 역량 이름을 나열하지 말고, 실제 활동과 그 과정에서 드러난 역량을 연결한다. 활동이 없는데 역량을 단정하지 않는다.
5. 제공된 성취기준이 있으면 학생의 활동과 자연스럽게 연결한다. 성취기준 코드를 새로 만들거나, 목록에 없는 기준을 있는 것처럼 쓰지 않는다.
6. 학생이 실제로 수행하지 않은 활동을 지어내지 않는다.
7. 입력에 없는 수상 실적, 성적, 석차, 자격증, 프로젝트, 발표, 탐구 결과, 수치를 만들지 않는다.
8. 근거가 부족한 성격 평가나 과장된 칭찬을 쓰지 않는다.
9. 추상적이거나 반복되는 표현을 피한다.
10. 입력된 활동의 차이가 드러나게 쓴다. 다른 학생에게 그대로 써도 되는 일반론으로 채우지 않는다.
11. 교과와 관련 없는 개인정보, 가정환경, 건강, 연락처는 넣지 않는다.
12. 제목, 번호, 글머리표, 마크다운 없이 본문만 쓴다. 입력이 짧으면 목표 분량을 채우려고 지어내지 말고 더 짧게 쓴다.

문체 참고. 아래 문장을 그대로 반복하지 말고 활동에 맞게 변주한다.
- ~에 대해 탐구함.
- ~의 원리를 이해하고 실제 문제에 적용함.
- ~하는 과정에서 논리적인 사고력을 보여줌.
- ~에 적극적으로 참여하며 협업 능력을 발휘함.
- ~의 문제점을 분석하고 개선 방안을 제시함.`

const blank = fields => Object.fromEntries(fields.map(([key]) => [key, '']))

export function emptyForm() {
  return {
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

export function adjacentStep(id, direction) {
  const index = STEPS.findIndex(step => step.id === id)
  return STEPS[Math.min(STEPS.length - 1, Math.max(0, index + direction))]?.id || id
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

export function advanceError(step, form, meta = {}) {
  if (step === 'curriculum' && !form.curriculumId) return '교육과정을 선택해 주세요.'
  if (step === 'school' && !form.schoolLevel) return '학교급을 선택해 주세요.'
  if (step === 'subject') {
    if (meta.subjectsStatus === 'loading') return '과목 목록을 불러오는 중이에요.'
    if (meta.subjectsStatus === 'error') return meta.subjectsMessage || '과목 목록을 불러오지 못했어요.'
    if (!meta.subjectCount) return '등록된 과목이 없어요. 관리자가 과목을 등록하면 선택할 수 있어요.'
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

export function buildUserPrompt(value) {
  const lines = [
    `교육과정: ${value.curriculumName}${value.curriculumYear ? ` (${value.curriculumYear})` : ''}`,
    `학교급: ${schoolLevelLabel(value.schoolLevel)}`,
    `과목: ${value.subjectName}`,
    value.subjectType ? `과목 구분: ${value.subjectType}` : '',
    value.unit === 'bytes'
      ? `목표 분량: ${value.targetLength}바이트(UTF-8). 한글, 영문, 숫자, 공백, 문장부호를 포함한다. 학교생활기록부 입력란의 계산 방식과 다를 수 있다. 사실을 지어내 분량을 채우지 말 것.`
      : `목표 분량: ${value.targetLength}자. 한글, 영문, 숫자, 공백, 문장부호를 모두 센다. 학교생활기록부 입력란의 단위와 다를 수 있다. 사실을 지어내 분량을 채우지 말 것.`,
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
  } else {
    lines.push('위 입력에 있는 사실만 사용해 세부능력 및 특기사항 초안을 써라.')
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

export function toDraftRecord(form, context, previous = {}) {
  const plan = lengthPlan(form, context.policy)
  const now = new Date().toISOString()
  const base = emptyForm()
  return {
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
