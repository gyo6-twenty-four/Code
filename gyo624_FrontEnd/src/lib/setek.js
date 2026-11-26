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
