import type { Alarm } from '../api/types'
import { formatDateTime, formatValue } from '../lib/format'

interface Props {
  alarms: Alarm[]
  activeOnly: boolean
  pendingIds?: ReadonlySet<number>
  onToggleActive: (value: boolean) => void
  onAcknowledge: (id: number) => void
}

export function AlarmsTable({
  alarms,
  activeOnly,
  pendingIds = new Set(),
  onToggleActive,
  onAcknowledge,
}: Props) {
  return (
    <section className="card">
      <header className="section-head">
        <h2>Журнал аварий</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => onToggleActive(e.target.checked)}
          />
          только неквитированные
        </label>
      </header>
      {alarms.length === 0 ? (
        <p className="muted">Аварий нет</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Время</th>
                <th>Тег</th>
                <th>Тип</th>
                <th>Значение</th>
                <th>Уставка</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {alarms.map((a) => (
                <tr key={a.id} className={a.acknowledged ? '' : 'row--active'}>
                  <td>{formatDateTime(a.ts)}</td>
                  <td>{a.sensor_tag}</td>
                  <td>
                    <span className="badge badge--alarm">{a.level === 'HIGH' ? 'выше HI' : 'ниже LO'}</span>
                  </td>
                  <td>{formatValue(a.value)}</td>
                  <td>{formatValue(a.limit)}</td>
                  <td>
                    {a.acknowledged ? (
                      <span className="muted">квитировал {a.acknowledged_by}</span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Квитировать аварию ${a.sensor_tag}`}
                        disabled={pendingIds.has(a.id)}
                        onClick={() => onAcknowledge(a.id)}
                      >
                        Квитировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
