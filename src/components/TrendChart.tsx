import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Reading, Sensor, SensorStats } from '../api/types'
import { formatTime, formatValue } from '../lib/format'

interface Props {
  sensor: Sensor
  readings: Reading[]
  stats: SensorStats | undefined
}

export function TrendChart({ sensor, readings, stats }: Props) {
  // API отдаёт новые показания первыми — для графика разворачиваем по времени
  const points = [...readings].reverse().map((r) => ({ time: formatTime(r.ts), value: r.value }))

  return (
    <section className="card">
      <header className="section-head">
        <h2>
          Тренд {sensor.tag} <span className="muted">— {sensor.name}</span>
        </h2>
        {stats && (
          <dl className="stats">
            <div><dt>мин</dt><dd>{formatValue(stats.min)}</dd></div>
            <div><dt>сред</dt><dd>{formatValue(stats.avg)}</dd></div>
            <div><dt>макс</dt><dd>{formatValue(stats.max)}</dd></div>
            <div><dt>точек</dt><dd>{stats.count}</dd></div>
            <div><dt>период</dt><dd>всё время</dd></div>
          </dl>
        )}
      </header>
      {points.length === 0 ? (
        <p className="muted">Показаний пока нет. Запустите scripts/simulate.py в бэкенде.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="time" minTickGap={40} tick={{ fontSize: 12 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} width={56} />
            <Tooltip formatter={(v) => [`${formatValue(Number(v))} ${sensor.unit}`, sensor.tag]} />
            {sensor.high_limit !== null && (
              <ReferenceLine y={sensor.high_limit} ifOverflow="extendDomain" stroke="var(--alarm)" strokeDasharray="6 4"
                label={{ value: 'HI', position: 'right', fontSize: 11 }} />
            )}
            {sensor.low_limit !== null && (
              <ReferenceLine y={sensor.low_limit} ifOverflow="extendDomain" stroke="var(--alarm)" strokeDasharray="6 4"
                label={{ value: 'LO', position: 'right', fontSize: 11 }} />
            )}
            <Line type="monotone" dataKey="value" stroke="var(--accent)" dot={false}
              strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
