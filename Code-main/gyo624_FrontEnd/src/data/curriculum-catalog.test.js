import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { coursesFrom, standardsFrom } from './curriculum-catalog.js'

const catalog = JSON.parse(readFileSync(new URL('./curriculum-2022.json', import.meta.url), 'utf8'))

test('2022 개정 고등학교 과목과 성취기준을 교육과정 자료에서 고른다', () => {
  const courses = coursesFrom(catalog, 'high')
  const math = courses.find(item => item.name === '공통수학1')
  assert.ok(math)
  assert.equal(math.group, '수학')
  const standards = standardsFrom(catalog, math.id)
  assert.ok(standards.some(item => item.code === '10공수1-01-01' && item.content.includes('다항식') && item.source.includes('2022-33')))
  assert.equal(coursesFrom(catalog, 'middle').some(item => item.schoolLevel !== 'middle'), false)
})
