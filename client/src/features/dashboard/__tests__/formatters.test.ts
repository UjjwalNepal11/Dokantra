import { describe, test, expect } from 'vitest'
import { formatCurrency, formatInteger, formatDate, formatDateShort } from '../../../lib/formatters'

describe('formatters', () => {
  test('formatCurrency formats NPR with two decimals', () => {
    expect(formatCurrency(45231.89)).toBe('NPR 45,231.89')
    expect(formatCurrency(0)).toBe('NPR 0.00')
    expect(formatCurrency(1000)).toBe('NPR 1,000.00')
    expect(formatCurrency(999999.5)).toBe('NPR 999,999.50')
  })

  test('formatInteger adds thousand separators', () => {
    expect(formatInteger(45231)).toBe('45,231')
    expect(formatInteger(0)).toBe('0')
    expect(formatInteger(1000000)).toBe('1,000,000')
  })

  test('formatDate returns formatted date string', () => {
    const result = formatDate('2024-08-15')
    expect(result).toContain('15')
    expect(result).toContain('Aug')
    expect(result).toContain('2024')
  })

  test('formatDate handles invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  test('formatDateShort returns short formatted date', () => {
    const result = formatDateShort('2024-08-15')
    expect(result).toContain('15')
    expect(result).toContain('Aug')
  })
})
