import { test } from 'node:test'
import assert from 'node:assert/strict'
import { observationDateError } from './observations.js'
test('관찰은 오늘과 과거만 허용하고 미래·잘못된 날짜를 거부한다', () => {
  assert.equal(observationDateError('2026-10-22', '2026-10-22'), '')
  assert.equal(observationDateError('2024-02-29', '2026-10-22'), '')
  for (const date of ['2026-10-23', '2027-01-01', '2026-02-30', 'invalid', '']) assert.ok(observationDateError(date, '2026-10-22'))
})
test('월·연도 경계에서도 미래를 거부한다', () => {
  assert.ok(observationDateError('2027-01-01', '2026-12-31'))
  assert.equal(observationDateError('2026-12-31', '2027-01-01'), '')
})
