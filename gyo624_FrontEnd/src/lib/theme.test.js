import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTheme } from './theme.js'

test('theme values other than dark stay light', () => {
  assert.equal(normalizeTheme('dark'), 'dark')
  assert.equal(normalizeTheme('light'), 'light')
  assert.equal(normalizeTheme(''), 'light')
  assert.equal(normalizeTheme(null), 'light')
  assert.equal(normalizeTheme('DARK'), 'light')
})
