import { useCallback, useEffect, useRef, useState } from 'react'

interface PollingState<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
  /** Внеочередной запрос; промис завершается, когда ответ записан (или отброшен). */
  refresh: () => Promise<void>
}

interface Snapshot<T> {
  owner: () => Promise<T> // loader, которому принадлежат данные
  data: T | undefined
  error: Error | null
}

/**
 * Периодический опрос API.
 *
 * - Следующий запрос уходит только после завершения предыдущего (setTimeout-цепочка),
 *   поэтому при медленном сервере запросы не копятся.
 * - Каждый запрос получает номер; ответ записывается, только если он самый свежий.
 *   Смена loader и размонтирование делают все запросы «в полёте» устаревшими.
 * - При смене loader (например, выбран другой датчик) старые данные сразу скрываются.
 *
 * loader должен быть стабильным (useCallback), иначе опрос будет перезапускаться на каждом рендере.
 */
export function usePolling<T>(loader: () => Promise<T>, intervalMs: number): PollingState<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ owner: loader, data: undefined, error: null })
  const latestRequest = useRef(0)
  const loaderRef = useRef(loader)

  const run = useCallback(async (load: () => Promise<T>): Promise<void> => {
    const requestId = ++latestRequest.current
    try {
      const data = await load()
      if (requestId === latestRequest.current) setSnapshot({ owner: load, data, error: null })
    } catch (e) {
      if (requestId !== latestRequest.current) return
      const error = e instanceof Error ? e : new Error(String(e))
      // при ошибке оставляем последние данные этого же loader, но показываем ошибку
      setSnapshot((prev) => ({ owner: load, data: prev.owner === load ? prev.data : undefined, error }))
    }
  }, [])

  useEffect(() => {
    loaderRef.current = loader
    const requests = latestRequest
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      await run(loader)
      if (!stopped) timer = setTimeout(tick, intervalMs)
    }
    void tick()

    return () => {
      stopped = true
      clearTimeout(timer)
      requests.current++ // ответы запросов, ушедших до этого момента, больше не нужны
    }
  }, [loader, intervalMs, run])

  const refresh = useCallback(() => run(loaderRef.current), [run])

  const current = snapshot.owner === loader
  return {
    data: current ? snapshot.data : undefined,
    error: current ? snapshot.error : null,
    loading: !current || (snapshot.data === undefined && snapshot.error === null),
    refresh,
  }
}
