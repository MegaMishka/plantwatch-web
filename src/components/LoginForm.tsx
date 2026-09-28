import { useState, type FormEvent } from 'react'

interface Props {
  notice?: string | null
  onLogin: (username: string, password: string) => Promise<void>
  onRegister: (username: string, password: string) => Promise<void>
}

export function LoginForm({ notice = null, onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        await onRegister(username, password)
        setMode('login') // аккаунт создан: при повторной отправке не будет 409
      }
      await onLogin(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card login" onSubmit={handleSubmit}>
      <h1>PlantWatch</h1>
      <p className="muted">Мониторинг технологических параметров</p>
      <label>
        Логин
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </label>
      {(error ?? notice) && (
        <p role="alert" className="error">
          {error ?? notice}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </button>
      <button
        type="button"
        className="link"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
      </button>
    </form>
  )
}
