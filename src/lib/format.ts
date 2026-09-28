import type { Sensor } from '../api/types'

export type ValueState = 'normal' | 'warning' | 'alarm' | 'unknown'

/**
 * Состояние значения относительно уставок.
 * warning — значение в пределах, но ближе 10% диапазона к одной из границ.
 */
export function valueState(
  value: number | undefined,
  sensor: Pick<Sensor, 'low_limit' | 'high_limit'>,
): ValueState {
  if (value === undefined || Number.isNaN(value)) return 'unknown'
  const { low_limit: low, high_limit: high } = sensor
  if (high !== null && value > high) return 'alarm'
  if (low !== null && value < low) return 'alarm'
  if (low !== null && high !== null) {
    const margin = (high - low) * 0.1
    if (value > high - margin || value < low + margin) return 'warning'
  }
  return 'normal'
}

export function formatValue(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('ru-RU', { maximumFractionDigits: digits })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatLimits(sensor: Pick<Sensor, 'low_limit' | 'high_limit' | 'unit'>): string {
  const low = sensor.low_limit === null ? '−∞' : formatValue(sensor.low_limit)
  const high = sensor.high_limit === null ? '+∞' : formatValue(sensor.high_limit)
  return `${low} … ${high} ${sensor.unit}`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
