import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, type ApiClient } from '../api/client'
import type { Alarm, SensorWithLast } from '../api/types'
import { Dashboard } from './Dashboard'

const sensor: SensorWithLast = {
  id: 1,
  tag: 'PT-101',
  name: 'Давление',
  unit: 'МПа',
  low_limit: 0.8,
  high_limit: 2.4,
  alarm_state: 'HIGH',
  last_value: 2.9,
  last_ts: '2026-09-01T10:00:00Z',
}

const alarm: Alarm = {
  id: 7,
  sensor_id: 1,
  sensor_tag: 'PT-101',
  level: 'HIGH',
  value: 2.9,
  limit: 2.4,
  ts: '2026-09-01T10:00:00Z',
  acknowledged: false,
  acknowledged_by: null,
  acknowledged_at: null,
}

function fakeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    sensors: vi.fn().mockResolvedValue([sensor]),
    readings: vi.fn().mockResolvedValue([]),
    stats: vi.fn().mockResolvedValue({ count: 0, min: null, max: null, avg: null }),
    alarms: vi.fn().mockResolvedValue([alarm]),
    acknowledge: vi.fn().mockResolvedValue({ ...alarm, acknowledged: true }),
    ...overrides,
  } as unknown as ApiClient
}

describe('Dashboard', () => {
  it('берёт текущее значение из списка датчиков, без запроса на каждый датчик', async () => {
    const client = fakeClient()
    render(<Dashboard client={client} onLogout={() => {}} />)
    expect(await screen.findByText('АВАРИЯ')).toBeInTheDocument()
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('2,9')
    // readings вызывается только для тренда выбранного датчика
    await waitFor(() => expect(client.readings).toHaveBeenCalledTimes(1))
  })

  it('показывает ошибку квитирования и блокирует кнопку на время запроса', async () => {
    let rejectAck!: (e: unknown) => void
    const client = fakeClient({
      acknowledge: vi.fn(() => new Promise((_, rej) => (rejectAck = rej))) as never,
    })
    render(<Dashboard client={client} onLogout={() => {}} />)
    const button = await screen.findByRole('button', { name: 'Квитировать аварию PT-101' })

    fireEvent.click(button)
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(client.acknowledge).toHaveBeenCalledTimes(1) // двойной клик не шлёт второй запрос

    rejectAck(new ApiError(409, 'Авария уже квитирована'))
    expect(await screen.findByText(/Авария уже квитирована/)).toBeInTheDocument()
  })

  it('кнопка остаётся заблокированной, пока журнал не обновился после квитирования', async () => {
    let finishRefresh!: (v: Alarm[]) => void
    let calls = 0
    const client = fakeClient({
      // первый запрос журнала — сразу, второй (обновление после квитирования) — ждёт
      alarms: vi.fn(() =>
        ++calls === 1 ? Promise.resolve([alarm]) : new Promise<Alarm[]>((r) => (finishRefresh = r)),
      ) as never,
    })
    render(<Dashboard client={client} onLogout={() => {}} />)
    const button = await screen.findByRole('button', { name: 'Квитировать аварию PT-101' })
    fireEvent.click(button)
    await waitFor(() => expect(client.acknowledge).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(button).toBeDisabled() // квитирование прошло, но журнал ещё старый
    finishRefresh([])
    await waitFor(() => expect(screen.queryByRole('button', { name: /Квитировать/ })).toBeNull())
  })

  it('показывает ошибку загрузки тренда', async () => {
    const client = fakeClient({ readings: vi.fn().mockRejectedValue(new Error('timeout')) })
    render(<Dashboard client={client} onLogout={() => {}} />)
    expect(await screen.findByText(/timeout/)).toBeInTheDocument()
  })
})
