import { useEffect, useState } from 'react'
import type { DependencyList } from 'react'
import type { AsyncDataState } from '@/types/async'

export const useAsyncData = <T,>(
  loader: () => Promise<T>,
  deps: DependencyList,
) => {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    queueMicrotask(() => {
      if (!isMounted) {
        return
      }

      setState((current) => ({
        data: current.data,
        loading: true,
        error: null,
      }))
    })

    loader()
      .then((data) => {
        if (!isMounted) {
          return
        }

        setState({
          data,
          loading: false,
          error: null,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        })
      })

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
