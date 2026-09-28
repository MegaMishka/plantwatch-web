import { describe, expect, it } from 'vitest'
import { formatLimits, formatValue, valueState } from './format'

const sensor = { low_limit: 0, high_limit: 100 }

describe('valueState', () => {
  it('норма в середине диапазона', () => {
    expect(valueState(50, sensor)).toBe('normal')
  })

  it('предупреждение у границ (10% диапазона)', () => {
    expect(valueState(95, sensor)).toBe('warning')
    expect(valueState(5, sensor)).toBe('warning')
  })

  it('авария за уставками', () => {
    expect(valueState(100.1, sensor)).toBe('alarm')
    expect(valueState(-1, sensor)).toBe('alarm')
  })

  it('граница уставки ещё не авария', () => {
    expect(valueState(100, sensor)).toBe('warning')
  })

  it('работает с односторонней уставкой', () => {
    const onlyHigh = { low_limit: null, high_limit: 10 }
    expect(valueState(-1000, onlyHigh)).toBe('normal')
    expect(valueState(11, onlyHigh)).toBe('alarm')
  })

  it('нет данных', () => {
    expect(valueState(undefined, sensor)).toBe('unknown')
  })
})

describe('форматирование', () => {
  it('formatValue', () => {
    expect(formatValue(null)).toBe('—')
    expect(formatValue(1.23456)).toBe('1,23')
  })

  it('formatLimits с открытой границей', () => {
    expect(formatLimits({ low_limit: null, high_limit: 5, unit: 'МПа' })).toBe('−∞ … 5 МПа')
  })
})
