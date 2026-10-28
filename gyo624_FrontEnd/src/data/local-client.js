import { createLocalStore, LocalError } from './local-store.js';
export { LocalError as ApiError } from './local-store.js';
const store = createLocalStore({
  storage: globalThis.localStorage
});
const sessionKey = 'education24-ui-session-v1';
let actorId = globalThis.sessionStorage?.getItem(sessionKey) || '',
  generation = 0;
const listeners = new Set();
export const sessionGeneration = () => generation;
export const refreshToken = () => globalThis.sessionStorage?.getItem(sessionKey) || '';
export function establishSession(data) {
  if (!data?.accessToken) throw new LocalError('로그인 정보를 확인해 주세요.');
  generation++;
  actorId = data.accessToken;
  globalThis.sessionStorage?.setItem(sessionKey, actorId);
}
export function clearSession() {
  generation++;
  actorId = '';
  globalThis.sessionStorage?.removeItem(sessionKey);
  for (const listener of listeners) listener();
}
export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export async function renewSession() {
  const response = await store.handle('/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: refreshToken()
    }
  });
  actorId = response.data.accessToken;
  return response;
}
export async function request(path, options = {}) {
  if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const epoch = generation;
  const response = await store.handle(path, {
    ...options,
    actorId
  });
  if (options.signal?.aborted || epoch !== generation) throw new DOMException('Cancelled', 'AbortError');
  return structuredClone(response);
}
export const detailError = error => error?.message || '요청을 처리하지 못했어요.';
export const queryString = values => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values || {})) if (value !== '' && value !== undefined && value !== null) query.set(key, String(value));
  return query.size ? `?${query}` : '';
};
export const resource = (path, values) => path + queryString(values);
export async function listAll(path, {
  signal
} = {}) {
  const first = await request(`${path}${path.includes('?') ? '&' : '?'}page=1&size=100`, {
    signal
  });
  const data = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page++) data.push(...(await request(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`, {
    signal
  })).data);
  return {
    ...first,
    data
  };
}
