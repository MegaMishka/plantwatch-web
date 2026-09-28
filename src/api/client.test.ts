import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient, ApiError } from './client'

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('ApiClient', () => {
  it('после логина подставляет Bearer-токен', async () => {
    const client = new ApiClient('/api', null)
    mockFetch(200, { access_token: 'abc', token_type: 'bearer' })
    await client.login('u', 'p')
    expect(client.isAuthenticated).toBe(true)

    const fetchMock = mockFetch(200, [])
    await client.sensors()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/sensors')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer abc')
  })

  it('превращает ответ FastAPI с detail в ApiError', async () => {
    const client = new ApiClient('/api', null)
    mockFetch(409, { detail: 'Датчик PT-101 уже существует' })
    await expect(
      client.createSensor({ tag: 'PT-101', name: 'x', unit: 'МПа', low_limit: null, high_limit: null }),
    ).rejects.toMatchObject({ status: 409, message: 'Датчик PT-101 уже существует' })
  })

  it('берёт первое сообщение из ошибки валидации 422', async () => {
    const client = new ApiClient('/api', null)
    mockFetch(422, { detail: [{ msg: 'field required' }] })
    await expect(client.sensors()).rejects.toThrow('field required')
  })

  it('сбрасывает токен при 401', async () => {
    const client = new ApiClient('/api', null)
    client.setToken('expired')
    mockFetch(401, { detail: 'Неверный или просроченный токен' })
    await expect(client.alarms(true)).rejects.toBeInstanceOf(ApiError)
    expect(client.isAuthenticated).toBe(false)
  })

  it('запоздавший 401 со старым токеном не разлогинивает после повторного входа', async () => {
    const client = new ApiClient('/api', null)
    client.setToken('old')
    const onUnauthorized = vi.fn()
    client.onUnauthorized(onUnauthorized)
    let respond!: (r: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((res) => (respond = res))))
    const pending = client.alarms(true) // ушёл со старым токеном
    client.setToken('new') // пользователь вошёл заново
    respond(new Response(JSON.stringify({ detail: 'expired' }), { status: 401 }))
    await expect(pending).rejects.toBeInstanceOf(ApiError)
    expect(client.isAuthenticated).toBe(true)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('корректно обрабатывает 204 No Content', async () => {
    const client = new ApiClient('/api', null)
    mockFetch(204, undefined)
    await expect(client.deleteSensor(1)).resolves.toBeUndefined()
  })
})
