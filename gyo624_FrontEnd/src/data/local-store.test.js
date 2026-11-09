import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore, LOCAL_PASSWORD, TEST_SCHOOL_ACCOUNT } from './local-store.js';
function setup() {
  const memory = new Map();
  const storage = {
    getItem: k => memory.get(k),
    setItem: (k, v) => memory.set(k, v)
  };
  return {
    store: createLocalStore({
      storage,
      now: () => new Date(2026, 9, 28, 12),
      seedDemo: false
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
async function addClass(store, adminId, schoolYear, grade = 1, classNumber = 1) {
  return (await store.handle('/admin/classes', {
    actorId: adminId,
    method: 'POST',
    body: { schoolYear, grade, classNumber }
  })).data;
}
async function addStudent(store, adminId, classId, name = '새 학생', number = 1) {
  return (await store.handle(`/admin/classes/${classId}/students`, {
    actorId: adminId,
    method: 'POST',
    body: { name, number }
  })).data;
}
async function grant(store, adminId, teacherId, classId) {
  const teacher = (await store.handle(`/admin/teachers/${teacherId}`, { actorId: adminId })).data;
  await store.handle(`/admin/teachers/${teacherId}`, {
    actorId: adminId,
    method: 'PATCH',
    body: { classIds: [...new Set([...(teacher.classIds || []), classId])] }
  });
}
describe('Standalone UI workspace', () => {
  it('lists classes by grade and class number, not lexicographic name', async () => {
    const { store } = setup();
    const adminId = await login(store, 'admin');
    await addClass(store, adminId, 2026, 1, 10);
    await addClass(store, adminId, 2026, 1, 1);
    await addClass(store, adminId, 2026, 1, 2);
    assert.deepEqual((await store.handle('/classes?schoolYear=2026', { actorId: adminId })).data.map(item => item.name), ['1학년 1반', '1학년 2반', '1학년 10반']);
  });
  it('lets a teacher write school records for every class without an admin assignment', async () => {
    const { store } = setup();
    const adminId = await login(store, 'admin');
    const actorId = await login(store);
    const assigned = await addClass(store, adminId, 2026, 1, 1);
    const other = await addClass(store, adminId, 2026, 2, 3);
    await grant(store, adminId, actorId, assigned.id);
    const student = await addStudent(store, adminId, other.id, '다른 학급 학생', 4);
    assert.deepEqual((await store.handle('/classes?schoolYear=2026', { actorId })).data.map(item => item.id), [assigned.id, other.id]);
    assert.equal((await store.handle(`/classes/${other.id}/students`, { actorId })).data[0].name, '다른 학급 학생');
    const item = (await store.handle(`/students/${student.id}/record-items`, {
      actorId,
      method: 'POST',
      body: { schoolYear: 2026, type: 'SUBJECT', content: '교과 기록', status: 'DRAFT' }
    })).data;
    assert.equal(item.studentId, student.id);
    assert.equal((await store.handle(`/classes/${other.id}/record-board`, { actorId })).data[0].name, '다른 학급 학생');
    assert.equal((await store.handle('/classes/neis:2:3/students?schoolYear=2026', { actorId })).data[0].name, '다른 학급 학생');
    assert.equal((await store.handle('/classes/neis:2:3/record-board?schoolYear=2026', { actorId })).data[0].name, '다른 학급 학생');
    assert.equal((await store.handle(`/students/${student.id}/observations`, {
      actorId,
      method: 'POST',
      body: { observedAt: '2026-10-28', category: 'OTHER', content: '관찰', schoolYear: 2026 }
    })).data.content, '관찰');
  });
  it('starts without demo school data and preserves writes after reload', async () => {
    const {
      store,
      storage
    } = setup();
    const adminId = await login(store, 'admin');
    assert.equal((await store.handle('/me', { actorId: adminId })).data.school.name, '');
    assert.equal((await store.handle('/classes?schoolYear=2026', { actorId: adminId })).data.length, 0);
    assert.equal((await store.handle('/timetables?schoolYear=2026', { actorId: adminId })).data.length, 0);
    const actorId = await login(store);
    const classroom = await addClass(store, adminId, 2026);
    await grant(store, adminId, actorId, classroom.id);
    const students = [(await addStudent(store, adminId, classroom.id))];
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
  it('adds a test school admin account to existing workspaces', async () => {
    const { store, storage } = setup();
    await login(store, 'admin');
    const saved = JSON.parse(storage.getItem('education24-ui-workspace-v1'));
    saved.users = saved.users.filter(user => user.email !== TEST_SCHOOL_ACCOUNT.email);
    storage.setItem('education24-ui-workspace-v1', JSON.stringify(saved));
    const restored = createLocalStore({ storage, now: () => new Date(2026, 9, 28, 12) });
    const actorId = (await restored.handle('/auth/login', {
      method: 'POST',
      body: { email: TEST_SCHOOL_ACCOUNT.email, password: LOCAL_PASSWORD }
    })).data.accessToken;
    const me = (await restored.handle('/me', { actorId })).data;
    assert.equal(me.name, TEST_SCHOOL_ACCOUNT.name);
    assert.equal(me.role, 'ADMIN');
  });
  it('blocks timetable conflicts across different classes and teachers', async () => {
    const {
      store
    } = setup();
    const actorId = await login(store, 'admin');
    const teacherId = await login(store);
    const firstClass = await addClass(store, actorId, 2026, 1, 1);
    const secondClass = await addClass(store, actorId, 2026, 1, 2);
    const first = (await store.handle('/admin/timetables/entries', {
      actorId,
      method: 'POST',
      body: {
        classId: firstClass.id,
        teacherId,
        schoolYear: 2026,
        semester: 2,
        dayOfWeek: 'MONDAY',
        period: 1,
        subject: '국어'
      }
    })).data;
    await assert.rejects(store.handle('/admin/timetables/entries', {
      actorId,
      method: 'POST',
      body: {
        ...first,
        classId: secondClass.id
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
    const teacherId = await login(store);
    const source = await addClass(store, actorId, 2026, 1, 1);
    const target = await addClass(store, actorId, 2027, 1, 1);
    await grant(store, actorId, teacherId, source.id);
    const student = await addStudent(store, actorId, source.id);
    await store.handle(`/students/${student.id}/observations`, {
      actorId: teacherId,
      method: 'POST',
      body: {
        observedAt: '2026-10-28',
        category: 'CLASS_ATTITUDE',
        content: '옮길 관찰',
        schoolYear: 2026
      }
    });
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
    const adminId = await login(store, 'admin');
    const actorId = await login(store);
    const classroom = await addClass(store, adminId, 2026);
    await grant(store, adminId, actorId, classroom.id);
    const student = await addStudent(store, adminId, classroom.id);
    const item = (await store.handle(`/students/${student.id}/record-items`, { actorId, method: 'POST', body: { type: 'CLUB', content: '처음 작성한 내용', status: 'DRAFT' } })).data;
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
    const classroom = await addClass(store, actorId, 2026);
    await grant(store, actorId, teacherId, classroom.id);
    const student = await addStudent(store, actorId, classroom.id);
    await assert.rejects(store.handle(`/students/${student.id}/observations`, { actorId: teacherId, method: 'POST', body: { observedAt: '2026-02-31', content: '내용' } }), /올바른/);
    await store.handle(`/admin/teachers/${teacherId}`, { actorId, method: 'DELETE' });
    await assert.rejects(store.handle('/admin/timetables/entries', { actorId, method: 'POST', body: { classId: classroom.id, teacherId, period: 9, subject: '국어' } }), /활성 교사/);
  });
  it('deletes a teacher account, keeps their records, and cancels a pending invitation', async () => {
    const { store } = setup();
    const adminId = await login(store, 'admin');
    const teacherId = await login(store, 'teacher2');
    const classroom = await addClass(store, adminId, 2026);
    await grant(store, adminId, teacherId, classroom.id);
    const student = await addStudent(store, adminId, classroom.id);
    const observation = (await store.handle(`/students/${student.id}/observations`, {
      actorId: teacherId,
      method: 'POST',
      body: { observedAt: '2026-10-28', category: 'OTHER', content: '남길 관찰', schoolYear: 2026 }
    })).data;
    await store.handle('/admin/timetables/entries', {
      actorId: adminId,
      method: 'POST',
      body: { classId: classroom.id, teacherId, schoolYear: 2026, semester: 2, dayOfWeek: 'MONDAY', period: 3, subject: '국어' }
    });
    await store.handle(`/admin/teachers/${teacherId}`, { actorId: adminId, method: 'DELETE' });
    const listed = (await store.handle('/admin/teachers', { actorId: adminId })).data;
    assert.equal(listed.some(item => item.id === teacherId), false);
    assert.equal((await store.handle(`/observations/${observation.id}`, { actorId: adminId })).data.content, '남길 관찰');
    assert.equal((await store.handle('/timetables?schoolYear=2026&semester=2', { actorId: adminId })).data.length, 0);
    await assert.rejects(store.handle('/auth/login', {
      method: 'POST',
      body: { email: 'teacher2@education24.local', password: LOCAL_PASSWORD }
    }), /일치하지/);
    await assert.rejects(store.handle('/admin/teachers/invitations', {
      actorId: adminId,
      method: 'POST',
      body: { email: 'teacher2@education24.local', name: '이서연', role: 'TEACHER', classIds: [], recordTypes: ['CLUB'] }
    }), /삭제한 계정/);
    await assert.rejects(store.handle(`/admin/teachers/${adminId}`, { actorId: adminId, method: 'DELETE' }), /자신의 계정/);
    const invite = (await store.handle('/admin/teachers/invitations', {
      actorId: adminId,
      method: 'POST',
      body: { email: 'new-teacher@school.kr', name: '새 교사', role: 'TEACHER', classIds: [], recordTypes: ['CLUB'] }
    })).data;
    const token = invite.invitationUrl.split('token=')[1];
    await store.handle(`/admin/teachers/${invite.invitationId}`, { actorId: adminId, method: 'DELETE' });
    assert.equal((await store.handle('/admin/teachers', { actorId: adminId })).data.some(item => item.id === invite.invitationId), false);
    await assert.rejects(store.handle(`/invitations/${token}`), /유효한 초대/);
  });
  it('stores a school on each teacher account', async () => {
    const { store } = setup();
    const adminId = await login(store, 'admin');
    const teacherId = await login(store, 'teacher2');
    await assert.rejects(store.handle('/settings/school', {
      actorId: adminId,
      method: 'PATCH',
      body: { name: '관리학교', schoolCode: 'B0000001', officeCode: 'B10' }
    }), /교사/);
    const saved = (await store.handle('/settings/school', {
      actorId: teacherId,
      method: 'PATCH',
      body: { name: '한빛중학교', schoolCode: 'b7010083', officeCode: 'B10', officeName: '서울', kind: '중학교' }
    })).data;
    assert.equal(saved.schoolCode, 'B7010083');
    assert.equal((await store.handle('/me', { actorId: teacherId })).data.school.name, '한빛중학교');
    await assert.rejects(store.handle('/settings/school', {
      actorId: teacherId,
      method: 'PATCH',
      body: { name: '한빛초등학교', schoolCode: 'B7010001', officeCode: 'B10', kind: '초등학교' }
    }), /중학교와 고등학교/);
    const invited = (await store.handle('/admin/teachers/invitations', {
      actorId: adminId,
      method: 'POST',
      body: { email: 'setup-teacher@school.kr', name: '처음 교사', role: 'TEACHER', classIds: [] }
    })).data;
    const token = invited.invitationUrl.split('token=')[1];
    await store.handle(`/invitations/${token}/accept`, {
      method: 'POST',
      body: { name: '처음 교사', termsAgreed: true, password: 'NewPass!123', passwordConfirmation: 'NewPass!123' }
    });
    const setupId = (await store.handle('/auth/login', {
      body: { email: 'setup-teacher@school.kr', password: 'NewPass!123' }
    })).data.accessToken;
    await assert.rejects(store.handle('/onboarding/complete', { actorId: setupId, method: 'POST', body: {} }), /학교/);
    await store.handle('/settings/school', {
      actorId: setupId,
      method: 'PATCH',
      body: { name: '한빛중학교', schoolCode: 'B7010083', officeCode: 'B10', kind: '중학교' }
    });
    await assert.rejects(store.handle('/onboarding/complete', { actorId: setupId, method: 'POST', body: {} }), /과목/);
    await store.handle('/settings/teaching', {
      actorId: setupId,
      method: 'PATCH',
      body: { homeroomClassId: '', subjectIds: ['2022:middle:국어'], teachingClassIds: [] }
    });
    assert.equal((await store.handle('/onboarding/complete', { actorId: setupId, method: 'POST', body: {} })).data.onboardingCompleted, true);
    await store.handle('/settings/teaching', {
      actorId: setupId,
      method: 'PATCH',
      body: { homeroomClassId: 'neis:2:1', subjectIds: ['2022:middle:국어'], teachingClassIds: ['neis:2:1', 'neis:2:2'] }
    });
    assert.equal((await store.handle('/me', { actorId: setupId })).data.homeroomClassId, 'neis:2:1');
    assert.equal((await store.handle('/me', { actorId: adminId })).data.school.name, '');
    const listed = (await store.handle('/admin/teachers', { actorId: adminId })).data;
    assert.equal(listed.some(item => item.id === teacherId), true);
    await store.handle(`/admin/teachers/${teacherId}`, { actorId: adminId, method: 'DELETE' });
    assert.equal((await store.handle('/admin/teachers', { actorId: adminId })).data.some(item => item.id === teacherId), false);
  });
  it('keeps a teacher assignment and clears it when the school changes', async () => {
    const { store } = setup();
    const adminId = await login(store, 'admin');
    const teacherId = await login(store, 'teacher2');
    await assert.rejects(store.handle('/settings/teaching', {
      actorId: adminId,
      method: 'PATCH',
      body: { subjectIds: ['2022:middle:국어'], teachingClassIds: ['neis:1:1'] }
    }), /교사/);
    await store.handle('/settings/school', {
      actorId: teacherId,
      method: 'PATCH',
      body: { name: '한빛중학교', schoolCode: 'B7010083', officeCode: 'B10', kind: '중학교' }
    });
    const saved = (await store.handle('/settings/teaching', {
      actorId: teacherId,
      method: 'PATCH',
      body: { homeroomClassId: 'neis:1:1', subjectIds: ['2022:middle:국어'], teachingClassIds: ['neis:1:1'] }
    })).data;
    assert.deepEqual(saved.subjectIds, ['2022:middle:국어']);
    await store.handle('/settings/school', {
      actorId: teacherId,
      method: 'PATCH',
      body: { name: '한빛중학교', schoolCode: 'B7010083', officeCode: 'B10', kind: '중학교' }
    });
    assert.equal((await store.handle('/settings/teaching', { actorId: teacherId })).data.homeroomClassId, 'neis:1:1');
    await store.handle('/settings/school', {
      actorId: teacherId,
      method: 'PATCH',
      body: { name: '다른고등학교', schoolCode: 'B0000002', officeCode: 'B10', kind: '고등학교' }
    });
    const cleared = (await store.handle('/settings/teaching', { actorId: teacherId })).data;
    assert.equal(cleared.homeroomClassId, '');
    assert.deepEqual(cleared.teachingClassIds, []);
    assert.deepEqual(cleared.subjectIds, []);
    assert.deepEqual((await store.handle('/me', { actorId: teacherId })).data.classIds, []);
    await assert.rejects(store.handle('/settings/teaching', {
      actorId: teacherId,
      method: 'PATCH',
      body: { subjectIds: [], teachingClassIds: ['neis:1:1'] }
    }), /과목/);
  });
  it('lets an admin limit which report types a teacher can write', async () => {
    const { store } = setup();
    const adminId = await login(store, 'admin');
    const teacherId = await login(store);
    const teacher = (await store.handle(`/admin/teachers/${teacherId}`, { actorId: adminId })).data;
    await store.handle(`/admin/teachers/${teacherId}`, {
      actorId: adminId,
      method: 'PATCH',
      body: { name: teacher.name, email: teacher.email, role: 'TEACHER', classIds: teacher.classIds, recordTypes: ['CLUB'] }
    });
    const classroom = await addClass(store, adminId, 2026);
    await grant(store, adminId, teacherId, classroom.id);
    const student = await addStudent(store, adminId, classroom.id);
    await assert.rejects(store.handle(`/students/${student.id}/record-items`, {
      actorId: teacherId,
      method: 'POST',
      body: { type: 'CAREER', content: '진로 문장', status: 'DRAFT' }
    }), /생기부 유형/);
    const item = (await store.handle(`/students/${student.id}/record-items`, {
      actorId: teacherId,
      method: 'POST',
      body: { type: 'CLUB', content: '동아리 문장', status: 'DRAFT' }
    })).data;
    assert.equal(item.type, 'CLUB');
    const usage = (await store.handle('/admin/dashboard/usage?schoolYear=2026', { actorId: adminId })).data;
    assert.equal(usage.length, 12);
    assert.equal(usage[9].records, 1);
  });
  it('removes a previously saved demo school without deleting later records', async () => {
    const { store, storage } = setup();
    await login(store, 'admin');
    const saved = JSON.parse(storage.getItem('education24-ui-workspace-v1'));
    saved.school = { name: '한빛학교' };
    saved.classes = [
      { id: 'demo-class', schoolYear: 2026, grade: 1, classNumber: 1, name: '1학년 1반' },
      { id: 'next-class', schoolYear: 2027, grade: 2, classNumber: 1, name: '2학년 1반' },
      { id: 'real-class', schoolYear: 2026, grade: 4, classNumber: 2, name: '4학년 2반' }
    ];
    saved.students = [
      { id: 'demo-student', classId: 'demo-class', schoolYear: 2026, name: '김민준', number: 1 },
      { id: 'real-student', classId: 'real-class', schoolYear: 2026, name: '홍길동', number: 1 },
      { id: 'kept-student', classId: 'demo-class', schoolYear: 2026, name: '최우리', number: 2 }
    ];
    saved.observations = [
      { id: 'demo-obs', studentId: 'demo-student', classId: 'demo-class', content: '모둠 활동에서 친구의 의견을 듣고 자신의 생각을 설명했어요.' },
      { id: 'kept-obs', studentId: 'kept-student', classId: 'demo-class', content: '직접 남긴 관찰' }
    ];
    saved.timetables = [
      { id: 'demo-lesson', classId: 'next-class', schoolYear: 2027, subject: '국어' },
      { id: 'kept-lesson', classId: 'demo-class', schoolYear: 2026, subject: '사회' }
    ];
    saved.notifications = [{ id: 'demo-note', userId: saved.users[0].id, title: '새 학기 수업 준비', message: '담당 학급과 시간표를 확인해 주세요.', type: 'NOTICE', read: false }];
    saved.users[0].classIds = ['demo-class', 'next-class', 'real-class'];
    storage.setItem('education24-ui-workspace-v1', JSON.stringify(saved));
    const restored = createLocalStore({ storage, now: () => new Date(2026, 9, 28, 12) });
    const actorId = await login(restored, 'admin');
    assert.equal((await restored.handle('/me', { actorId })).data.school.name, '');
    assert.deepEqual((await restored.handle('/classes?schoolYear=2026', { actorId })).data.map(item => item.id).sort(), ['demo-class', 'real-class']);
    assert.equal((await restored.handle('/classes?schoolYear=2027', { actorId })).data.length, 0);
    assert.deepEqual((await restored.handle('/classes/demo-class/students', { actorId })).data.map(item => item.name), ['최우리']);
    assert.equal((await restored.handle('/classes/real-class/students', { actorId })).data[0].name, '홍길동');
    assert.equal((await restored.handle('/students/kept-student/observations', { actorId })).data[0].content, '직접 남긴 관찰');
    assert.equal((await restored.handle('/timetables?schoolYear=2027', { actorId })).data.length, 0);
    assert.equal((await restored.handle('/timetables?classId=demo-class', { actorId })).data[0].id, 'kept-lesson');
    const teacherId = await login(restored);
    assert.equal((await restored.handle('/notifications', { actorId: teacherId })).data.length, 0);
  });
  it('separates classes, teachers, and dashboard totals by school', async () => {
    const { store } = setup();
    const adminId = await login(store, 'admin');
    const firstTeacher = await login(store, 'teacher');
    const secondTeacher = await login(store, 'teacher2');
    const hanbit = { name: '한빛중학교', schoolCode: 'B7010083', officeCode: 'B10', officeName: '서울', kind: '중학교' };
    const other = { name: '다른고등학교', schoolCode: 'B0000002', officeCode: 'B10', kind: '고등학교' };
    await store.handle('/settings/school', { actorId: firstTeacher, method: 'PATCH', body: hanbit });
    await store.handle('/settings/school', { actorId: secondTeacher, method: 'PATCH', body: other });
    const firstClass = (await store.handle('/admin/classes', {
      actorId: adminId,
      method: 'POST',
      body: { schoolYear: 2026, grade: 1, classNumber: 1, school: hanbit }
    })).data;
    const secondClass = (await store.handle('/admin/classes', {
      actorId: adminId,
      method: 'POST',
      body: { schoolYear: 2026, grade: 1, classNumber: 1, school: other }
    })).data;
    assert.equal(firstClass.schoolCode, 'B7010083');
    assert.notEqual(firstClass.id, secondClass.id);
    assert.deepEqual((await store.handle('/classes?schoolYear=2026&schoolCode=B7010083', { actorId: adminId })).data.map(item => item.id), [firstClass.id]);
    await addStudent(store, adminId, firstClass.id, '한빛 학생', 1);
    await store.handle('/admin/teachers/invitations', {
      actorId: adminId,
      method: 'POST',
      body: { email: 'hanbit-teacher@school.kr', name: '한빛 교사', role: 'TEACHER', classIds: [], school: hanbit }
    });
    const schools = (await store.handle('/admin/schools?schoolYear=2026', { actorId: adminId })).data;
    assert.equal(schools.find(item => item.schoolCode === 'B7010083').teacherCount, 1);
    assert.equal(schools.find(item => item.schoolCode === 'B7010083').classCount, 1);
    assert.equal(schools.find(item => item.schoolCode === 'B7010083').studentCount, 1);
    assert.equal(schools.find(item => item.schoolCode === 'B7010083').pendingInvitations, 1);
    assert.equal(schools.find(item => item.schoolCode === 'B0000002').classCount, 1);
    assert.equal(schools.find(item => item.schoolCode === 'B0000002').studentCount, 0);
    const summary = (await store.handle('/admin/dashboard/summary?schoolYear=2026&schoolCode=B7010083', { actorId: adminId })).data;
    assert.equal(summary.classCount, 1);
    assert.equal(summary.studentCount, 1);
    assert.equal(summary.teacherCount, 1);
    assert.equal(summary.pendingInvitations, 1);
    const listed = (await store.handle('/admin/teachers?schoolCode=B7010083', { actorId: adminId })).data;
    assert.equal(listed.some(item => item.id === firstTeacher), true);
    assert.equal(listed.some(item => item.id === secondTeacher), false);
    assert.equal(listed.some(item => item.email === 'hanbit-teacher@school.kr'), true);
    assert.equal((await store.handle('/admin/dashboard/summary?schoolYear=2026', { actorId: adminId })).data.classCount, 2);
    const logs = (await store.handle('/admin/audit-logs?schoolCode=B7010083', { actorId: adminId })).data;
    assert.equal(logs.length > 0, true);
    assert.equal(logs.every(item => item.schoolCode === 'B7010083'), true);
    await assert.rejects(store.handle('/admin/timetables/entries', {
      actorId: adminId,
      method: 'POST',
      body: { classId: firstClass.id, teacherId: secondTeacher, schoolYear: 2026, semester: 1, dayOfWeek: 'MONDAY', period: 1, subject: '국어' }
    }), /학교/);
  });

});
