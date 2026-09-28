import { lazy, Suspense, useCallback, useState } from 'react'
import type { ApiClient } from '../api/client'
import type { Reading } from '../api/types'
import { usePolling } from '../hooks/usePolling'
import { AlarmsTable } from './AlarmsTable'
import { SensorCard } from './SensorCard'

const REFRESH_MS = 3000

// Recharts — самая тяжёлая зависимость; грузим отдельным чанком
const TrendChart = lazy(() => import('./TrendChart').then((m) => ({ default: m.TrendChart })))

interface Props {
  client: ApiClient
  onLogout: () => void
}

export function Dashboard({ client, onLogout }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activeOnly, setActiveOnly] = useState(true)
  const [pendingAcks, setPendingAcks] = useState<ReadonlySet<number>>(new Set())
  const [ackError, setAckError] = useState<string | null>(null)

  // GET /sensors уже содержит последнее значение каждого датчика — один запрос на всех
  const sensors = usePolling(client.sensors, REFRESH_MS)

  // пока пользователь ничего не выбрал — показываем тренд первого датчика
  const effectiveId = selectedId ?? sensors.data?.[0]?.id ?? null
  const selected = sensors.data?.find((s) => s.id === effectiveId)

  const loadTrend = useCallback(async () => {
    if (effectiveId === null) return { readings: [] as Reading[], stats: undefined }
    const [readings, stats] = await Promise.all([
      client.readings(effectiveId),
      client.stats(effectiveId),
    ])
    return { readings, stats }
  }, [client, effectiveId])
  const trend = usePolling(loadTrend, REFRESH_MS)

  const loadAlarms = useCallback(() => client.alarms(activeOnly), [client, activeOnly])
  const alarms = usePolling(loadAlarms, REFRESH_MS)

  async function acknowledge(id: number) {
    if (pendingAcks.has(id)) return
    setAckError(null)
    setPendingAcks((prev) => new Set(prev).add(id))
    try {
      await client.acknowledge(id)
    } catch (e) {
      setAckError(e instanceof Error ? e.message : String(e))
    }
    // кнопку разблокируем только после обновления журнала, иначе повторный клик даст 409
    await alarms.refresh()
    setPendingAcks((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const activeCount = alarms.data?.filter((a) => !a.acknowledged).length ?? 0
  const errors = [
    sensors.error && `датчики: ${sensors.error.message}`,
    trend.error && `тренд: ${trend.error.message}`,
    alarms.error && `аварии: ${alarms.error.message}`,
    ackError && `квитирование: ${ackError}`,
  ].filter(Boolean)

  return (
    <div className="layout">
      <header className="topbar">
        <strong>PlantWatch</strong>
        <span className={activeCount ? 'badge badge--alarm' : 'badge badge--normal'}>
          {activeCount ? `Активных аварий: ${activeCount}` : 'Аварий нет'}
        </span>
        <button type="button" className="link" onClick={onLogout}>
          Выйти
        </button>
      </header>

      {errors.length > 0 && (
        <div role="alert" className="error">
          {errors.map((e) => (
            <p key={e as string}>Ошибка — {e}</p>
          ))}
        </div>
      )}

      <div className="sensors-grid">
        {sensors.data?.map((s) => (
          <SensorCard
            key={s.id}
            sensor={s}
            lastValue={s.last_value ?? undefined}
            selected={s.id === effectiveId}
            onSelect={setSelectedId}
          />
        ))}
        {sensors.data?.length === 0 && (
          <p className="muted">Датчиков нет. Создайте их через API или scripts/simulate.py.</p>
        )}
      </div>

      {selected && (
        <Suspense fallback={<section className="card muted">Загрузка графика…</section>}>
          <TrendChart
            sensor={selected}
            readings={trend.data?.readings ?? []}
            stats={trend.data?.stats}
          />
        </Suspense>
      )}

      <AlarmsTable
        alarms={alarms.data ?? []}
        activeOnly={activeOnly}
        pendingIds={pendingAcks}
        onToggleActive={setActiveOnly}
        onAcknowledge={acknowledge}
      />
    </div>
  )
}
