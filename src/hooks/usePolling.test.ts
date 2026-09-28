import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePolling } from './usePolling'

/** Промис, который тест разрешает вручную — чтобы управлять порядком ответов. */
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('usePolling', () => {
  it('не запускает новый запрос, пока не завершился предыдущий', async () => {
    const pending = deferred<number>()
    const loader = vi.fn(() => pending.promise)
    renderHook(() => usePolling(loader, 1000))

    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(loader).toHaveBeenCalledTimes(1) // медленный сервер — запросы не копятся

    await act(async () => pending.resolve(1))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('сбрасывает данные при смене loader и игнорирует ответ старого', async () => {
    const oldReq = deferred<string>()
    const loaderA = vi.fn(() => Promise.resolve('A'))
    const { result, rerender } = renderHook(({ loader }) => usePolling(loader, 1000), {
      initialProps: { loader: loaderA as () => Promise<string> },
    })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(result.current.data).toBe('A')

    // переключились на другой датчик — старые данные показывать нельзя
    const loaderB = vi.fn(() => oldReq.promise)
    rerender({ loader: loaderB })
    expect(result.current.data).toBeUndefined()

    const loaderC = vi.fn(() => Promise.resolve('C'))
    rerender({ loader: loaderC })
    await act(() => vi.advanceTimersByTimeAsync(0))
    await act(async () => oldReq.resolve('B-устаревший'))
    expect(result.current.data).toBe('C')
  })

  it('refresh после смены loader не записывает ответ старого запроса', async () => {
    const slow = deferred<string>()
    let first = true
    const loaderA = vi.fn(() => (first ? ((first = false), Promise.resolve('A')) : slow.promise))
    const { result, rerender } = renderHook(({ loader }) => usePolling(loader, 60_000), {
      initialProps: { loader: loaderA as () => Promise<string> },
    })
    await act(() => vi.advanceTimersByTimeAsync(0))
    act(() => {
      void result.current.refresh() // ушёл медленный запрос A
    })
    rerender({ loader: () => Promise.resolve('B') })
    await act(() => vi.advanceTimersByTimeAsync(0))
    await act(async () => slow.resolve('A-устаревший'))
    expect(result.current.data).toBe('B')
  })

  it('хранит ошибку и сбрасывает её после успешного ответа', async () => {
    let fail = true
    const loader = vi.fn(() => (fail ? Promise.reject(new Error('сеть')) : Promise.resolve(1)))
    const { result } = renderHook(() => usePolling(loader, 1000))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(result.current.error?.message).toBe('сеть')
    fail = false
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe(1)
  })

  it('останавливает опрос после размонтирования', async () => {
    const loader = vi.fn(() => Promise.resolve(1))
    const { unmount } = renderHook(() => usePolling(loader, 1000))
    await act(() => vi.advanceTimersByTimeAsync(0))
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
