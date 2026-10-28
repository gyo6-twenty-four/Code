import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore, LOCAL_PASSWORD } from './local-store.js';
function setup() {
  const memory = new Map();
  const storage = {
    getItem: k => memory.get(k),
    setItem: (k, v) => memory.set(k, v)
  };
  return {
    store: createLocalStore({
      storage,
      now: () => new Date(2026, 9, 28, 12)
    }),
    storage
  };
}
async function login(store, role = 'teacher') {
  return (await store.handle('/auth/login', {
    method: 'POST',
    body: {
      email: `${role}@education24.local`,
      password: LOCAL_PASSWORD
    }
  })).data.accessToken;
}
describe('Standalone UI workspace', () => {
  it('opens a populated teacher workspace without network and preserves writes after reload', async () => {
    const {
      store,
      storage
    } = setup();
    const actorId = await login(store);
    const classes = (await store.handle('/classes?schoolYear=2026', {
      actorId
    })).data;
    const students = (await store.handle(`/classes/${classes[0].id}/students`, {
      actorId
    })).data;
    const item = (await store.handle(`/students/${students[0].id}/observations`, {
      actorId,
      method: 'POST',
      body: {
        observedAt: '2026-10-28',
        category: 'OTHER',
        content: '스스로 발표를 준비함',
        schoolYear: 2026
      }
    })).data;
    const restored = createLocalStore({
      storage
    });
    assert.equal((await restored.handle(`/observations/${item.id}`, {
      actorId
    })).data.content, item.content);
    assert.equal(item.tags, undefined);
    assert.equal(item.visibility, undefined);
    await assert.rejects(store.handle(`/students/${students[0].id}/observations`, {
      actorId,
      method: 'POST',
      body: {
        observedAt: '2026-10-29',
        content: '미래 기록'
      }
    }), /오늘 또는 과거/);
  });
  it('validates login, isolates storage keys, and rejects unsupported or admin-only operations', async () => {
    const {
      store,
      storage
    } = setup();
    const actorId = await login(store);
    await assert.rejects(store.handle('/auth/login', {
      body: {
        email: 'teacher@education24.local',
        password: 'wrong'
      }
    }), /일치하지/);
    await assert.rejects(store.handle('/transfers/preview', {
      actorId,
      method: 'POST',
      body: {}
    }), e => e.status === 403);
    await assert.rejects(store.handle('/admin/dashboard/summary', {
      actorId
    }), e => e.status === 403);
    await assert.rejects(store.handle('/exports/neis', {
      actorId,
      method: 'POST'
    }), e => e.code === 'UNSUPPORTED_ACTION');
    assert.equal(storage.getItem('education24-refresh-token-v1'), undefined);
  });
  it('blocks timetable conflicts across different classes and teachers', async () => {
    const {
      store
    } = setup();
    const actorId = await login(store, 'admin');
    const classes = (await store.handle('/classes?schoolYear=2026', {
      actorId
    })).data;
    const lessons = (await store.handle('/timetables?schoolYear=2026', {
      actorId
    })).data;
    const first = lessons.find(t => t.dayOfWeek === 'MONDAY');
    await assert.rejects(store.handle('/admin/timetables/entries', {
      actorId,
      method: 'POST',
      body: {
        ...first,
        classId: classes[1].id
      }
    }), /동일한 시간/);
  });
  it('creates invitations, accepts once, and onboards without sending email', async () => {
    const {
      store
    } = setup();
    const actorId = await login(store, 'admin');
    const invitation = (await store.handle('/admin/teachers/invitations', {
      actorId,
      method: 'POST',
      body: {
        email: 'new@school.example',
        name: '새 교사',
        role: 'TEACHER',
        classIds: []
      }
    })).data;
    const token = invitation.invitationUrl.split('token=')[1];
    assert.equal((await store.handle(`/invitations/${token}`)).data.email, 'new@school.example');
    await store.handle(`/invitations/${token}/accept`, {
      method: 'POST',
      body: {
        name: '새 교사',
        termsAgreed: true,
        password: 'NewPass!123',
        passwordConfirmation: 'NewPass!123'
      }
    });
    await assert.rejects(store.handle(`/invitations/${token}`), /유효한/);
    const newId = (await store.handle('/auth/login', {
      body: {
        email: 'new@school.example',
        password: 'NewPass!123'
      }
    })).data.accessToken;
    assert.equal((await store.handle('/me', {
      actorId: newId
    })).data.onboardingCompleted, false);
  });
  it('admin transfer copies records and SKIP prevents duplicates', async () => {
    const {
      store
    } = setup();
    const actorId = await login(store, 'admin');
    const source = (await store.handle('/classes?schoolYear=2026', {
      actorId
    })).data[0];
    const target = (await store.handle('/classes?schoolYear=2027', {
      actorId
    })).data[0];
    const student = (await store.handle(`/classes/${source.id}/students`, {
      actorId
    })).data[0];
    const body = {
      source: {
        classId: source.id,
        schoolYear: 2026
      },
      target: {
        classId: target.id,
        schoolYear: 2027
      },
      studentIds: [student.id],
      include: ['OBSERVATIONS'],
      conflictPolicy: 'SKIP'
    };
    assert.equal((await store.handle('/transfers/preview', {
      actorId,
      method: 'POST',
      body
    })).data.valid, true);
    assert.equal((await store.handle('/transfers', {
      actorId,
      method: 'POST',
      body
    })).data.recordCount, 1);
    assert.equal((await store.handle('/transfers', {
      actorId,
      method: 'POST',
      body
    })).data.recordCount, 0);
    const destination = (await store.handle(`/classes/${target.id}/students`, {
      actorId
    })).data[0];
    assert.equal((await store.handle(`/students/${destination.id}/observations`, {
      actorId
    })).data.length, 1);
    assert.equal((await store.handle(`/students/${student.id}/observations`, {
      actorId
    })).data.length, 1);
  });
  it('keeps record checks tied to the saved version and restores earlier content', async () => {
    const { store } = setup();
    const actorId = await login(store);
    const classroom = (await store.handle('/classes?schoolYear=2026', { actorId })).data[0];
    const student = (await store.handle(`/classes/${classroom.id}/students`, { actorId })).data[0];
    const item = (await store.handle(`/students/${student.id}/record-items`, { actorId, method: 'POST', body: { type: 'BEHAVIOR_AND_OVERALL_OPINION', content: '처음 작성한 내용', status: 'DRAFT' } })).data;
    await store.handle(`/record-items/${item.id}/gate-checks`, { actorId, method: 'POST' });
    await store.handle(`/record-items/${item.id}/submit`, { actorId, method: 'POST' });
    const changed = (await store.handle(`/record-items/${item.id}`, { actorId, method: 'PATCH', body: { content: '수정한 내용', version: 1 } })).data;
    assert.equal(changed.version, 2);
    await assert.rejects(store.handle(`/record-items/${item.id}/submit`, { actorId, method: 'POST' }), /글자 수/);
    const versions = (await store.handle(`/record-items/${item.id}/versions`, { actorId })).data;
    const restored = (await store.handle(`/record-items/${item.id}/versions/${versions[0].id}/restore`, { actorId, method: 'POST' })).data;
    assert.equal(restored.content, '처음 작성한 내용');
    assert.equal(restored.status, 'DRAFT');
    assert.equal(restored.version, 3);
  });
  it('rejects impossible observation dates and excludes inactive teachers from lesson assignment', async () => {
    const { store } = setup();
    const teacherId = await login(store);
    const actorId = await login(store, 'admin');
    const classroom = (await store.handle('/classes?schoolYear=2026', { actorId })).data[0];
    const student = (await store.handle(`/classes/${classroom.id}/students`, { actorId })).data[0];
    await assert.rejects(store.handle(`/students/${student.id}/observations`, { actorId: teacherId, method: 'POST', body: { observedAt: '2026-02-31', content: '내용' } }), /올바른/);
    await store.handle(`/admin/teachers/${teacherId}`, { actorId, method: 'DELETE' });
    await assert.rejects(store.handle('/admin/timetables/entries', { actorId, method: 'POST', body: { classId: classroom.id, teacherId, period: 9, subject: '국어' } }), /활성 교사/);
  });

});
