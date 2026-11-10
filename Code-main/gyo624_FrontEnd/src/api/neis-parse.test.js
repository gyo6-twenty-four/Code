import assert from 'node:assert/strict'
import test from 'node:test'
import { parseNeis } from './neis-parse.js'

test('나이스 정상 응답에서 학교 행을 읽는다', () => {
  const result = parseNeis({
    schoolInfo: [
      { head: [{ list_total_count: 1 }, { RESULT: { CODE: 'INFO-000', MESSAGE: '정상 처리되었습니다.' } }] },
      { row: [{ SCHUL_NM: '한빛초등학교', SD_SCHUL_CODE: '7010001', ATPT_OFCDC_SC_CODE: 'B10' }] }
    ]
  }, 'schoolInfo')
  assert.equal(result.total, 1)
  assert.equal(result.rows[0].SCHUL_NM, '한빛초등학교')
})

test('자료 없음은 빈 목록이다', () => {
  const result = parseNeis({ RESULT: { CODE: 'INFO-200', MESSAGE: '해당하는 데이터가 없습니다.' } }, 'classInfo')
  assert.deepEqual(result, { rows: [], total: 0 })
})

test('인증키 오류는 나이스 안내를 그대로 보여 준다', () => {
  assert.throws(() => parseNeis({ RESULT: { CODE: 'ERROR-290', MESSAGE: '인증키가 유효하지 않습니다.' } }, 'schoolInfo'), /인증키/)
})
