import type { Alarm, Reading, Sensor, SensorInput, SensorStats, SensorWithLast } from './types'

const TOKEN_KEY = 'plantwatch_token'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** FastAPI отдаёт ошибки как {detail: string} или {detail: [{msg}]} (422). */
function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
  }
  return fallback
}

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): TokenStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null // localStorage может быть запрещён настройками браузера
  }
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly storage: TokenStorage | null
  private token: string | null
  private readonly unauthorizedListeners = new Set<() => void>()

  constructor(baseUrl = '/api', storage: TokenStorage | null = defaultStorage()) {
    this.baseUrl = baseUrl
    this.storage = storage
    this.token = storage?.getItem(TOKEN_KEY) ?? null
  }

  /** Подписка на «сессия истекла» (ответ 401). Возвращает функцию отписки. */
  onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.add(listener)
    return () => this.unauthorizedListeners.delete(listener)
  }

  get isAuthenticated(): boolean {
    return this.token !== null
  }

  setToken(token: string | null): void {
    this.token = token
    try {
      if (token) this.storage?.setItem(TOKEN_KEY, token)
      else this.storage?.removeItem(TOKEN_KEY)
    } catch {
      /* хранилище недоступно — токен живёт только в памяти */
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    const sentToken = this.token
    if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`)
    if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json')

    const resp = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
    // 401 на логине — это просто неверный пароль, а не истёкшая сессия;
    // 401 на запрос со старым токеном (пользователь уже вошёл заново) тоже игнорируем
    if (resp.status === 401 && sentToken !== null && sentToken === this.token) {
      this.setToken(null)
      this.unauthorizedListeners.forEach((listener) => listener())
    }
    if (!resp.ok) {
      const body = await resp.json().catch(() => null)
      throw new ApiError(resp.status, extractMessage(body, `Ошибка ${resp.status}`))
    }
    return (resp.status === 204 ? undefined : await resp.json()) as T
  }

  async login(username: string, password: string): Promise<void> {
    const form = new URLSearchParams({ username, password })
    const data = await this.request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: form,
    })
    this.setToken(data.access_token)
  }

  async register(username: string, password: string): Promise<void> {
    await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  logout(): void {
    this.setToken(null)
  }

  sensors = () => this.request<SensorWithLast[]>('/sensors')

  createSensor = (data: SensorInput) =>
    this.request<Sensor>('/sensors', { method: 'POST', body: JSON.stringify(data) })

  deleteSensor = (id: number) => this.request<void>(`/sensors/${id}`, { method: 'DELETE' })

  readings = (sensorId: number, limit = 120) =>
    this.request<Reading[]>(`/sensors/${sensorId}/readings?limit=${limit}`)

  stats = (sensorId: number) => this.request<SensorStats>(`/sensors/${sensorId}/stats`)

  alarms = (activeOnly: boolean) =>
    this.request<Alarm[]>(`/alarms?limit=50${activeOnly ? '&active=true' : ''}`)

  acknowledge = (alarmId: number) =>
    this.request<Alarm>(`/alarms/${alarmId}/ack`, { method: 'POST' })
}

export const api = new ApiClient()
