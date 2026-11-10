export class ApiError extends Error {
  constructor(message, status = 0, code = '', fields = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
const base = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
let accessToken = '',
  refreshPromise = null,
  generation = 0;
const tokenKey = 'education24-refresh-token-v1';
const listeners = new Set();
export const sessionGeneration = () => generation;
export function refreshToken() {
  try {
    return sessionStorage.getItem(tokenKey) || '';
  } catch {
    return '';
  }
}
export function clearSession() {
  generation++;
  accessToken = '';
  try {
    sessionStorage.removeItem(tokenKey);
  } catch {/* Session storage may be disabled. */}
  for (const listener of listeners) listener();
}
export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function establishSession(data) {
  if (!data?.accessToken) throw new ApiError('로그인 응답에 인증 정보가 없어요.');
  generation++;
  accessToken = data.accessToken;
  if (data.refreshToken) sessionStorage.setItem(tokenKey, data.refreshToken);
}
export const queryString = values => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values || {})) if (value !== '' && value !== undefined && value !== null) query.set(key, String(value));
  return query.size ? `?${query}` : '';
};
export function resource(path, values) {
  return path + queryString(values);
}
async function decode(response, blob) {
  if (response.ok && blob) return {
    data: await response.blob(),
    headers: response.headers
  };
  if (response.status === 204) return {
    data: null,
    meta: {}
  };
  let body;
  try {
    body = await response.json();
  } catch {
    if (response.status === 202) return {
      data: null,
      meta: {}
    };
    throw new ApiError('서버 응답을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.', response.status);
  }
  if (!response.ok) throw new ApiError(body.error?.message || '요청을 처리하지 못했어요.', response.status, body.error?.code, body.error?.fields || []);
  if (!Object.hasOwn(body, 'data') && response.status !== 202) throw new ApiError('서버 응답 형식이 명세와 달라요.', response.status, 'INVALID_RESPONSE');
  return body;
}
export async function renewSession() {
  if (!refreshPromise) {
    const epoch = generation;
    refreshPromise = (async () => {
      const token = refreshToken();
      if (!token) throw new ApiError('다시 로그인해 주세요.', 401);
      const result = await request('/auth/refresh', {
        method: 'POST',
        body: {
          refreshToken: token
        },
        public: true,
        refresh: false
      });
      if (epoch !== generation) throw new DOMException('Session changed', 'AbortError');
      if (!result.data?.accessToken) throw new ApiError('토큰 갱신 응답을 확인해 주세요.', 401);
      accessToken = result.data.accessToken;
      if (result.data.refreshToken) sessionStorage.setItem(tokenKey, result.data.refreshToken);
      return result;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
export async function request(path, options = {}) {
  const epoch = generation;
  const {
    method = 'GET',
    body,
    signal,
    public: anonymous = false,
    refresh = true,
    idempotencyKey,
    blob = false
  } = options;
  const headers = {
    'X-Request-Id': crypto.randomUUID()
  };
  if (!anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('서버에 연결하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.');
  }
  if (!anonymous && epoch !== generation) throw new DOMException('Session changed', 'AbortError');
  if (response.status === 401 && !anonymous && refresh) {
    try {
      await renewSession();
    } catch (error) {
      if (epoch === generation && error.status === 401) clearSession();
      throw error;
    }
    return request(path, {
      ...options,
      refresh: false
    });
  }
  if (response.status === 401 && !anonymous) clearSession();
  return decode(response, blob);
}
export async function download(path, filename) {
  const {
    data
  } = await request(path, {
    blob: true
  });
  const url = URL.createObjectURL(data),
    link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const detailError = error => error?.code === 'VERSION_CONFLICT' ? '다른 사용자가 먼저 수정했어요. 입력 내용을 복사해 보관한 후 최신 내용을 다시 불러와 주세요.' : error?.message || '요청을 처리하지 못했어요.';

// Timetables need the complete bounded result, not just the first page of cells.
export async function listAll(path, {
  signal
} = {}) {
  const load = page => request(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`, {
    signal
  });
  const first = await load(1);
  const values = data => Array.isArray(data) ? data : data?.entries;
  if (!Array.isArray(values(first.data))) throw new ApiError('목록 응답 형식을 확인해 주세요.', 0, 'INVALID_RESPONSE');
  const pages = first.meta?.totalPages || 1;
  if (pages > 10) throw new ApiError('조회 범위가 너무 넓어요. 학급을 선택해 주세요.');
  const result = [...values(first.data)];
  for (let page = 2; page <= pages; page++) {
    const next = await load(page);
    if (!Array.isArray(values(next.data))) throw new ApiError('목록 응답 형식을 확인해 주세요.', 0, 'INVALID_RESPONSE');
    result.push(...values(next.data));
  }
  return {
    data: result,
    meta: first.meta
  };
}
