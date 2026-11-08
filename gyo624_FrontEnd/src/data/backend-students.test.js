import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore, LOCAL_PASSWORD } from './local-store.js';
import { rosterFromApiRows, rosterPage } from './backend-students.js';

const rows = [
  { id: 10, pseudonymId: 'G1-C1-02', realName: '김지민', internalIdentifier: '1학년 1반 2번' },
  { id: 9, pseudonymId: 'G1-C1-01', realName: '박다은', internalIdentifier: '1학년 1반 1번' },
  { id: 11, pseudonymId: 'G2-C4-01', realName: '송성준', internalIdentifier: '2학년 4반 1번' },
];

describe('backend student roster', () => {
  it('groups PostgreSQL rows into classes and attendance order', () => {
    const roster = rosterFromApiRows(rows);
    assert.deepEqual(roster.classes.map(item => item.name), ['1학년 1반', '2학년 4반']);
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
