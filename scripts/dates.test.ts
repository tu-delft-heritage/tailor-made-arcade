import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dateRange, formatDate } from '../src/lib/game/dates.ts'

test('exact centuries and decades get readable Dutch and English labels', () => {
  for (const separator of ['-', '/', '–', '—', ' - ']) {
    assert.deepEqual(dateRange(`1800${separator}1899`), [1800, 1899])
    assert.equal(formatDate(`1800${separator}1899`, 'en'), '19th century')
    assert.equal(formatDate(`1800${separator}1899`, 'nl'), '19e eeuw')
  }
  assert.equal(formatDate('1940-1949', 'en'), '1940s')
  assert.equal(formatDate('1940/1949', 'nl'), 'jaren 1940')
  assert.equal(formatDate('1900/1999', 'en'), '20th century')
  assert.equal(formatDate('2000/2099', 'en'), '21st century')
  assert.equal(formatDate('1000/1099', 'en'), '11th century')
})

test('partial periods, exact years, uncertainty and unsupported source dates retain their precision', () => {
  assert.equal(formatDate('1872/1878', 'en'), '1872–1878')
  assert.equal(formatDate('1940/1950', 'en'), '1940–1950')
  assert.equal(formatDate('1917', 'nl'), '1917')
  assert.equal(formatDate('1917/1917', 'en'), '1917')
  for (const value of ['ca. 1940', '1940?', 'before 1800', '1940-01-01', 'unknown', '1900/1800', '0000']) {
    assert.equal(dateRange(value), null)
    assert.equal(formatDate(value, 'en'), value)
  }
})
