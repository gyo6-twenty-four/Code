import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CURRICULA,
  SYSTEM_PROMPT,
  STEPS,
  splitGeneratedDraft,
  adjacentStep,
  advanceError,
  inputStepsFor,
  knownSchoolLevel,
  prioritizeTeacherSubjects,
  buildUserPrompt,
  cleanGeneratedText,
  combineStandards,
  countUnits,
  emptyForm,
  filterStandards,
  pageWindow,
  generationError,
  lengthPlan,
  mergeCurricula,
  payloadFromForm,
  textSize,
  validateCurriculumInput,
  validateGenerationPayload,
  validateStandardInput,
  validateSubjectInput,
} from './setek.js'

const activity = { ...emptyForm(), curriculumId: '2022', schoolLevel: 'high', subjectId: 'math', lesson: { ...emptyForm().lesson, lessonActivities: '이차함수 그래프를 그리고 꼭짓점을 찾았다.' } }

test('글자 수와 바이트를 공백과 문장부호까지 센다', () => {
  assert.equal(countUnits('가 나.', 'characters'), 4)
  assert.equal(countUnits('가', 'bytes'), 3)
  assert.equal(countUnits('a ', 'bytes'), 2)
  assert.deepEqual(textSize('가'), { characters: 1, bytes: 3 })
})

test('기본 교육과정에는 성취기준 본문을 넣지 않는다', () => {
  assert.deepEqual(CURRICULA.map(item => item.id), ['2022', '2015'])
  assert.equal(JSON.stringify(CURRICULA).includes('성취기준'), false)
  const merged = mergeCurricula([{ id: '2022', name: '다른 이름', year: 2022 }, { id: 'school', name: '학교 교육과정', year: 2024 }])
  assert.equal(merged.find(item => item.id === '2022').name, '2022 개정 교육과정')
  assert.equal(merged.find(item => item.id === 'school').source, 'custom')
})

test('학생 활동을 적지 않아도 수업 내용만으로 생성 단계로 간다', () => {
  assert.equal(STEPS.some(item => item.id === 'student'), false)
  assert.equal(adjacentStep('lesson', 1), 'growth')
  assert.equal(generationError(activity, { policy: {} }), '')
})

test('학교가 정해져 있으면 학교급 단계를 건너뛰고 담당 과목을 위로 둔다', () => {
  assert.equal(knownSchoolLevel('서울특별시 고등학교'), 'high')
  assert.equal(knownSchoolLevel('방송통신중학교'), 'middle')
  assert.equal(knownSchoolLevel('특수학교'), '')
  const steps = inputStepsFor(true)
  assert.equal(steps.some(item => item.id === 'school'), false)
  assert.equal(adjacentStep('curriculum', 1, steps), 'subject')
  assert.equal(adjacentStep('subject', -1, steps), 'curriculum')
  const ranked = prioritizeTeacherSubjects(
    [{ id: '2022:high:영어', name: '영어' }, { id: '2022:high:수학', name: '수학' }, { id: '2022:high:국어', name: '국어' }],
    ['2022:high:국어', '2022:high:수학'],
  )
  assert.deepEqual(ranked.map(item => item.id), ['2022:high:국어', '2022:high:수학', '2022:high:영어'])
})

test('빈 활동과 키워드만으로는 생성할 수 없다', () => {
  const form = { ...emptyForm(), curriculumId: '2022', schoolLevel: 'high', traits: ['inquiry'] }
  assert.match(generationError(form, { policy: {} }), /키워드만으로는/)
  assert.equal(advanceError('subject', form, { subjectsStatus: 'ready', subjectCount: 0, subjectsMessage: '2022 개정 교육과정을 선택하면 과목 목록을 불러와요.' }), '2022 개정 교육과정을 선택하면 과목 목록을 불러와요.')
})

test('분량 상한을 넘으면 생성을 막는다', () => {
  const form = { ...activity, lengthMode: '700' }
  assert.match(lengthPlan(form, { unit: 'characters', high: 500 }).message, /500자/)
  assert.equal(lengthPlan(form, { unit: 'characters', high: 0 }).message, '')
})

