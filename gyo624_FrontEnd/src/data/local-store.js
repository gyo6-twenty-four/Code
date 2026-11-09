import { observationDateError } from '../lib/observations.js';
import { passwordError } from '../lib/passwords.js';
import { compareClassItems, compareStudents } from '../lib/classrooms.js';
import { elementarySchool, normalizeSchool, virtualStudentSchool } from '../lib/school.js';
import virtualStudentSeed from './virtual-student-seed.json' with { type: 'json' };
import { assignmentAfterSchoolChange, readTeaching, teachingError } from '../lib/teaching.js';
import { ALL_RECORD_TYPES, assignedRecordTypes, sanitizeRecordTypes } from '../api/model.js';
// Browser-only workspace. No HTTP requests or production credentials are used here.
const STORE_KEY = 'education24-ui-workspace-v1';
export const LOCAL_PASSWORD = 'Edu24!2026';
export const TEST_SCHOOL_ACCOUNT = {
  name: '테스트학교',
  email: 'school@education24.local',
  role: 'ADMIN'
};
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
function cleanRecordTypes(value) {
  const types = sanitizeRecordTypes(value) ?? [...ALL_RECORD_TYPES];
  requireValue(types.length, '작성할 생기부 유형을 하나 이상 선택해 주세요.');
  return types;
}
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(n => n.toString(16).padStart(2, '0')).join('');
function readSchool(value) {
  const nested = value?.school && typeof value.school === 'object' ? value.school : null;
  const source = nested || value || {};
  const school = normalizeSchool({
    name: nested ? nested.name || nested.schoolName : source.schoolName,
    schoolCode: source.schoolCode,
    officeCode: source.officeCode,
    officeName: source.officeName,
    kind: source.kind
  });
  return virtualStudentSchool(school) || school;
}
function writeSchool(school) {
  const next = normalizeSchool(school);
  return {
    schoolName: next.name,
    schoolCode: next.schoolCode,
    officeCode: next.officeCode,
    officeName: next.officeName,
    kind: next.kind
  };
}
function completeUser(user, passwordHash, classIds) {
  return {
    id: user.id || uuid(),
    name: user.name,
    email: user.email,
    role: user.role,
    passwordHash,
    status: 'ACTIVE',
    onboardingCompleted: true,
    phone: '',
    classIds: [...classIds],
    homeroomClassId: '',
    subjectIds: [],
    teachingClassIds: [],
    preferences: {
      notificationEmail: true,
      notificationInApp: true
    },
    recordTypes: [...ALL_RECORD_TYPES]
  };
}
async function ensureTestSchoolAccount(db) {
  if (!Array.isArray(db?.users) || db.users.some(user => user.email === TEST_SCHOOL_ACCOUNT.email)) return false;
  db.users.push(completeUser(TEST_SCHOOL_ACCOUNT, await digest(LOCAL_PASSWORD), (db.classes || []).map(c => c.id)));
  return true;
}
const DUMMY_STUDENT_NAMES = ['김민준', '박서연', '이도윤', '정하린', '최수아', '윤지호', '송성준', '홍소율', '이지환', '정원준', '안민지', '김서윤', '박다은', '강민서', '오준혁', '임하은', '장시우', '이현준', '김서현', '한지수', '신동현', '류수진', '문태양', '정승현', '배나리', '유서준', '고민지', '남다율', '백수현'];
const DEMO_YEAR = 2026;
const DEMO_CLASSES = [
  { grade: 1, classNumber: 1 },
  { grade: 1, classNumber: 2 },
  { grade: 2, classNumber: 1 },
  { grade: 2, classNumber: 2 },
  { grade: 3, classNumber: 1 },
];
const DEMO_STUDENTS_PER_CLASS = [
  ['김민준', '박서연', '이도윤', '정하린', '최수아', '윤지호'],
  ['송성준', '홍소율', '이지환', '정원준', '안민지', '김서윤'],
  ['박다은', '강민서', '오준혁', '임하은', '장시우', '한지수'],
  ['이현준', '김서현', '신동현', '류수진', '문태양', '정승현'],
  ['배나리', '유서준', '고민지', '남다율', '백수현', '안도율'],
];
function buildDemoData(classIds) {
  const classes = [];
  const students = [];
  DEMO_CLASSES.forEach(({ grade, classNumber }, ci) => {
    const classId = classIds[ci];
    classes.push({ id: classId, name: `${grade}학년 ${classNumber}반`, grade, classNumber, schoolYear: DEMO_YEAR });
    DEMO_STUDENTS_PER_CLASS[ci].forEach((name, si) => {
      students.push({ id: uuid(), name, number: si + 1, classId, schoolYear: DEMO_YEAR });
    });
  });
  return { classes, students };
}
function removeSeededDemo(db) {
  let changed = false;
  const schoolWasDemo = db.school?.name === '한빛학교';
  if (schoolWasDemo) {
    db.school.name = '';
    changed = true;
  }
  if (Array.isArray(db.notifications)) {
    const notifications = db.notifications.filter(item => item.title !== '새 학기 수업 준비' || item.message !== '담당 학급과 시간표를 확인해 주세요.');
    if (notifications.length !== db.notifications.length) {
      db.notifications = notifications;
      changed = true;
    }
  }
  const classes = Array.isArray(db.classes) ? db.classes : [];
  const students = Array.isArray(db.students) ? db.students : [];
  const removedStudents = new Set();
  const removedClasses = new Set();
  for (const entry of classes) {
    if (![1, 2, 3].includes(entry.grade) || entry.classNumber !== 1 || entry.name !== `${entry.grade}학년 1반`) continue;
    const members = students.filter(student => student.classId === entry.id);
    const dummy = members.filter(student => DUMMY_STUDENT_NAMES.includes(student.name));
    dummy.forEach(student => removedStudents.add(student.id));
    if (members.length === dummy.length && (dummy.length > 0 || schoolWasDemo)) removedClasses.add(entry.id);
  }
  if (!removedStudents.size && !removedClasses.size) return changed;
  const removedRecords = new Set();
  for (const key of ['observations', 'careers', 'records']) {
    for (const item of db[key] || []) if (removedStudents.has(item.studentId) || removedClasses.has(item.classId)) removedRecords.add(item.id);
    db[key] = (db[key] || []).filter(item => !removedStudents.has(item.studentId) && !removedClasses.has(item.classId));
  }
  db.students = students.filter(student => !removedStudents.has(student.id) && !removedClasses.has(student.classId));
  db.classes = classes.filter(entry => !removedClasses.has(entry.id));
  db.timetables = (db.timetables || []).filter(item => !removedClasses.has(item.classId));
  db.versions = (db.versions || []).filter(item => !removedRecords.has(item.recordId));
  for (const id of removedRecords) delete db.gates?.[id];
  for (const user of db.users || []) if (Array.isArray(user.classIds)) user.classIds = user.classIds.filter(id => !removedClasses.has(id));
  return true;
}
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function createLocalStore({
  storage,
  now = () => new Date(),
  seedDemo = true
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
        if (removeSeededDemo(database) || (await ensureTestSchoolAccount(database))) persist();
        return database;
      }
      const passwordHash = await digest(LOCAL_PASSWORD);
      let demoClasses = [];
      let demoStudents = [];
      let teacher1ClassIds = [];
      let teacher2ClassIds = [];
      let allClassIds = [];
      if (seedDemo) {
        // 데모용 학급 ID를 미리 생성해서 교사 classIds에 할당
        const demoClassIds = DEMO_CLASSES.map(() => uuid());
        ({ classes: demoClasses, students: demoStudents } = buildDemoData(demoClassIds));
        // 교사1: 1학년 1반, 1학년 2반 / 교사2: 2학년 1반, 2학년 2반 / 관리자: 전체
        teacher1ClassIds = [demoClassIds[0], demoClassIds[1]];
        teacher2ClassIds = [demoClassIds[2], demoClassIds[3]];
        allClassIds = [...demoClassIds];
      }
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
      }, TEST_SCHOOL_ACCOUNT].map((user, index) => {
        const classIds = !seedDemo ? [] :
          user.role === 'ADMIN' || user.email === TEST_SCHOOL_ACCOUNT.email
            ? allClassIds
            : index === 0 ? teacher1ClassIds : index === 2 ? teacher2ClassIds : allClassIds;
        return completeUser(user, passwordHash, classIds);
      });
      database = {
        school: {
          name: ''
        },
        users,
        classes: demoClasses,
        students: demoStudents,
        observations: [],
        careers: [],
        records: [],
        versions: [],
        gates: {},
        transfers: [],
        invitations: [],
        resets: [],
        logs: [],
        notifications: [],
        timetables: []
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
  function accountSchool(user) {
    return readSchool({
      schoolName: user?.schoolName || user?.school?.name,
      schoolCode: user?.schoolCode || user?.school?.schoolCode,
      officeCode: user?.officeCode || user?.school?.officeCode,
      officeName: user?.officeName || user?.school?.officeName,
      kind: user?.kind || user?.school?.kind
    });
  }
  function virtualRosterKey(school, schoolYear) {
    return `gsm:${school.schoolCode}:${Number(schoolYear)}:`;
  }
  function virtualStudentPlacements() {
    return virtualStudentSeed.flatMap(row => {
      const match = /^(\d+)학년\s+(\d+)반\s+(\d+)번$/.exec(String(row.internalIdentifier || '').trim());
      const name = String(row.realName || '').trim();
      if (!match || !name) return [];
      return [{
        sourceId: row.id,
        name,
        grade: Number(match[1]),
        classNumber: Number(match[2]),
        number: Number(match[3])
      }];
    });
  }
  function ensureVirtualStudents(db, extraSchool, schoolYear) {
    const year = Number(schoolYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return false;
    const schools = new Map();
    const add = school => {
      const next = virtualStudentSchool(school);
      if (!next?.schoolCode) return;
      schools.set(next.schoolCode, next);
    };
    add(extraSchool);
    for (const user of db.users || []) add(accountSchool(user));
    for (const invite of db.invitations || []) add(readSchool(invite));
    for (const classroom of db.classes || []) add(readSchool(classroom));
    if (!schools.size) return false;
    const placements = virtualStudentPlacements();
    let changed = false;
    for (const school of schools.values()) {
      const prefix = virtualRosterKey(school, year);
      const schoolFields = writeSchool(school);
      const classIds = new Map();
      for (const place of placements) {
        const classId = `${prefix}${place.grade}-${place.classNumber}`;
        if (!classIds.has(classId)) {
          classIds.set(classId, {
            id: classId,
            name: `${place.grade}학년 ${place.classNumber}반`,
            grade: place.grade,
            classNumber: place.classNumber,
            schoolYear: year,
            ...schoolFields
          });
        }
      }
      const classes = db.classes || (db.classes = []);
      for (const classroom of classIds.values()) {
        const current = classes.find(item => item.id === classroom.id);
        if (!current) {
          classes.push(classroom);
          changed = true;
          continue;
        }
        if (current.schoolName !== classroom.schoolName || current.name !== classroom.name) {
          Object.assign(current, classroom);
          changed = true;
        }
      }
      const students = db.students || (db.students = []);
      const ids = new Set(students.map(item => item.id));
      for (const place of placements) {
        const student = {
          id: `${prefix}${place.sourceId}`,
          name: place.name,
          number: place.number,
          classId: `${prefix}${place.grade}-${place.classNumber}`,
          schoolYear: year,
          schoolCode: school.schoolCode,
          grade: place.grade,
          classNumber: place.classNumber
        };
        if (ids.has(student.id)) continue;
        students.push(student);
        ids.add(student.id);
        changed = true;
      }
    }
    if (changed) persist();
    return changed;
  }
  function userView(user) {
    const view = {
      ...user
    };
    delete view.passwordHash;
    return {
      ...view,
      school: accountSchool(user),
      homeroomClassId: String(user.homeroomClassId || ''),
      subjectIds: Array.isArray(user.subjectIds) ? [...user.subjectIds] : [],
      teachingClassIds: Array.isArray(user.teachingClassIds) ? [...user.teachingClassIds] : [],
      classIds: Array.isArray(user.classIds) ? [...user.classIds] : []
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
    actorId,
    virtualSchool = null,
    seedVirtualStudents = true
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
    const checkPassword = () => {
      const issue = passwordError(String(body.password || ''), String(body.passwordConfirmation || ''));
      requireValue(!issue, issue);
    };
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
      if (!user) return result({
        sent: true,
        message: '등록된 이메일이면 비밀번호를 다시 설정할 수 있어요.'
      });
      const token = uuid();
      db.resets.push({
        token,
        userId: user.id
      });
      persist();
      return result({
        sent: true,
        message: '이 브라우저에서 새 비밀번호를 설정할 수 있어요.',
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
        schoolName: invite.schoolName || '',
        schoolCode: invite.schoolCode || '',
        name: invite.name
      });
      checkPassword();
      requireValue(body.name?.trim() && body.termsAgreed, '이름과 이용약관 동의를 확인해 주세요.');
      const school = readSchool(invite);
      db.users.push({
        id: uuid(),
        email: invite.email,
        name: body.name.trim(),
        role: invite.role,
        status: 'ACTIVE',
        classIds: invite.classIds,
        homeroomClassId: '',
        subjectIds: [],
        teachingClassIds: [],
        ...writeSchool(school),
        recordTypes: sanitizeRecordTypes(invite.recordTypes)?.length ? sanitizeRecordTypes(invite.recordTypes) : [...ALL_RECORD_TYPES],
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
    if (method === 'GET' && seedVirtualStudents) ensureVirtualStudents(db, virtualSchool, new URL(path, 'http://local.invalid').searchParams.get('schoolYear'));
    if (p.startsWith('/admin/') || p.startsWith('/transfers')) requireValue(admin, '관리자만 이용할 수 있어요.', 403);
    const classAccess = value => find('classes', value);
    const studentAccess = value => {
      const s = find('students', value);
      const stored = db.classes.find(item => item.id === s.classId);
      if (stored) classAccess(s.classId);
      return s;
    };
    const linkedSchoolCode = data => {
      const direct = readSchool(data).schoolCode;
      if (direct) return direct;
      const classId = data?.classId;
      if (classId) {
        const code = readSchool(db.classes.find(item => item.id === classId)).schoolCode;
        if (code) return code;
      }
      if (data?.studentId) {
        const student = db.students.find(item => item.id === data.studentId);
        const code = student ? readSchool(db.classes.find(item => item.id === student.classId)).schoolCode : '';
        if (code) return code;
      }
      return '';
    };
    const save = (data, title = '정보 변경', schoolCode = '') => {
      db.logs.unshift({
        id: uuid(),
        actor: {
          id: user.id,
          name: user.name
        },
        action: method === 'DELETE' ? 'DELETE' : method === 'PATCH' ? 'UPDATE' : 'CREATE',
        resourceType: title,
        occurredAt: now().toISOString(),
        schoolCode: String(schoolCode || linkedSchoolCode(data) || '').trim().toUpperCase()
      });
      persist();
      return result(data);
    };
    const logSchoolCode = log => String(log?.schoolCode || '').trim().toUpperCase() || readSchool(db.users.find(item => item.id === log?.actor?.id)).schoolCode;
    const presentLog = log => {
      const schoolCode = logSchoolCode(log);
      const named = [...db.users.map(readSchool), ...db.classes.map(readSchool), ...db.invitations.map(readSchool)].find(school => school.schoolCode === schoolCode && school.name);
      return {
        ...log,
        schoolCode,
        schoolName: named?.name || ''
      };
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
      if (user.role === 'TEACHER') {
        requireValue(accountSchool(user).schoolCode, '학교를 선택해 주세요.');
        const issue = teachingError(readTeaching(user));
        requireValue(!issue, issue);
      }
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
      requireValue(user.role === 'TEACHER', '학교는 교사 계정에서 등록해요.', 403);
      if (method !== 'GET') {
        const next = normalizeSchool(body);
        requireValue(next.name && next.schoolCode && next.officeCode, '학교 이름과 학교 코드를 확인해 주세요.');
        requireValue(!elementarySchool(next), '중학교와 고등학교만 연결할 수 있어요.');
        const teaching = assignmentAfterSchoolChange(accountSchool(user), next, user);
        user.schoolName = next.name;
        user.schoolCode = next.schoolCode;
        user.officeCode = next.officeCode;
        user.officeName = next.officeName;
        user.kind = next.kind;
        user.homeroomClassId = teaching.homeroomClassId;
        user.teachingClassIds = teaching.teachingClassIds;
        user.subjectIds = teaching.subjectIds;
        return save(accountSchool(user));
      }
      return result(accountSchool(user));
    }
    if (p === '/settings/teaching') {
      requireValue(user.role === 'TEACHER', '담당 수업은 교사 계정에서 등록해요.', 403);
      if (method === 'GET') return result(readTeaching(user));
      const next = readTeaching(body);
      const issue = teachingError(next);
      requireValue(!issue, issue);
      user.homeroomClassId = next.homeroomClassId;
      user.subjectIds = next.subjectIds;
      user.teachingClassIds = next.teachingClassIds;
      return save(next);
    }
    if (p === '/settings/password/change') {
      requireValue(user.passwordHash === (await digest(body.currentPassword)), '현재 비밀번호가 일치하지 않아요.');
      const nextPassword = passwordError(String(body.newPassword || ''), String(body.passwordConfirmation || ''));
      requireValue(!nextPassword, nextPassword);
      user.passwordHash = await digest(body.newPassword);
      return save({
        changed: true
      });
    }
    const requestedYear = q.get('schoolYear') || body.schoolYear;
    const matchesYear = item => !requestedYear || item.schoolYear == null || Number(item.schoolYear) === Number(requestedYear);
    const neisClass = value => {
      if (!String(value).startsWith('neis:')) return null;
      const body = String(value).slice(5);
      const split = body.indexOf(':');
      if (split <= 0) return null;
      const grade = Number(body.slice(0, split));
      const classLabel = body.slice(split + 1);
      if (!Number.isInteger(grade) || grade < 1 || !classLabel) return null;
      return {
        id: String(value),
        grade,
        classNumber: classLabel,
        classLabel,
        name: String(classLabel).endsWith('반') ? `${grade}학년 ${classLabel}` : `${grade}학년 ${classLabel}반`,
        schoolYear: requestedYear ? Number(requestedYear) : undefined
      };
    };
    const classNumberOf = item => Number(String(item?.classNumber ?? item?.classLabel ?? '').replace(/\D/g, ''));
    const wantedSchool = (q.get('schoolCode') || '').trim().toUpperCase();
    const rosterSchoolCode = wantedSchool || accountSchool(user).schoolCode || readSchool(virtualSchool).schoolCode;
    const studentsIn = classroom => {
      const number = classNumberOf(classroom);
      const grade = Number(classroom.grade);
      return db.students.filter(student => {
        if (student.classId === classroom.id) return true;
        const studentNumber = classNumberOf(student);
        const studentGrade = Number(student.grade);
        const studentCode = String(student.schoolCode || '').toUpperCase();
        if (studentGrade === grade && studentNumber === number && number > 0) {
          if (requestedYear && student.schoolYear != null && Number(student.schoolYear) !== Number(requestedYear)) return false;
          if (studentCode && rosterSchoolCode) return studentCode === rosterSchoolCode;
        }
        const stored = db.classes.find(item => item.id === student.classId);
        if (!stored || Number(stored.grade) !== grade || classNumberOf(stored) !== number || number <= 0) return false;
        const classCode = readSchool(stored).schoolCode;
        if (String(stored.id).startsWith('gsm:')) return Boolean(rosterSchoolCode) && rosterSchoolCode === classCode;
        const actorCode = accountSchool(user).schoolCode || readSchool(virtualSchool).schoolCode;
        return !actorCode || !classCode || actorCode === classCode;
      });
    };
    if (p === '/classes') {
      const virtualContext = virtualStudentSchool(virtualSchool) || virtualStudentSchool(accountSchool(user));
      const virtualCode = wantedSchool || virtualContext?.schoolCode || '';
      return page(db.classes.filter(item => {
        if (!matchesYear(item)) return false;
        const schoolCode = readSchool(item).schoolCode;
        if (wantedSchool && schoolCode && schoolCode !== wantedSchool) return false;
        const fromFirebase = String(item.id).startsWith('gsm:');
        if (virtualContext && (!schoolCode || schoolCode === virtualCode)) return fromFirebase;
        if (!admin && String(item.id).startsWith('gsm:')) return schoolCode && schoolCode === accountSchool(user).schoolCode;
        return true;
      }).sort(compareClassItems), q);
    }
    if (parts[0] === 'classes' && parts[2] === 'students') {
      const catalog = neisClass(id);
      if (catalog) return page([...studentsIn(catalog)].sort(compareStudents), q);
      return page([...studentsIn(classAccess(id))].sort(compareStudents), q);
    }
    if (p === '/timetables') return page(db.timetables.filter(t => {
      if (q.get('schoolYear') && t.schoolYear !== Number(q.get('schoolYear'))) return false;
      if (q.get('semester') && t.semester !== Number(q.get('semester'))) return false;
      if (wantedSchool && readSchool(db.classes.find(item => item.id === t.classId)).schoolCode !== wantedSchool) return false;
      if (q.get('classId')) return t.classId === q.get('classId');
      if (q.get('teacherId')) return t.teacherId === q.get('teacherId');
      return admin || t.teacherId === user.id;
    }).sort((a, b) => a.period - b.period), q);
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
      const student = studentAccess(id, { school: parts[2] === 'record-items' });
      const key = {
        observations: 'observations',
        'career-records': 'careers',
        'record-items': 'records'
      }[parts[2]];
      if (method === 'GET') return page(db[key].filter(r => r.studentId === id && (!q.get('schoolYear') || Number(r.schoolYear) === Number(q.get('schoolYear')))), q);
      requireValue(!admin, '교사 계정에서 작성해 주세요.', 403);
      if (key === 'records') requireValue(assignedRecordTypes(user).includes(body.type), '이 계정에 허용되지 않은 생기부 유형이에요.', 403);
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
      delete item.tags;
      delete item.tagIds;
      delete item.visibility;
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
      studentAccess(item.studentId, { school: key === 'records' });
      if (parts.length === 2) {
        if (method === 'GET') return result(item);
        requireValue(!admin, '교사 계정에서 작성해 주세요.', 403);
        if (method === 'DELETE') {
          db[key] = db[key].filter(r => r !== item);
          return save(null, '학생 기록');
        }
        if (Number(body.version) !== item.version) throw new LocalError('최신 기록을 다시 확인해 주세요.', 409, 'VERSION_CONFLICT');
        if (key === 'observations') {
          validateObservation(body);
          delete body.tags;
          delete body.tagIds;
          delete body.visibility;
        }
        if (key === 'records') {
          requireValue(assignedRecordTypes(user).includes(body.type || item.type), '이 계정에 허용되지 않은 생기부 유형이에요.', 403);
          db.versions.unshift({
            ...clone(item),
            id: uuid(),
            recordId: item.id,
            createdAt: now().toISOString()
          });
        }
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
      const catalog = parts[0] === 'classes' ? neisClass(id) : null;
      const students = catalog ? studentsIn(catalog) : parts[0] === 'classes' ? db.students.filter(s => s.classId === classAccess(id).id) : [studentAccess(id)];
      return result([...students].sort(compareStudents).map(s => ({
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
    if (p === '/admin/schools' || p.startsWith('/admin/dashboard/')) {
      const year = Number(q.get('schoolYear'));
      const schoolMatches = school => !wantedSchool || school.schoolCode === wantedSchool;
      if (p === '/admin/schools') {
        const map = new Map();
        const ensure = school => {
          if (!school.schoolCode) return null;
          if (!map.has(school.schoolCode)) map.set(school.schoolCode, {
            ...school,
            teacherCount: 0,
            pendingInvitations: 0,
            classCount: 0,
            studentCount: 0
          });else {
            const current = map.get(school.schoolCode);
            if (!current.name && school.name) current.name = school.name;
            if (!current.officeName && school.officeName) current.officeName = school.officeName;
            if (!current.officeCode && school.officeCode) current.officeCode = school.officeCode;
            if (!current.kind && school.kind) current.kind = school.kind;
          }
          return map.get(school.schoolCode);
        };
        for (const person of db.users) {
          if (person.status === 'DELETED' || person.role !== 'TEACHER') continue;
          const row = ensure(accountSchool(person));
          if (row) row.teacherCount += 1;
        }
        for (const invite of db.invitations) {
          if (invite.accepted) continue;
          const row = ensure(readSchool(invite));
          if (row) row.pendingInvitations += 1;
        }
        for (const classroom of db.classes) {
          if (year && Number(classroom.schoolYear) !== year) continue;
          const row = ensure(readSchool(classroom));
          if (!row) continue;
          row.classCount += 1;
          row.studentCount += db.students.filter(student => student.classId === classroom.id).length;
        }
        return result([...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko')));
      }
      const classes = db.classes.filter(c => c.schoolYear === year && schoolMatches(readSchool(c)));
      const classIds = new Set(classes.map(c => c.id));
      const inSchool = item => !wantedSchool || classIds.has(item.classId);
      if (parts[2] === 'summary') {
        const records = wantedSchool ? db.records.filter(inSchool) : db.records;
        return result({
          teacherCount: db.users.filter(u => u.role === 'TEACHER' && u.status !== 'DELETED' && schoolMatches(accountSchool(u))).length,
          classCount: classes.length,
          studentCount: db.students.filter(s => classes.some(c => c.id === s.classId)).length,
          recordCompletionRate: records.length ? Math.round(records.filter(r => r.status === 'SUBMITTED').length / records.length * 100) : 0,
          pendingInvitations: db.invitations.filter(i => !i.accepted && schoolMatches(readSchool(i))).length,
          gateFailureCount: Object.values(db.gates).filter(check => check.status === 'ERROR').length
        });
      }
      if (parts[2] === 'completion') return result(classes.map(c => ({
        className: wantedSchool ? c.name : `${readSchool(c).name || '학교 미지정'} · ${c.name}`,
        schoolName: readSchool(c).name,
        studentCount: db.students.filter(s => s.classId === c.id).length,
        recordCount: db.records.filter(r => r.classId === c.id).length,
        completedCount: db.records.filter(r => r.classId === c.id && r.status === 'SUBMITTED').length
      })));
      if (parts[2] === 'usage') return result(Array.from({ length: 12 }, (_, index) => {
        const month = `${year}-${String(index + 1).padStart(2, '0')}`;
        const observations = db.observations.filter(item => item.schoolYear === year && String(item.observedAt || '').startsWith(month) && inSchool(item)).length;
        const records = db.records.filter(item => Number(item.schoolYear) === year && String(item.updatedAt || item.createdAt || '').startsWith(month) && inSchool(item)).length;
        const careers = db.careers.filter(item => Number(item.schoolYear) === year && String(item.activityDate || '').startsWith(month) && inSchool(item)).length;
        return { month, observations, records, careers, total: observations + records + careers };
      }));
      return result(db.logs.filter(log => !wantedSchool || logSchoolCode(log) === wantedSchool).slice(0, 5).map(log => ({
        name: log.actor.name,
        action: log.action,
        occurredAt: log.occurredAt,
        schoolName: presentLog(log).schoolName
      })));
    }
    if (p.startsWith('/admin/teachers')) {
      if (parts[2] === 'invitations') {
        const inputs = parts[3] === 'bulk' ? body.invitations : parts[4] === 'resend' ? [find('invitations', parts[3])] : [body];
        const invites = inputs.map(input => {
          requireValue(input.email?.includes('@'), '이메일을 확인해 주세요.');
          const existing = db.users.find(u => u.email === input.email);
          requireValue(!existing, existing?.status === 'DELETED' ? '삭제한 계정의 이메일이에요. 같은 이메일로는 다시 가입할 수 없어요.' : '이미 등록된 이메일이에요.');
          const school = readSchool(input);
          if (school.schoolCode) requireValue(!elementarySchool(school), '중학교와 고등학교만 연결할 수 있어요.');
          return {
            ...input,
            id: uuid(),
            token: uuid(),
            role: input.role || 'TEACHER',
            classIds: input.classIds || [],
            recordTypes: cleanRecordTypes(input.recordTypes),
            ...writeSchool(school),
            accepted: false
          };
        });
        if (parts[4] === 'resend') db.invitations = db.invitations.filter(i => i.id !== parts[3]);
        db.invitations.push(...invites);
        const data = invites.map(i => ({
          email: i.email,
          invitationId: i.id,
          invitationUrl: `/invite?token=${i.token}`
        }));
        return save(parts[3] === 'bulk' ? {
          invitations: data
        } : data[0], '교사 초대', readSchool(invites[0]).schoolCode);
      }
      if (!parts[2]) return page([...db.users.filter(u => u.status !== 'DELETED').map(userView), ...db.invitations.filter(i => !i.accepted).map(i => ({
        ...i,
        token: undefined,
        invitationId: i.id,
        status: 'INVITED',
        school: readSchool(i)
      }))].filter(u => (!q.get('keyword') || `${u.name} ${u.email}`.includes(q.get('keyword'))) && (!wantedSchool || readSchool(u).schoolCode === wantedSchool)), q);
      if (method === 'DELETE') {
        const invite = db.invitations.find(i => i.id === parts[2] && !i.accepted);
        if (invite) {
          db.invitations = db.invitations.filter(i => i.id !== invite.id);
          return save(null, '교사 초대 취소', readSchool(invite).schoolCode);
        }
        const teacher = find('users', parts[2]);
        requireValue(teacher.id !== user.id, '자신의 계정은 삭제할 수 없어요.');
        requireValue(teacher.status !== 'DELETED', '이미 삭제된 계정이에요.');
        const activeAdmins = db.users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
        requireValue(!(teacher.role === 'ADMIN' && teacher.status === 'ACTIVE' && activeAdmins.length <= 1), '마지막 관리자 계정은 삭제할 수 없어요.');
        teacher.status = 'DELETED';
        db.timetables = db.timetables.filter(t => t.teacherId !== teacher.id);
        return save(null, '교사 계정 삭제', accountSchool(teacher).schoolCode);
      }
      const teacher = find('users', parts[2]);
      if (method === 'GET') return result(userView(teacher));
      requireValue(teacher.status !== 'DELETED', '이미 삭제된 계정이에요.');
      requireValue(teacher.id !== user.id || method === 'PATCH' && body.role === 'ADMIN' && !body.status, '자신의 관리자 권한은 유지해야 해요.');
      if (body.recordTypes !== undefined) body.recordTypes = cleanRecordTypes(body.recordTypes);
      Object.assign(teacher, body);
      return save(userView(teacher), '교사 계정');
    }
    if (parts[0] === 'admin' && parts[1] === 'classes') {
      if (parts[3] === 'students') {
        const classId = decodeURIComponent(parts[2] || '');
        const catalog = neisClass(classId);
        const c = catalog || classAccess(classId);
        const school = readSchool(c).schoolCode ? readSchool(c) : readSchool(body.school || virtualSchool);
        const grade = Number(c.grade);
        const classNumber = classNumberOf(c);
        const schoolYear = Number(c.schoolYear || body.schoolYear);
        if (school.schoolCode) {
          requireValue(!db.students.some(s => Number(s.number) === Number(body.number) && Number(s.grade) === grade && classNumberOf(s) === classNumber && String(s.schoolCode || '').toUpperCase() === school.schoolCode), '같은 출석 번호가 있어요.');
        } else {
          requireValue(!catalog, '학급의 학교를 확인해 주세요.');
          requireValue(!db.students.some(s => s.classId === c.id && s.number === body.number), '같은 출석 번호가 있어요.');
        }
        const storedClassId = school.schoolCode && virtualStudentSchool(school) && Number.isInteger(schoolYear)
          ? `gsm:${school.schoolCode}:${schoolYear}:${grade}-${classNumber}`
          : c.id;
        const student = {
          name: body.name,
          number: Number(body.number),
          id: uuid(),
          classId: storedClassId,
          schoolYear,
          schoolCode: school.schoolCode,
          grade,
          classNumber
        };
        db.students.push(student);
        return save(student, '학생 등록', school.schoolCode);
      }
      if (method === 'DELETE') {
        const current = find('classes', parts[2]);
        requireValue(!db.students.some(s => s.classId === parts[2]), '학생이 있는 학급은 먼저 명단을 정리해 주세요.');
        db.classes = db.classes.filter(c => c.id !== parts[2]);
        return save(null, '학급 삭제', readSchool(current).schoolCode);
      }
      const explicitSchool = Boolean(body.school || body.schoolCode || body.schoolName);
      const existing = parts[2] ? find('classes', parts[2]) : null;
      const school = explicitSchool ? readSchool(body) : readSchool(existing || {});
      if (school.schoolCode) requireValue(!elementarySchool(school), '중학교와 고등학교만 연결할 수 있어요.');
      requireValue(Number.isInteger(body.grade) && body.grade >= 1 && body.grade <= 6 && Number.isInteger(body.classNumber) && body.classNumber >= 1 && body.classNumber <= 99, '학년과 반을 확인해 주세요.');
      requireValue(!db.classes.some(c => c.id !== parts[2] && c.schoolYear === Number(body.schoolYear) && c.grade === body.grade && c.classNumber === body.classNumber && readSchool(c).schoolCode === school.schoolCode), '같은 학년과 반이 이미 있어요.');
      const classBody = { ...body };
      delete classBody.school;
      const entry = {
        ...classBody,
        ...writeSchool(school),
        schoolYear: Number(body.schoolYear),
        name: `${body.grade}학년 ${body.classNumber}반`
      };
      if (parts[2]) Object.assign(find('classes', parts[2]), entry);else {
        entry.id = virtualStudentSchool(school)
          ? `gsm:${school.schoolCode}:${Number(body.schoolYear)}:${body.grade}-${body.classNumber}`
          : uuid();
        db.classes.push(entry);
      }
      return save(entry, '학급 관리', school.schoolCode);
    }
    if (parts[0] === 'admin' && parts[1] === 'students') {
      const student = find('students', decodeURIComponent(parts[2] || ''));
      if (method === 'DELETE') {
        db.students = db.students.filter(item => item.id !== student.id);
        return save(null, '학생 삭제', student.schoolCode || readSchool(db.classes.find(item => item.id === student.classId)).schoolCode);
      }
      requireValue(!db.students.some(s => s.id !== student.id && s.classId === student.classId && s.number === body.number), '같은 출석 번호가 있어요.');
      Object.assign(student, body);
      if (!student.schoolCode) student.schoolCode = readSchool(db.classes.find(item => item.id === student.classId)).schoolCode;
      return save(student, '학생 수정', readSchool(db.classes.find(item => item.id === student.classId)).schoolCode);
    }
    if (p.startsWith('/admin/timetables/entries')) {
      const entryId = parts[3];
      if (method === 'DELETE') {
        const current = db.timetables.find(t => t.id === entryId);
        db.timetables = db.timetables.filter(t => t.id !== entryId);
        return save(null, '시간표 삭제', readSchool(db.classes.find(item => item.id === current?.classId)).schoolCode);
      }
      const c = classAccess(body.classId);
      const teacher = find('users', body.teacherId);
      requireValue(teacher.role === 'TEACHER' && teacher.status === 'ACTIVE', '활성 교사 계정을 선택해 주세요.');
      const classCode = readSchool(c).schoolCode;
      const teacherCode = accountSchool(teacher).schoolCode;
      requireValue(!classCode || !teacherCode || classCode === teacherCode, '이 학급과 교사의 학교가 달라요.');
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
      return save(entry, '시간표 관리', readSchool(c).schoolCode);
    }
    if (p.startsWith('/admin/audit-logs')) {
      if (parts[2]) return result(presentLog(find('logs', parts[2])));
      return page(db.logs.filter(l => (!q.get('action') || l.action === q.get('action')) && (!q.get('actorId') || l.actor.id === q.get('actorId')) && (!q.get('from') || Date.parse(l.occurredAt) >= Date.parse(q.get('from'))) && (!q.get('to') || Date.parse(l.occurredAt) <= Date.parse(q.get('to'))) && (!wantedSchool || logSchoolCode(l) === wantedSchool)).map(presentLog), q);
    }
    throw new LocalError('이 기능은 현재 연결되어 있지 않아요.', 404, 'UNSUPPORTED_ACTION');
  }
  function validateObservation(body) {
    requireValue(!observationDateError(body.observedAt, dateKey(now())), '관찰 날짜는 올바른 오늘 또는 과거 날짜로 선택해 주세요.');
    requireValue(body.content?.trim() && body.content.length <= 2000, '관찰 내용을 1~2000자 이내로 작성해 주세요.');
  }
  async function syncAccounts({ users, invitations } = {}) {
    const db = await load();
    if (Array.isArray(users)) {
      const visible = users.filter(account => account.status !== 'DELETED');
      const ids = new Set(visible.map(account => account.id));
      db.users = visible;
      db.timetables = (db.timetables || []).filter(entry => ids.has(entry.teacherId));
    }
    if (Array.isArray(invitations)) db.invitations = invitations;
    persist();
  }
  function grantBackendClasses(db, actorId) {
    const user = (db.users || []).find(item => item.id === actorId);
    if (!user) return false;
    const ids = (db.classes || []).filter(item => String(item.id).startsWith('backend:')).map(item => item.id);
    const kept = (user.classIds || []).filter(id => !String(id).startsWith('backend:'));
    const next = [...kept, ...ids];
    const same = next.length === (user.classIds || []).length && next.every((id, index) => id === user.classIds[index]);
    if (same) return false;
    user.classIds = next;
    return true;
  }
  async function applyBackendRoster(actorId, roster) {
    const db = await load();
    db.classes = [
      ...(db.classes || []).filter(item => !String(item.id).startsWith('backend:')),
      ...roster.classes.map(item => ({ ...item })),
    ];
    db.students = [
      ...(db.students || []).filter(item => !String(item.classId).startsWith('backend:')),
      ...roster.students.map(item => ({ ...item })),
    ];
    grantBackendClasses(db, actorId);
    persist();
  }
  async function grantStoredBackendClasses(actorId) {
    const db = await load();
    if (grantBackendClasses(db, actorId)) persist();
  }
  function mergeRecord(list, record) {
    const index = list.findIndex(item => item.id === record.id);
    if (index >= 0) list[index] = { ...list[index], ...record };
    else list.push(record);
  }
  function rosterOwnerCode(item) {
    const direct = String(item?.schoolCode || readSchool(item).schoolCode || '').toUpperCase();
    if (direct) return direct;
    const match = /^gsm:([A-Za-z0-9]+):/.exec(String(item?.id || item?.classId || ''));
    return match ? match[1].toUpperCase() : '';
  }
  function inSchoolYear(item, code, year) {
    if (rosterOwnerCode(item) !== code) return false;
    const itemYear = Number(item?.schoolYear);
    if (Number.isInteger(itemYear)) return itemYear === year;
    const yearMatch = /^gsm:[A-Za-z0-9]+:(\d+):/.exec(String(item?.id || item?.classId || ''));
    return yearMatch ? Number(yearMatch[1]) === year : false;
  }
  async function mergeSchoolRoster(schoolCode, schoolYear, records) {
    const db = await load();
    const code = String(schoolCode || '').trim().toUpperCase();
    const year = Number(schoolYear);
    if (!code || !Number.isInteger(year)) return false;
    const classes = (records?.classes || []).filter(item => readSchool(item).schoolCode === code && Number(item.schoolYear) === year);
    const students = (records?.students || []).filter(item => String(item.schoolCode || '').toUpperCase() === code && Number(item.schoolYear) === year);
    db.classes = (db.classes || []).filter(item => !inSchoolYear(item, code, year));
    db.students = (db.students || []).filter(item => !inSchoolYear(item, code, year));
    for (const classroom of classes) mergeRecord(db.classes, { ...classroom, storedIn: 'firebase' });
    for (const student of students) mergeRecord(db.students, { ...student, storedIn: 'firebase' });
    persist();
    return true;
  }
  async function knownVirtualSchools() {
    const db = await load();
    const schools = new Map();
    const add = school => {
      const next = virtualStudentSchool(school);
      if (!next?.schoolCode) return;
      schools.set(next.schoolCode, next);
    };
    for (const user of db.users || []) add(accountSchool(user));
    for (const classroom of db.classes || []) add(readSchool(classroom));
    return [...schools.values()];
  }
  return {
    handle,
    load,
    syncAccounts,
    applyBackendRoster,
    grantStoredBackendClasses,
    mergeSchoolRoster,
    knownVirtualSchools
  };
}
