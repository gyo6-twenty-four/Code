import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPasswordRecord, passwordError, verifyPasswordRecord } from './passwords.js'
test('초기 비밀번호의 길이·영문/숫자와 확인 일치를 검사한다', () => {
  assert.ok(passwordError('abc123', 'abc123'))
  assert.ok(passwordError('abcdefgh', 'abcdefgh'))
  assert.ok(passwordError('NewPassword12!', 'Different12!'))
  assert.equal(passwordError('NewPassword12!', 'NewPassword12!'), '')
})
test('비밀번호 원문 없이 계정별 salt로 검증하며 잘못된 비밀번호를 거부한다', async () => {
  const first = await createPasswordRecord('TestPassword12!')
  const second = await createPasswordRecord('TestPassword12!')
  assert.notEqual(first.salt, second.salt)
  assert.notEqual(first.hash, second.hash)
  assert.equal(JSON.stringify(first).includes('TestPassword12!'), false)
  assert.equal(await verifyPasswordRecord('TestPassword12!', first), true)
  assert.equal(await verifyPasswordRecord('wrong', first), false)
  assert.equal(await verifyPasswordRecord('TestPassword12!', null), false)
})
