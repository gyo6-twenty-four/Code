import { observationDateError } from '../lib/observations.js';
// Browser-only workspace. No HTTP requests or production credentials are used here.
const STORE_KEY = 'education24-ui-workspace-v1';
export const LOCAL_PASSWORD = 'Edu24!2026';
export class LocalError extends Error {
  constructor(message, status = 400, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const uuid = () => crypto.randomUUID();
const clone = value => structuredClone(value);
const requireValue = (condition, message, status = 400) => {
  if (!condition) throw new LocalError(message, status);
};
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(n => n.toString(16).padStart(2, '0')).join('');
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function createLocalStore({
  storage,
  now = () => new Date()
} = {}) {
  let database;
  let loading;
  async function load() {
    if (database) return database;
    if (loading) return loading;
    loading = (async () => {
      const saved = storage?.getItem(STORE_KEY);
      if (saved) {
        try {
          database = JSON.parse(saved);
        } catch {
          throw new LocalError('저장된 화면 데이터를 읽지 못했어요. 브라우저 저장소를 확인해 주세요.');
        }
        return database;
      }
      const year = now().getFullYear();
      const passwordHash = await digest(LOCAL_PASSWORD);
      const classes = [year, year + 1].flatMap(schoolYear => [1, 2, 3].map(grade => ({
        id: uuid(),
        schoolYear,
        grade,
        classNumber: 1,
        name: `${grade}학년 1반`
      })));
      const users = [{
        id: uuid(),
        name: '김지현',
        email: 'teacher@education24.local',
        role: 'TEACHER'
      }, {
        id: uuid(),
        name: '박민수',
        email: 'admin@education24.local',
        role: 'ADMIN'
      }, {
        id: uuid(),
        name: '이서연',
        email: 'teacher2@education24.local',
        role: 'TEACHER'
      }].map(user => ({
        ...user,
        passwordHash,
        status: 'ACTIVE',
        onboardingCompleted: true,
        phone: '',
        classIds: classes.map(c => c.id),
        preferences: {
          notificationEmail: true,
          notificationInApp: true
        }
      }));
      const names = ['김민준', '박서연', '이도윤', '정하린'];
      const students = classes.filter(c => c.schoolYear === year).flatMap(c => names.map((name, i) => ({
        id: uuid(),
        classId: c.id,
        schoolYear: year,
        name,
        number: i + 1
      })));
      const today = dateKey(now());
      const observations = students.slice(0, 4).map((student, i) => ({
        id: uuid(),
        studentId: student.id,
        classId: student.classId,
        schoolYear: year,
        observedAt: today,
        category: 'CLASS_ATTITUDE',
        content: ['모둠 활동에서 친구의 의견을 듣고 자신의 생각을 설명했어요.', '읽은 글의 핵심 내용을 문장으로 정리했어요.', '문제 풀이 과정을 차례대로 설명했어요.', '활동에 필요한 준비물을 스스로 챙겼어요.'][i],
        version: 1
      }));
      database = {
        school: {
          name: '한빛학교'
        },
        users,
        classes,
        students,
        observations,
        careers: [],
        records: [],
        versions: [],
        gates: {},
        transfers: [],
        invitations: [],
        resets: [],
        logs: [],
        notifications: users.map(user => ({
          id: uuid(),
          userId: user.id,
          title: '새 학기 수업 준비',
          message: '담당 학급과 시간표를 확인해 주세요.',
          type: 'NOTICE',
          read: false,
          createdAt: now().toISOString()
        })),
        timetables: classes.filter(c => c.schoolYear === year).flatMap((c, ci) => ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(dayOfWeek => ({
          id: uuid(),
          classId: c.id,
          teacherId: users[0].id,
          className: c.name,
          schoolYear: year,
          semester: now().getMonth() < 7 ? 1 : 2,
          dayOfWeek,
          period: ci + 1,
          subject: ['국어', '수학', '과학'][ci],
          room: `${c.grade}학년 교실`,
          version: 1
        })))
      };
      persist();
      return database;
    })();
    try {
      return await loading;
    } finally {
      loading = null;
    }
  }
  function persist() {
    storage?.setItem(STORE_KEY, JSON.stringify(database));
  }
  function userView(user) {
    const view = {
      ...user
    };
    delete view.passwordHash;
    return {
      ...view,
      school: database.school
    };
  }
  function page(values, q) {
    const size = Math.max(1, Math.min(100, Number(q.get('size')) || 20));
    const number = Math.max(1, Number(q.get('page')) || 1);
    return {
      data: values.slice((number - 1) * size, number * size),
      meta: {
        totalElements: values.length,
        totalPages: Math.max(1, Math.ceil(values.length / size)),
        page: number
      }
    };
  }
  const result = data => ({
    data: clone(data),
    meta: {}
  });
  async function handle(path, {
    method = 'GET',
    body = {},
    actorId
  } = {}) {
    const db = await load();
    const url = new URL(path, 'http://local.invalid');
    const p = url.pathname;
    const q = url.searchParams;
    const parts = p.split('/').filter(Boolean);
    const id = parts[1];
    const find = (key, value) => {
      const item = db[key].find(entry => entry.id === value);
      requireValue(item, '항목을 찾을 수 없어요.', 404);
      return item;
    };
    const checkPassword = () => requireValue(body.password?.length >= 8 && body.password === body.passwordConfirmation, '비밀번호를 8자 이상 입력하고 확인란을 맞춰 주세요.');
    const session = user => result({
      accessToken: user.id,
      refreshToken: user.id
    });
    if (p === '/auth/login') {
      const user = db.users.find(u => u.email.toLowerCase() === body.email?.trim().toLowerCase() && u.status === 'ACTIVE');
      requireValue(user && user.passwordHash === (await digest(body.password || '')), '이메일 또는 비밀번호가 일치하지 않아요.', 401);
      return session(user);
    }
    if (p === '/auth/refresh') {
      const user = find('users', body.refreshToken);
      requireValue(user.status === 'ACTIVE', '다시 로그인해 주세요.', 401);
      return session(user);
    }
    if (p === '/auth/password/forgot') {
      const user = db.users.find(u => u.email.toLowerCase() === body.email?.trim().toLowerCase());
      requireValue(user, '등록된 이메일을 확인해 주세요.');
      const token = uuid();
      db.resets.push({
        token,
        userId: user.id
      });
      persist();
      return result({
        resetPath: `/reset-password?token=${token}`
      });
    }
    if (p.startsWith('/auth/password/reset/')) {
      const reset = db.resets.find(r => r.token === parts[3]);
      requireValue(reset, '유효하지 않은 비밀번호 변경 링크예요.');
      if (method === 'GET') return result({
        email: find('users', reset.userId).email
      });
      checkPassword();
      find('users', reset.userId).passwordHash = await digest(body.password);
      db.resets = db.resets.filter(r => r !== reset);
      persist();
      return result({
        changed: true
      });
    }
    if (parts[0] === 'invitations') {
      const invite = db.invitations.find(i => i.token === id && !i.accepted);
      requireValue(invite, '유효한 초대 링크를 확인해 주세요.');
      if (method === 'GET') return result({
        email: invite.email,
        schoolName: db.school.name
      });
      checkPassword();
      requireValue(body.name?.trim() && body.termsAgreed, '이름과 이용약관 동의를 확인해 주세요.');
      db.users.push({
        id: uuid(),
        email: invite.email,
        name: body.name.trim(),
        role: invite.role,
        status: 'ACTIVE',
        classIds: invite.classIds,
        onboardingCompleted: false,
        passwordHash: await digest(body.password),
        preferences: {}
      });
      invite.accepted = true;
      persist();
      return result({
        accepted: true
      });
    }
    const user = db.users.find(u => u.id === actorId && u.status === 'ACTIVE');
    requireValue(user, '로그인해 주세요.', 401);
    const admin = user.role === 'ADMIN';
    if (p.startsWith('/admin/') || p.startsWith('/transfers')) requireValue(admin, '관리자만 이용할 수 있어요.', 403);
    const classAccess = value => {
      const c = find('classes', value);
      requireValue(admin || user.classIds.includes(c.id), '담당 학급을 확인해 주세요.', 403);
      return c;
    };
    const studentAccess = value => {
      const s = find('students', value);
      classAccess(s.classId);
      return s;
    };
    const save = (data, title = '정보 변경') => {
      db.logs.unshift({
        id: uuid(),
        actor: {
          id: user.id,
          name: user.name
        },
        action: method === 'DELETE' ? 'DELETE' : method === 'PATCH' ? 'UPDATE' : 'CREATE',
        resourceType: title,
        occurredAt: now().toISOString()
      });
      persist();
      return result(data);
    };
    if (p === '/me') return result(userView(user));
    if (p === '/auth/logout') return result(null);
    if (p === '/onboarding') {
      if (method === 'GET') return result({
        profile: {
          displayName: user.name,
          phone: user.phone
        },
        preferences: user.preferences
      });
      user.name = body.profile.displayName;
      user.phone = body.profile.phone;
      user.preferences = body.preferences;
      return save(userView(user));
    }
    if (p === '/onboarding/complete') {
      user.onboardingCompleted = true;
      return save(userView(user));
    }
    if (p === '/settings/profile') {
      if (method !== 'GET') {
        user.name = body.name.trim();
        user.phone = body.phone;
        return save({
          name: user.name,
          phone: user.phone
        });
      }
      return result({
        name: user.name,
        phone: user.phone
      });
    }
    if (p === '/settings/notifications') {
      if (method !== 'GET') {
        user.preferences = body;
        return save(body);
      }
      return result(user.preferences);
    }
    if (p === '/settings/school') {
      requireValue(admin, '관리자만 학교 정보를 변경할 수 있어요.', 403);
      if (method !== 'GET') {
        db.school.name = body.name.trim();
        return save(db.school);
      }
      return result(db.school);
    }
    if (p === '/settings/password/change') {
      requireValue(user.passwordHash === (await digest(body.currentPassword)), '현재 비밀번호가 일치하지 않아요.');
      requireValue(body.newPassword.length >= 8 && body.newPassword === body.passwordConfirmation, '새 비밀번호를 확인해 주세요.');
      user.passwordHash = await digest(body.newPassword);
      return save({
        changed: true
      });
    }
    if (p === '/classes') return page(db.classes.filter(c => (!q.get('schoolYear') || c.schoolYear === Number(q.get('schoolYear'))) && (admin || user.classIds.includes(c.id))), q);
    if (parts[0] === 'classes' && parts[2] === 'students') {
      classAccess(id);
      return page(db.students.filter(s => s.classId === id), q);
    }
    if (p === '/timetables') return page(db.timetables.filter(t => (!q.get('classId') || t.classId === q.get('classId')) && (!q.get('schoolYear') || t.schoolYear === Number(q.get('schoolYear'))) && (!q.get('semester') || t.semester === Number(q.get('semester'))) && (admin || t.teacherId === user.id)).sort((a, b) => a.period - b.period), q);
    if (p.startsWith('/notifications')) {
      const entries = db.notifications.filter(n => n.userId === user.id);
      if (p.endsWith('unread-count')) return result({
        count: entries.filter(n => !n.read).length
      });
      if (p.endsWith('read-all')) {
        entries.forEach(n => {
          n.read = true;
        });
        return save(null);
      }
      if (id) {
        const item = entries.find(n => n.id === id);
        requireValue(item, '알림을 찾을 수 없어요.', 404);
        if (method === 'DELETE') db.notifications = db.notifications.filter(n => n !== item);else item.read = true;
        return save(null);
      }
      return page(entries.filter(n => (!q.get('status') || !n.read) && (!q.get('type') || n.type === q.get('type'))), q);
    }
    if (parts[0] === 'students' && ['observations', 'career-records', 'record-items'].includes(parts[2])) {
      const student = studentAccess(id);
      const key = {
        observations: 'observations',
        'career-records': 'careers',
        'record-items': 'records'
      }[parts[2]];
      if (method === 'GET') return page(db[key].filter(r => r.studentId === id && (!q.get('schoolYear') || Number(r.schoolYear) === Number(q.get('schoolYear')))), q);
      requireValue(!admin, '교사 계정에서 작성해 주세요.', 403);
      if (key === 'observations') validateObservation(body);
      const item = {
        ...body,
        id: uuid(),
        studentId: id,
        classId: student.classId,
        schoolYear: Number(body.schoolYear || student.schoolYear),
        version: 1,
        createdAt: now().toISOString(),
        maxCharacterCount: key === 'records' ? 1500 : undefined
      };
      db[key].unshift(item);
      return save(item, '학생 기록');
    }
    if (parts[0] === 'classes' && parts[2] === 'observations') {
      classAccess(id);
      requireValue(!admin, '교사 계정에서 작성해 주세요.', 403);
      requireValue(body.items?.length, '학생을 선택해 주세요.');
      body.items.forEach(item => {
        requireValue(studentAccess(item.studentId).classId === id, '학급에 속한 학생을 선택해 주세요.');
        validateObservation({
          ...item,
          observedAt: body.observedAt
        });
      });
      if (parts[4] === 'validate') return result({
        valid: true
      });
      body.items.forEach(item => db.observations.unshift({
        ...item,
        id: uuid(),
        classId: id,
        schoolYear: classAccess(id).schoolYear,
        observedAt: body.observedAt,
        category: body.category,
        version: 1
      }));
      return save({
        count: body.items.length
      }, '일괄 관찰');
    }
    if (['observations', 'career-records', 'record-items'].includes(parts[0])) {
      const key = {
        observations: 'observations',
        'career-records': 'careers',
        'record-items': 'records'
      }[parts[0]];
      const item = find(key, id);
      studentAccess(item.studentId);
      if (parts.length === 2) {
        if (method === 'GET') return result(item);
        requireValue(!admin, '교사 계정에서 작성해 주세요.', 403);
        if (method === 'DELETE') {
          db[key] = db[key].filter(r => r !== item);
          return save(null, '학생 기록');
        }
        if (Number(body.version) !== item.version) throw new LocalError('최신 기록을 다시 확인해 주세요.', 409, 'VERSION_CONFLICT');
        if (key === 'observations') validateObservation(body);
        if (key === 'records') db.versions.unshift({
          ...clone(item),
          id: uuid(),
          recordId: item.id,
          createdAt: now().toISOString()
        });
        Object.assign(item, body, {
          version: item.version + 1,
          updatedAt: now().toISOString()
        });
        delete db.gates[id];
        return save(item, '학생 기록');
      }
      if (parts[2] === 'versions') {
        if (method === 'GET') return result(db.versions.filter(v => v.recordId === id));
        requireValue(!admin, '교사 계정에서 작성해 주세요.', 403);
        const version = find('versions', parts[3]);
        requireValue(version.recordId === id, '기록의 버전을 확인해 주세요.');
        item.content = version.content;
        item.version++;
        item.status = 'DRAFT';
        delete db.gates[id];
        return save(item);
      }
      // Only a text-length check is implemented locally; no server policy judgement is implied.
      if (parts[2] === 'gate-checks') {
        if (method === 'GET') {
          requireValue(db.gates[id], '아직 검사한 내용이 없어요.');
          return result(db.gates[id]);
        }
        const valid = !!item.content.trim() && item.content.length <= 1500;
        db.gates[id] = {
          status: valid ? 'PASS' : 'ERROR',
          version: item.version,
          ruleVersion: '글자 수',
          checkedAt: now().toISOString(),
          issues: valid ? [] : [{
            severity: 'ERROR',
            message: '1~1500자 이내로 내용을 작성해 주세요.'
          }]
        };
        return save(db.gates[id]);
      }
      if (parts[2] === 'submit') {
        requireValue(!admin && db.gates[id]?.status === 'PASS' && db.gates[id]?.version === item.version, '내용을 저장하고 글자 수를 확인해 주세요.');
        item.status = 'SUBMITTED';
        return save(item);
      }
    }
    if (parts[2] === 'record-board') {
      const students = parts[0] === 'classes' ? db.students.filter(s => s.classId === classAccess(id).id) : [studentAccess(id)];
      return result(students.map(s => ({
        name: s.name,
        recordCount: db.records.filter(r => r.studentId === s.id).length,
        completedCount: db.records.filter(r => r.studentId === s.id && r.status === 'SUBMITTED').length
      })));
    }
    if (p === '/gate-rules') return result([{
      title: '글자 수',
      content: '기록 내용을 1~1500자 이내로 작성해 주세요.'
    }]);
    if (parts[0] === 'transfers') {
      if (method === 'GET') return result(find('transfers', id));
      requireValue(body.source && body.target, '이관 대상을 확인해 주세요.');
      const source = classAccess(body.source.classId),
        target = classAccess(body.target.classId);
      requireValue(source.id !== target.id, '서로 다른 학급을 선택해 주세요.');
      requireValue(source.schoolYear === Number(body.source.schoolYear) && target.schoolYear === Number(body.target.schoolYear), '학년도와 학급을 확인해 주세요.');
      requireValue(body.studentIds?.length, '학생을 선택해 주세요.');
      body.studentIds.forEach(sid => requireValue(studentAccess(sid).classId === source.id, '이관할 학급의 학생을 선택해 주세요.'));
      if (id === 'preview') return result({
        valid: true,
        studentCount: body.studentIds.length,
        className: target.name,
        schoolYear: target.schoolYear
      });
      let count = 0;
      for (const sid of body.studentIds) {
        const student = find('students', sid);
        let destination = db.students.find(s => s.originId === sid && s.classId === target.id);
        if (!destination) {
          destination = {
            ...student,
            id: uuid(),
            originId: sid,
            classId: target.id,
            schoolYear: target.schoolYear,
            number: Math.max(0, ...db.students.filter(s => s.classId === target.id).map(s => s.number)) + 1
          };
          db.students.push(destination);
        }
        for (const key of ['observations', ...(body.include?.includes('CAREER_RECORDS') ? ['careers'] : [])]) for (const record of db[key].filter(r => r.studentId === sid)) {
          const existing = db[key].find(r => r.originId === record.id && r.studentId === destination.id);
          if (existing && body.conflictPolicy === 'SKIP') continue;
          if (existing && body.conflictPolicy === 'OVERWRITE') Object.assign(existing, record, {
            id: existing.id,
            originId: record.id,
            studentId: destination.id,
            classId: target.id,
            schoolYear: target.schoolYear
          });else db[key].push({
            ...record,
            id: uuid(),
            originId: record.id,
            studentId: destination.id,
            classId: target.id,
            schoolYear: target.schoolYear
          });
          count++;
        }
      }
      const transfer = {
        id: uuid(),
        status: 'COMPLETED',
        studentCount: body.studentIds.length,
        recordCount: count
      };
      db.transfers.push(transfer);
      return save(transfer, '학생 기록 이관');
    }
    if (p.startsWith('/admin/dashboard/')) {
      const year = Number(q.get('schoolYear'));
      const classes = db.classes.filter(c => c.schoolYear === year);
      if (parts[2] === 'summary') return result({
        teacherCount: db.users.filter(u => u.role === 'TEACHER').length,
        classCount: classes.length,
        studentCount: db.students.filter(s => classes.some(c => c.id === s.classId)).length,
        recordCompletionRate: db.records.length ? Math.round(db.records.filter(r => r.status === 'SUBMITTED').length / db.records.length * 100) : 0,
        pendingInvitations: db.invitations.filter(i => !i.accepted).length,
        gateFailureCount: Object.values(db.gates).filter(check => check.status === 'ERROR').length
      });
      if (parts[2] === 'completion') return result(classes.map(c => ({
        className: c.name,
        studentCount: db.students.filter(s => s.classId === c.id).length,
        recordCount: db.records.filter(r => r.classId === c.id).length
      })));
      return result(db.logs.slice(0, 5).map(log => ({
        name: log.actor.name,
        action: log.action,
        occurredAt: log.occurredAt
      })));
    }
    if (p.startsWith('/admin/teachers')) {
      if (parts[2] === 'invitations') {
        const inputs = parts[3] === 'bulk' ? body.invitations : parts[4] === 'resend' ? [find('invitations', parts[3])] : [body];
        const invites = inputs.map(input => {
          requireValue(input.email?.includes('@'), '이메일을 확인해 주세요.');
          requireValue(!db.users.some(u => u.email === input.email), '이미 등록된 이메일이에요.');
          return {
            ...input,
            id: uuid(),
            token: uuid(),
            role: input.role || 'TEACHER',
            classIds: input.classIds || [],
            accepted: false
          };
        });
        if (parts[4] === 'resend') db.invitations = db.invitations.filter(i => i.id !== parts[3]);
        db.invitations.push(...invites);
        const data = invites.map(i => ({
          email: i.email,
          invitationId: i.id,
          invitationUrl: `/#/invite?token=${i.token}`
        }));
        return save(parts[3] === 'bulk' ? {
          invitations: data
        } : data[0], '교사 초대');
      }
      if (!parts[2]) return page([...db.users.map(userView), ...db.invitations.filter(i => !i.accepted).map(i => ({
        ...i,
        token: undefined,
        invitationId: i.id,
        status: 'INVITED'
      }))].filter(u => !q.get('keyword') || `${u.name} ${u.email}`.includes(q.get('keyword'))), q);
      const teacher = find('users', parts[2]);
      if (method === 'GET') return result(userView(teacher));
      requireValue(teacher.id !== user.id || method === 'PATCH' && body.role === 'ADMIN' && !body.status, '자신의 관리자 권한은 유지해야 해요.');
      if (method === 'DELETE') teacher.status = 'INACTIVE';else Object.assign(teacher, body);
      return save(userView(teacher), '교사 계정');
    }
    if (parts[0] === 'admin' && parts[1] === 'classes') {
      if (parts[3] === 'students') {
        const c = classAccess(parts[2]);
        requireValue(!db.students.some(s => s.classId === c.id && s.number === body.number), '같은 출석 번호가 있어요.');
        const student = {
          ...body,
          id: uuid(),
          classId: c.id,
          schoolYear: c.schoolYear
        };
        db.students.push(student);
        return save(student, '학생 등록');
      }
      if (method === 'DELETE') {
        requireValue(!db.students.some(s => s.classId === parts[2]), '학생이 있는 학급은 먼저 명단을 정리해 주세요.');
        db.classes = db.classes.filter(c => c.id !== parts[2]);
        return save(null, '학급 삭제');
      }
      requireValue(Number.isInteger(body.grade) && body.grade >= 1 && body.grade <= 6 && Number.isInteger(body.classNumber) && body.classNumber >= 1 && body.classNumber <= 99, '학년과 반을 확인해 주세요.');
      requireValue(!db.classes.some(c => c.id !== parts[2] && c.schoolYear === Number(body.schoolYear) && c.grade === body.grade && c.classNumber === body.classNumber), '같은 학년과 반이 이미 있어요.');
      const entry = {
        ...body,
        schoolYear: Number(body.schoolYear),
        name: `${body.grade}학년 ${body.classNumber}반`
      };
      if (parts[2]) Object.assign(find('classes', parts[2]), entry);else {
        entry.id = uuid();
        db.classes.push(entry);
      }
      return save(entry, '학급 관리');
    }
    if (parts[0] === 'admin' && parts[1] === 'students') {
      const student = find('students', parts[2]);
      requireValue(!db.students.some(s => s.id !== student.id && s.classId === student.classId && s.number === body.number), '같은 출석 번호가 있어요.');
      Object.assign(student, body);
      return save(student, '학생 수정');
    }
    if (p.startsWith('/admin/timetables/entries')) {
      const entryId = parts[3];
      if (method === 'DELETE') {
        db.timetables = db.timetables.filter(t => t.id !== entryId);
        return save(null, '시간표 삭제');
      }
      const c = classAccess(body.classId);
      const teacher = find('users', body.teacherId);
      requireValue(teacher.role === 'TEACHER' && teacher.status === 'ACTIVE', '활성 교사 계정을 선택해 주세요.');
      requireValue(body.period >= 1 && body.period <= 9 && body.subject?.trim(), '교시와 과목을 확인해 주세요.');
      requireValue(!db.timetables.some(t => t.id !== entryId && t.schoolYear === Number(body.schoolYear) && t.semester === body.semester && t.dayOfWeek === body.dayOfWeek && t.period === body.period && (t.teacherId === body.teacherId || t.classId === body.classId)), '동일한 시간에 교사 또는 학급의 수업이 있어요.');
      const entry = {
        ...body,
        schoolYear: Number(body.schoolYear),
        className: c.name
      };
      if (entryId) Object.assign(find('timetables', entryId), entry);else {
        entry.id = uuid();
        db.timetables.push(entry);
      }
      return save(entry, '시간표 관리');
    }
    if (p.startsWith('/admin/audit-logs')) {
      if (parts[2]) return result(find('logs', parts[2]));
      return page(db.logs.filter(l => (!q.get('action') || l.action === q.get('action')) && (!q.get('actorId') || l.actor.id === q.get('actorId')) && (!q.get('from') || Date.parse(l.occurredAt) >= Date.parse(q.get('from'))) && (!q.get('to') || Date.parse(l.occurredAt) <= Date.parse(q.get('to')))), q);
    }
    throw new LocalError('이 기능은 현재 연결되어 있지 않아요.', 404, 'UNSUPPORTED_ACTION');
  }
  function validateObservation(body) {
    requireValue(!observationDateError(body.observedAt, dateKey(now())), '관찰 날짜는 올바른 오늘 또는 과거 날짜로 선택해 주세요.');
    requireValue(body.content?.trim() && body.content.length <= 2000, '관찰 내용을 1~2000자 이내로 작성해 주세요.');
  }
  return {
    handle,
    load
  };
}
