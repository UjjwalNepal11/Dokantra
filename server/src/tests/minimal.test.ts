import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('Minimal test', () => {
  test('1 + 1 = 2', () => {
    assert.strictEqual(1 + 1, 2)
  })
})
