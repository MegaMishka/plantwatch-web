import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ApiClient } from './api/client'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('App', () => {
  it('возвращает на экран входа, когда токен истёк (401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/login')) return json(200, { access_token: 't', token_type: 'bearer' })
        return json(401, { detail: 'Неверный или просроченный токен' })
      }),
    )
    render(<App client={new ApiClient('/api', null)} />)

    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'ivan' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    // сначала вход удался и открылся дашборд, затем 401 вернул на форму входа
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Сессия истекла'))
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
    expect(screen.queryByText('Журнал аварий')).toBeNull()
  })
})
