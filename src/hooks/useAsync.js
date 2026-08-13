import { useCallback, useEffect, useRef, useState } from 'react';

// 데이터 조회용. React Query 를 도입하면 이 훅을 useQuery 로 대체하면 된다.
export function useQuery(fetcher, deps = [], { enabled = true, keepPreviousData = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const reqId = useRef(0);
  const cb = useCallback(fetcher, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async () => {
    const id = (reqId.current += 1);
    setState((s) => ({
      data: keepPreviousData ? s.data : null,
      error: null,
      loading: true
    }));
    try {
      const data = await cb();
      if (reqId.current === id) setState({ data, error: null, loading: false });
    } catch (error) {
      if (reqId.current === id) setState({ data: null, error, loading: false });
    }
  }, [cb, keepPreviousData]);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    run();
  }, [run, enabled]);

  return {
    ...state,
    refetch: run,
    setData: (updater) =>
      setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  };
}

// 생성/수정/삭제용.
export function useMutation(mutator) {
  const [state, setState] = useState({ loading: false, error: null });

  const mutate = useCallback(
    async (...args) => {
      setState({ loading: true, error: null });
      try {
        const data = await mutator(...args);
        setState({ loading: false, error: null });
        return data;
      } catch (error) {
        setState({ loading: false, error });
        throw error;
      }
    },
    [mutator]
  );

  return { ...state, mutate };
}

// 검색 입력처럼 매 타이핑마다 요청하면 안 되는 값에 사용
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}