test('생성 요청에서 개인정보와 목록 밖 필드를 뺀다', () => {
  const form = { ...activity, standardIds: ['math'] }
  const context = {
    curriculum: CURRICULA[0],
    subject: { name: '수학', subjectType: 'general' },
    standards: [{ id: 'math', code: '12수학01-01', category: '함수', content: '이차함수를 탐구한다.', source: '교육과정 문서' }],
    policy: {},
  }
  const raw = payloadFromForm(form, context)
  raw.studentName = '김민준'
  raw.lesson = { ...raw.lesson, lessonActivities: '010-1234-5678로 연락했다.' }
  const rejected = validateGenerationPayload(raw)
  assert.equal(rejected.ok, false)
  assert.match(rejected.message, /개인정보/)
  const clean = validateGenerationPayload({ ...raw, lesson: { ...raw.lesson, lessonActivities: '이차함수 그래프를 그렸다.' } })
  assert.equal(clean.ok, true)
  assert.equal(Object.hasOwn(clean.value, 'studentName'), false)
  const prompt = buildUserPrompt(clean.value)
  assert.equal(prompt.includes('김민준'), false)
  assert.match(prompt, /12수학01-01/)
  const withoutStandards = validateGenerationPayload(payloadFromForm(activity, { ...context, standards: [] }))
  assert.match(buildUserPrompt(withoutStandards.value), /성취기준 코드나 내용을 새로 만들지/)
  assert.match(prompt, /1·2학년/)
  assert.match(prompt, /과목별 세부능력 및 특기사항/)
  assert.match(prompt, /공식 상한은 500자/)
  assert.match(prompt, /85%에서 100%/)
  assert.match(prompt, /바이트가 아니다/)
  assert.match(SYSTEM_PROMPT, /수행하지 않은 활동/)
  assert.match(SYSTEM_PROMPT, /교내상은 수상경력에만/)
  assert.match(SYSTEM_PROMPT, /공인어학시험/)
  assert.match(SYSTEM_PROMPT, /개인정보/)
  assert.match(SYSTEM_PROMPT, /도서명\(저자\)/)
  assert.match(SYSTEM_PROMPT, /한글 1자는 3바이트/)
  assert.match(SYSTEM_PROMPT, /대입 미제공/)
  assert.match(SYSTEM_PROMPT, /교사 확인/)
})

test('출처 없는 성취기준은 등록할 수 없다', () => {
  assert.match(validateStandardInput({ code: '코드', content: '내용', source: '' }), /출처/)
  assert.equal(validateStandardInput({ code: '코드', category: '영역', content: '내용', source: '교육부 고시', sourceUrl: 'https://example.com/doc' }, []), '')
  assert.match(validateSubjectInput({ curriculumId: '', schoolLevel: 'high', name: '수학', subjectType: 'general' }), /교육과정/)
  assert.match(validateCurriculumInput({ name: '2022 개정 교육과정', year: 2022 }, CURRICULA), /이미/)
})

test('긴 목록은 5개씩 페이지로 나눈다', () => {
  const items = Array.from({ length: 12 }, (_, index) => index + 1)
  assert.deepEqual(pageWindow(items, 2), { page: 2, pageSize: 5, totalPages: 3, total: 12, items: [6, 7, 8, 9, 10] })
  assert.equal(pageWindow(items, 9).page, 3)
  assert.equal(pageWindow(items, 0).page, 1)
  assert.deepEqual(pageWindow([], 4).items, [])
  assert.equal(pageWindow(items.slice(0, 5), 2).totalPages, 1)
})

test('저장된 성취기준이 목록에서 빠져도 선택 상태를 유지한다', () => {
  const visible = combineStandards([{ id: 'live', code: 'A', content: '살아 있음', source: '문서' }], [{ id: 'old', code: 'B', content: '이전 기준', source: '문서' }], ['old'])
  assert.equal(visible.some(item => item.id === 'old' && item.archived), true)
  assert.deepEqual(filterStandards(visible, '이전').map(item => item.id), ['old'])
})

test('코드 펜스를 제거하고 교사 확인은 본문에서 분리한다', () => {
  assert.equal(cleanGeneratedText('```\n탐구함.\n```'), '탐구함.')
  const split = splitGeneratedDraft('```\n탐구함.\n\n교사 확인\n- 교내상 언급을 뺌\n한글 4자, 12바이트\n```')
  assert.equal(split.content, '탐구함.')
  assert.deepEqual(split.notes, ['교내상 언급을 뺌', '한글 4자, 12바이트'])
  const common = validateGenerationPayload({
    ...payloadFromForm(activity, { curriculum: CURRICULA[0], subject: { name: '공통수학', subjectType: 'common' }, standards: [], policy: {} }),
  })
  assert.match(buildUserPrompt(common.value), /공통과목 1·2 합산 500자/)
  const third = validateGenerationPayload({
    ...payloadFromForm(activity, { curriculum: CURRICULA[1], subject: { name: '수학', subjectType: 'general' }, standards: [], policy: {} }),
  })
  assert.match(buildUserPrompt(third.value), /3학년/)
})

test('목표를 넘긴 초안만 다시 쓰게 한다', () => {
  const shortened = validateGenerationPayload({
    ...payloadFromForm(activity, { curriculum: CURRICULA[0], subject: { name: '수학', subjectType: 'general' }, standards: [], policy: {} }),
    mode: 'shorten',
    previousContent: '이차함수 그래프에서 꼭짓점을 찾음.',
  })
  assert.equal(shortened.ok, true)
  assert.match(buildUserPrompt(shortened.value), /초안에 없는 활동/)
})

test('세특 초안 규칙은 로그인한 본인만 허용한다', () => {
  const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
  const block = rules.slice(rules.indexOf('match /users/{uid}/setekDrafts/{draftId}'))
  assert.match(block, /request\.auth\.uid == uid/)
  assert.match(block, /allow read, delete: if signedIn\(\) && request\.auth\.uid == uid/)
  assert.equal(rules.includes("allow read, write: if true"), false)
})
