import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountHome, canAccessAdmin, findAccountByEmail } from './account.js'
const teacher = { id: 'teacher', email: 'teacher@school.kr', role: '교사', status: '활성' }
const admin = { id: 'admin', email: 'admin@school.kr', role: '관리자', status: '관리자' }
test('로그인 이메일로 계정을 찾아 저장된 역할에 맞는 홈을 선택한다', () => {
  assert.equal(accountHome(findAccountByEmail([teacher, admin], ' ADMIN@school.kr ')), '/admin')
  assert.equal(accountHome(findAccountByEmail([teacher, admin], teacher.email)), '/coverage')
})
test('교사·없는 계정·비활성 관리자는 관리자 화면에 접근할 수 없다', () => {
  for (const account of [teacher, null, undefined, { ...admin, status: '비활성' }, { ...teacher, status: '관리자' }]) assert.equal(canAccessAdmin(account), false)
  assert.equal(canAccessAdmin(admin), true)
})
test('미등록·대기·비활성 계정의 로그인 미리보기를 거부한다', () => {
  assert.equal(findAccountByEmail([teacher, admin], 'unknown@school.kr'), null)
  for (const status of ['대기', '비활성']) assert.equal(findAccountByEmail([{ ...admin, status }], admin.email), null)
})
test('이메일 형식이나 이름만으로 관리자 역할을 만들지 않는다', () => {
  assert.equal(accountHome({ ...teacher, name: '관리자', email: admin.email }), '/coverage')
})
test('로그아웃 상태와 잘못된 세션은 기본 교사로 자동 복구하지 않는다', async () => {
  const { readAccountId, isActiveAccount } = await import('./account.js')
  for (const stored of [null, 'null', '', 'bad-json', '42', '{}', '""']) assert.equal(readAccountId(stored), null)
  assert.equal(readAccountId('"teacher"'), 'teacher')
  assert.equal(isActiveAccount(null), false)
  assert.equal(isActiveAccount({ ...teacher, status: '비활성' }), false)
  assert.equal(isActiveAccount(teacher), true)
})
