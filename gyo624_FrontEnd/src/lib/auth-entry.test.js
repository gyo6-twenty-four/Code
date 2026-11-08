import assert from 'node:assert/strict'
import test from 'node:test'
import { passwordResetPath } from './auth-link.js'
import { normalizeSchool, schoolFromNeis, schoolSearchParams, toNeisSchool } from './school.js'

test('학교 코드는 나이스 코드로, 이름은 학교명으로 찾는다', () => {
  assert.deepEqual(schoolSearchParams(' 7010084 '), { SD_SCHUL_CODE: '7010084' })
  assert.deepEqual(schoolSearchParams('b1000012'), { SD_SCHUL_CODE: 'B1000012' })
  assert.deepEqual(schoolSearchParams('서울중학교'), { SCHUL_NM: '서울중학교' })
  assert.equal(schoolSearchParams('서'), null)
  assert.equal(schoolSearchParams(''), null)
})

test('나이스 학교 행을 학교 코드가 있는 기록으로 맞춘다', () => {
  const school = schoolFromNeis({
    SCHUL_NM: '한빛초등학교',
    SD_SCHUL_CODE: '7010001',
    ATPT_OFCDC_SC_CODE: 'B10',
    ATPT_OFCDC_SC_NM: '서울특별시교육청',
    SCHUL_KND_SC_NM: '초등학교',
    ORG_RDNMA: '서울특별시 중구 세종대로 1',
  })
  assert.equal(school.schoolCode, '7010001')
  assert.equal(school.name, '한빛초등학교')
  assert.equal(toNeisSchool(school).schoolName, '한빛초등학교')
  assert.equal(schoolFromNeis({ SCHUL_NM: '이름만' }), null)
  assert.equal(normalizeSchool({ schoolName: ' 가나다학교 ' }).name, '가나다학교')
})

test('재설정 메일의 코드만 비밀번호 찾기 주소로 옮긴다', () => {
  assert.equal(passwordResetPath('?mode=resetPassword&oobCode=abc%2Bdef'), '/reset-password?oobCode=abc%2Bdef')
  assert.equal(passwordResetPath('?mode=verifyEmail&oobCode=abc'), '')
  assert.equal(passwordResetPath(''), '')
})
