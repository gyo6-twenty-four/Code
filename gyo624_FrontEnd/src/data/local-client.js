import { createAccountGateway } from "./firebase-accounts.js";
import { isRosterRequest, loadFirebaseRoster, mirrorRosterWrite, rosterSchool } from "./firebase-roster.js";
import { createLocalStore, LocalError } from "./local-store.js";
import { readAdminSchool } from "../lib/school.js";
export { LocalError as ApiError } from "./local-store.js";
const store = createLocalStore({
  storage: globalThis.localStorage,
});
const accounts = createAccountGateway();
const sessionKey = "education24-ui-session-v1";
let actorId = globalThis.sessionStorage?.getItem(sessionKey) || "",
  generation = 0;
const listeners = new Set();
export const sessionGeneration = () => generation;
export const refreshToken = () =>
  globalThis.sessionStorage?.getItem(sessionKey) || "";
export function establishSession(data) {
  if (!data?.accessToken) throw new LocalError("로그인 정보를 확인해 주세요.");
  generation++;
  actorId = data.accessToken;
  globalThis.sessionStorage?.setItem(sessionKey, actorId);
}
export function clearSession() {
  generation++;
  actorId = "";
  globalThis.sessionStorage?.removeItem(sessionKey);
  for (const listener of listeners) listener();
}
export function onSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export async function restoreSession() {
  try {
    const session = await accounts.handle("/auth/refresh", {
      method: "POST",
      body: {},
    });
    establishSession(session.data);
    return (await accounts.handle("/me")).data;
  } catch (error) {
    if (error?.status === 401) {
      clearSession();
      return null;
    }
    throw error;
  }
}
export async function renewSession() {
  const response = await accounts.handle("/auth/refresh", {
    method: "POST",
    body: {},
  });
  establishSession(response.data);
  return response;
}
export async function request(path, options = {}) {
  if (options.signal?.aborted)
    throw new DOMException("Cancelled", "AbortError");
  const epoch = generation;
  const accountResponse = await accounts.handle(path, options);
  const response =
    accountResponse ||
    (await (async () => {
      const profile = await accounts.syncDirectory((payload) =>
        store.syncAccounts(payload),
      );
      await store.grantStoredBackendClasses(profile.id);
      const virtualSchool =
        profile.role === "ADMIN" ? readAdminSchool() : profile.school;
      const method = options.method || "GET";
      if (isRosterRequest(path, method) && method === "GET") {
        const year = new URL(path, "http://local.invalid").searchParams.get(
          "schoolYear",
        );
        const schools = new Map();
        const addSchool = (school) => {
          const next = rosterSchool(school);
          if (next?.schoolCode) schools.set(next.schoolCode, next);
        };
        addSchool(virtualSchool);
        addSchool(profile.school);
        for (const school of await store.knownVirtualSchools()) addSchool(school);
        for (const school of schools.values()) {
          const roster = await loadFirebaseRoster(school, year);
          if (roster) await store.mergeSchoolRoster(school.schoolCode, year, roster);
        }
      }
      const response = await store.handle(path, {
        ...options,
        actorId: profile.id,
        virtualSchool,
      });
      if (method !== "GET" && isRosterRequest(path, method))
        await mirrorRosterWrite(path, method, response);
      return response;
    })());
  if (options.signal?.aborted || epoch !== generation)
    throw new DOMException("Cancelled", "AbortError");
  return structuredClone(response);
}
export const detailError = (error) =>
  error?.message || "요청을 처리하지 못했어요.";
export const queryString = (values) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values || {}))
    if (value !== "" && value !== undefined && value !== null)
      query.set(key, String(value));
  return query.size ? `?${query}` : "";
};
export const resource = (path, values) => path + queryString(values);
export async function listAll(path, { signal } = {}) {
  const first = await request(
    `${path}${path.includes("?") ? "&" : "?"}page=1&size=100`,
    {
      signal,
    },
  );
  const data = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page++)
    data.push(
      ...(
        await request(
          `${path}${path.includes("?") ? "&" : "?"}page=${page}&size=100`,
          {
            signal,
          },
        )
      ).data,
    );
  return {
    ...first,
    data,
  };
}
