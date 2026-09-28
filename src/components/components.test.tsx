import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Alarm } from '../api/types'
import { AlarmsTable } from './AlarmsTable'
import { LoginForm } from './LoginForm'
import { SensorCard } from './SensorCard'

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

describe('AlarmsTable', () => {
  it('квитирует аварию по кнопке', () => {
    const onAck = vi.fn()
    render(
      <AlarmsTable alarms={[alarm]} activeOnly onToggleActive={() => {}} onAcknowledge={onAck} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Квитировать аварию PT-101' }))
    expect(onAck).toHaveBeenCalledWith(7)
  })

  it('показывает, кто квитировал', () => {
    render(
      <AlarmsTable
        alarms={[{ ...alarm, acknowledged: true, acknowledged_by: 'operator' }]}
        activeOnly={false}
        onToggleActive={() => {}}
        onAcknowledge={() => {}}
      />,
    )
    expect(screen.getByText('квитировал operator')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Квитировать/ })).toBeNull()
  })
})

describe('SensorCard', () => {
  const sensor = { id: 1, tag: 'TT-201', name: 'Температура', unit: '°C', low_limit: 40, high_limit: 85 }

  it('подсвечивает аварийное значение', () => {
    render(<SensorCard sensor={sensor} lastValue={90} selected={false} onSelect={() => {}} />)
    expect(screen.getByText('АВАРИЯ')).toBeInTheDocument()
  })

  it('выбирается кликом', () => {
    const onSelect = vi.fn()
    render(<SensorCard sensor={sensor} lastValue={60} selected={false} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })
})

describe('LoginForm', () => {
  it('показывает ошибку сервера', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('Неверный логин или пароль'))
    render(<LoginForm onLogin={onLogin} onRegister={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'ivan' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Неверный логин или пароль'),
    )
    expect(onLogin).toHaveBeenCalledWith('ivan', 'secret1')
  })

  it('в режиме регистрации сначала регистрирует, потом логинит', async () => {
    const calls: string[] = []
    const onRegister = vi.fn(async () => void calls.push('register'))
    const onLogin = vi.fn(async () => void calls.push('login'))
    render(<LoginForm onLogin={onLogin} onRegister={onRegister} />)
    fireEvent.click(screen.getByRole('button', { name: /Регистрация/ }))
    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'ivan' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
    await waitFor(() => expect(calls).toEqual(['register', 'login']))
  })
})
