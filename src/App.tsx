import { useEffect, useState } from 'react'
import { api as defaultClient, type ApiClient } from './api/client'
import { Dashboard } from './components/Dashboard'
import { LoginForm } from './components/LoginForm'

interface Props {
  client?: ApiClient
}

export default function App({ client = defaultClient }: Props) {
  const [authed, setAuthed] = useState(client.isAuthenticated)
  const [notice, setNotice] = useState<string | null>(null)

  // Истёкший токен (401 на любом запросе) возвращает на экран входа
  useEffect(
    () =>
      client.onUnauthorized(() => {
        setAuthed(false)
        setNotice('Сессия истекла, войдите снова')
      }),
    [client],
  )

  if (!authed) {
    return (
      <main className="center">
        <LoginForm
          notice={notice}
          onLogin={async (u, p) => {
            await client.login(u, p)
            setNotice(null)
            setAuthed(true)
          }}
          onRegister={(u, p) => client.register(u, p)}
        />
      </main>
    )
  }

  return (
    <Dashboard
      client={client}
      onLogout={() => {
        client.logout()
        setAuthed(false)
      }}
    />
  )
}
