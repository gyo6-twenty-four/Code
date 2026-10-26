import { useCallback, useEffect, useRef, useState } from 'react';
import { detailError, listAll, request, resource, sessionGeneration } from './client';
export function useResource(path, anonymous = false, all = false) {
  const epoch = sessionGeneration();
  const [result, setResult] = useState({
    data: null,
    meta: {},
    error: null,
    loading: !!path,
    path: null
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const pending = all ? listAll(path, {
      signal: controller.signal
    }) : request(path, {
      signal: controller.signal,
      public: anonymous
    });
    pending.then(body => {
      if (!controller.signal.aborted) setResult({
        ...body,
        loading: false,
        error: null,
        path,
        epoch
      });
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError') setResult({
        data: null,
        meta: {},
        loading: false,
        error,
        path,
        epoch
      });
    });
    return () => controller.abort();
  }, [path, revision, anonymous, epoch, all]);
  const current = result.path === path && result.epoch === epoch ? result : {
    data: null,
    meta: {},
    error: null,
    loading: !!path
  };
  return {
    ...current,
    reload: useCallback(() => setRevision(value => value + 1), [])
  };
}
export function useMutation(notify) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  const lock = useRef(false),
    alive = useRef(true),
    attempt = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run(path, options = {}, message) {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError(null);
    const epoch = sessionGeneration();
    const signature = `${path}:${options.body instanceof FormData ? [...options.body.entries()].map(([key, item]) => `${key}:${item.name || item}:${item.size || ''}:${item.lastModified || ''}`).join('|') : JSON.stringify(options.body)}`;
    if (attempt.current?.signature !== signature) attempt.current = {
      signature,
      key: crypto.randomUUID()
    };
    try {
      const result = await request(path, {
        method: 'POST',
        ...options,
        idempotencyKey: options.idempotent ? attempt.current.key : undefined
      });
      attempt.current = null;
      if (!alive.current || epoch !== sessionGeneration()) return null;
      if (message) notify?.(message);
      return result;
    } catch (error) {
      if (alive.current && error.name !== 'AbortError') setError(error);
      return null;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return {
    busy,
    error,
    run,
    clearError: () => setError(null),
    message: detailError(error)
  };
}
export function usePage(path, filters = {}) {
  const [page, setPage] = useState(1);
  const data = useResource(path ? resource(path, {
    ...filters,
    page,
    size: 20
  }) : null);
  return {
    ...data,
    page,
    setPage
  };
}
