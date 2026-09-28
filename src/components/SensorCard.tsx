import type { Sensor } from '../api/types'
import { formatLimits, formatValue, valueState } from '../lib/format'

interface Props {
  sensor: Sensor
  lastValue: number | undefined
  selected: boolean
  onSelect: (id: number) => void
}

const STATE_LABEL = {
  normal: 'норма',
  warning: 'близко к уставке',
  alarm: 'АВАРИЯ',
  unknown: 'нет данных',
} as const

export function SensorCard({ sensor, lastValue, selected, onSelect }: Props) {
  const state = valueState(lastValue, sensor)
  return (
    <button
      type="button"
      className={`card sensor sensor--${state}${selected ? ' sensor--selected' : ''}`}
      onClick={() => onSelect(sensor.id)}
      aria-pressed={selected}
    >
      <span className="sensor__tag">{sensor.tag}</span>
      <span className="sensor__name">{sensor.name}</span>
      <span className="sensor__value">
        {formatValue(lastValue)} <span className="muted">{sensor.unit}</span>
      </span>
      <span className="sensor__meta">
        <span className={`badge badge--${state}`}>{STATE_LABEL[state]}</span>
        <span className="muted">{formatLimits(sensor)}</span>
      </span>
    </button>
  )
}
