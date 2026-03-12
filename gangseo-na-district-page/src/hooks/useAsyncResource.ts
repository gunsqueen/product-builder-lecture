import { useEffect, useState } from 'react';
import type { ResourceState } from '../types';

export function useAsyncResource<T>(loader: () => Promise<T>, initialData: T, deps: readonly unknown[]): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({
    data: initialData,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      try {
        const data = await loader();
        if (!active) return;
        setState({ data, loading: false, error: null });
      } catch (error) {
        if (!active) return;
        setState({
          data: initialData,
          loading: false,
          error: error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.',
        });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, deps);

  return state;
}
