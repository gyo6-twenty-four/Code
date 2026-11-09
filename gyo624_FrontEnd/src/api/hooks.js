import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeClassLists } from '../lib/classrooms';
import { toNeisSchool } from '../lib/school';
import { detailError, listAll, request, resource, sessionGeneration } from './client';
import { loadClasses } from './neis';

export function useNeisClasses(school, year) {
  const officeCode = school?.officeCode || '';
  const schoolCode = school?.schoolCode || '';
  const schoolName = school?.schoolName || school?.name || '';
  const officeName = school?.officeName || '';
  const kind = school?.kind || '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ id: '', error: '', data: [] });
  const query = officeCode && schoolCode ? `${year}|${attempt}|${officeCode}|${schoolCode}` : '';
  useEffect(() => {
    if (!query) return undefined;
    const controller = new AbortController();
    const id = query;
    loadClasses({ officeCode, schoolCode }, year, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ id, error: '', data });
    }).catch(error => {
      if (error.name !== 'AbortError') setState({ id, error: error.message, data: [] });
    });
    return () => controller.abort();
  }, [query, officeCode, schoolCode, year]);
  const ready = Boolean(query) && state.id === query;
  const data = ready ? state.data.map(item => ({
    ...item,
    schoolYear: Number(year),
    schoolCode,
    schoolName,
    officeCode,
    officeName,
    kind
  })) : [];
  return {
    loading: Boolean(query) && !ready,
    error: ready && state.error ? new Error(state.error) : null,
    data,
    reload: useCallback(() => setAttempt(value => value + 1), [])
  };
}
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

export function useRosterClasses(school, year, storedFilters = {}, enabled = true) {
  const stored = usePage(enabled ? '/classes' : null, {
    schoolYear: year,
    ...storedFilters
  });
  const catalogSchool = school?.officeCode && school?.schoolCode ? school : toNeisSchool(school);
  const catalog = useNeisClasses(catalogSchool, year);
  const hasCatalog = Boolean(catalogSchool?.officeCode && catalogSchool?.schoolCode);
  return {
    loading: stored.loading || (hasCatalog && catalog.loading),
    error: stored.error || catalog.error,
    data: mergeClassLists(catalog.data, stored.data),
    reload: () => {
      stored.reload?.();
      catalog.reload?.();
    },
    setPage: stored.setPage,
    page: stored.page,
    meta: stored.meta
  };
}
