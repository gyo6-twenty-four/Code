import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore, LOCAL_PASSWORD } from './local-store.js';
import { clearBackendRosterCache, loadBackendRoster, rosterFromApiRows, rosterPage } from './backend-students.js';

const rows = [
  { id: 10, pseudonymId: 'G1-C1-02', realName: '김지민', internalIdentifier: '1학년 1반 2번' },
  { id: 9, pseudonymId: 'G1-C1-01', realName: '박다은', internalIdentifier: '1학년 1반 1번' },
  { id: 11, pseudonymId: 'G2-C4-01', realName: '송성준', internalIdentifier: '2학년 4반 1번' },
];

describe('backend student roster', () => {
  it('groups PostgreSQL rows into classes and attendance order', () => {
    const roster = rosterFromApiRows(rows);
    assert.deepEqual(roster.classes.map(item => item.name), ['1학년 1반', '2학년 4반']);
    assert.deepEqual(rosterFromApiRows([
      { id: 3, pseudonymId: 'G1-C10-01', realName: '이하늘', internalIdentifier: '1학년 10반 1번' },
      { id: 1, pseudonymId: 'G1-C1-01', realName: '박다은', internalIdentifier: '1학년 1반 1번' },
      { id: 2, pseudonymId: 'G1-C2-01', realName: '김지민', internalIdentifier: '1학년 2반 1번' },
    ]).classes.map(item => item.name), ['1학년 1반', '1학년 2반', '1학년 10반']);
    assert.deepEqual(roster.students.map(item => item.name), ['박다은', '김지민', '송성준']);
    const page = rosterPage(roster, '/classes/backend:1-1/students?schoolYear=2026&page=1&size=20');
    assert.equal(page.data[0].number, 1);
    assert.equal(page.data[0].schoolYear, 2026);
    assert.equal(page.meta.totalElements, 2);
  });

  it('rejects a row whose class labels disagree', () => {
    assert.throws(() => rosterFromApiRows([
      { id: 1, pseudonymId: 'G1-C1-01', realName: '박다은', internalIdentifier: '1학년 2반 1번' },
    ]), /학급 정보/);
  });

  it('lets a teacher open the stored roster after Firebase account sync', async () => {
    const memory = new Map();
    const store = createLocalStore({
      storage: { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) },
    });
    const actorId = (await store.handle('/auth/login', {
      method: 'POST',
      body: { email: 'teacher@education24.local', password: LOCAL_PASSWORD },
    })).data.accessToken;
    await store.syncAccounts({ users: [{ id: actorId, name: '김지현', email: 'teacher@education24.local', role: 'TEACHER', status: 'ACTIVE', classIds: [] }] });
    await store.applyBackendRoster(actorId, rosterFromApiRows(rows));
    await store.syncAccounts({ users: [{ id: actorId, name: '김지현', email: 'teacher@education24.local', role: 'TEACHER', status: 'ACTIVE', classIds: [] }] });
    await store.grantStoredBackendClasses(actorId);
    const students = await store.handle('/classes/backend:1-1/students', { actorId });
    assert.deepEqual(students.data.map(item => item.name), ['박다은', '김지민']);
  });
});

describe('students API on a static host', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => clearBackendRosterCache());
  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearBackendRosterCache();
  });

  it('ignores the app HTML shell and does not parse it as JSON', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response('<!doctype html><html lang="ko"></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    };
    assert.equal(await loadBackendRoster(), null);
    assert.equal(await loadBackendRoster(), null);
    assert.equal(calls, 1);
  });

  it('uses the saved roster when the API proxy has no backend', async () => {
    globalThis.fetch = async () => new Response('', {
      status: 502,
      headers: { 'content-type': 'text/plain' },
    });
    assert.equal(await loadBackendRoster(), null);
  });

  it('keeps a JSON error from the students API', async () => {
    globalThis.fetch = async () => new Response('{"error":{"message":"nope"}}', {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
    await assert.rejects(loadBackendRoster(), /학생 명단을 불러오지 못했어요/);
  });

  it('still loads a JSON roster from the students API', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const roster = await loadBackendRoster();
    assert.deepEqual(roster.students.map(item => item.name), ['박다은', '김지민', '송성준']);
  });
});
