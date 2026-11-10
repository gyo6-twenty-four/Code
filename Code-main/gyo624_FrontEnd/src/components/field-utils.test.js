import test from 'node:test'
import assert from 'node:assert/strict'
import { dateAllowed, monthDays, parseDate, placePanel, shiftDate } from './field-utils.js'

test('calendar validates leap years and rejects rolled-over or malformed dates', () => {
  assert.ok(parseDate('2024-02-29'))
  for (const value of ['2025-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-1-1', '']) assert.equal(parseDate(value), null)
})
test('calendar shows six complete weeks with adjacent-month days', () => {
  const days = monthDays(2024, 1)
  assert.equal(days.length, 42)
  assert.equal(parseDate(days[0]).getUTCDay(), 0)
  assert.ok(days.includes('2024-02-29'))
  assert.equal(shiftDate(days[0], 41), days[41])
})
test('keyboard date movement crosses month and year boundaries', () => {
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDate('2024-03-01', -1), '2024-02-29')
  assert.equal(shiftDate('2026-01-01', -7), '2025-12-25')
})
test('date bounds include endpoints and reject values outside the range', () => {
  assert.ok(dateAllowed('2026-10-01', '2026-10-01', '2026-10-31'))
  assert.ok(dateAllowed('2026-10-31', '2026-10-01', '2026-10-31'))
  assert.equal(dateAllowed('2026-11-01', '2026-10-01', '2026-10-31'), false)
})
test('popovers flip above low controls and remain within narrow viewports', () => {
  const position = placePanel({ left: 280, top: 580, bottom: 628 }, 296, 350, 320, 640)
  assert.ok(position.left >= 12 && position.left + 296 <= 308)
  assert.ok(position.top >= 12 && position.top + 350 < 580)
  const below = placePanel({ left: 24, top: 100, bottom: 148 }, 296, 350, 390, 844)
  assert.ok(below.top > 148 && below.top + 350 <= 832)
})
