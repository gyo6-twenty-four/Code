import { LocalError } from './local-store.js';

const identifierPattern = /^(\d+)학년\s+(\d+)반\s+(\d+)번$/;
const pseudonymPattern = /^G(\d+)-C(\d+)-(\d+)$/;

function placement(label, pattern) {
  const match = pattern.exec(String(label || '').trim());
  if (!match) return null;
  return {
    grade: Number(match[1]),
    classNumber: Number(match[2]),
    number: Number(match[3]),
  };
}

function samePlace(left, right) {
  return left.grade === right.grade && left.classNumber === right.classNumber && left.number === right.number;
}

export function rosterFromApiRows(rows) {
  if (!Array.isArray(rows)) throw new LocalError('학생 명단 응답 형식을 확인해 주세요.');
  const classes = new Map();
  const students = [];
  for (const row of rows) {
    const fromIdentifier = placement(row?.internalIdentifier, identifierPattern);
    const fromPseudonym = placement(row?.pseudonymId, pseudonymPattern);
    if (fromIdentifier && fromPseudonym && !samePlace(fromIdentifier, fromPseudonym)) {
      throw new LocalError('학생 명단의 학급 정보가 서로 달라요.');
    }
    const place = fromIdentifier || fromPseudonym;
    const name = String(row?.realName || '').trim();
    if (!place || !name || row?.id == null) throw new LocalError('학생 명단의 학급 또는 이름을 확인할 수 없어요.');
    const classId = `backend:${place.grade}-${place.classNumber}`;
    if (!classes.has(classId)) {
      classes.set(classId, {
        id: classId,
        name: `${place.grade}학년 ${place.classNumber}반`,
        grade: place.grade,
        classNumber: place.classNumber,
      });
    }
    students.push({
      id: String(row.id),
      name,
      number: place.number,
      classId,
    });
  }
  return {
    classes: [...classes.values()].sort((a, b) => a.grade - b.grade || a.classNumber - b.classNumber),
    students: students.sort((a, b) => a.classId.localeCompare(b.classId) || a.number - b.number),
  };
}

function page(values, params) {
  const size = Math.max(1, Math.min(100, Number(params.get('size')) || 20));
  const number = Math.max(1, Number(params.get('page')) || 1);
  return {
    data: values.slice((number - 1) * size, number * size),
    meta: {
      totalElements: values.length,
      totalPages: Math.max(1, Math.ceil(values.length / size)),
      page: number,
    },
  };
}

export function isStudentRosterPath(path) {
  const parts = new URL(path, 'http://local.invalid').pathname.split('/').filter(Boolean);
  return (parts.length === 1 && parts[0] === 'classes') || (parts.length === 3 && parts[0] === 'classes' && parts[2] === 'students');
}

function classPlace(item) {
  const grade = Number(item?.grade);
  const classNumber = Number(String(item?.classNumber ?? item?.classLabel ?? '').replace(/\D/g, ''));
  if (!Number.isInteger(grade) || grade < 1 || !Number.isInteger(classNumber) || classNumber < 1) return null;
  return { grade, classNumber };
}

function placeFromClassId(id) {
  const text = String(id || '');
  const backend = /^backend:(\d+)-(\d+)$/.exec(text);
  if (backend) return { grade: Number(backend[1]), classNumber: Number(backend[2]) };
  const neis = /^neis:(\d+):(.+)$/.exec(text);
  if (!neis) return null;
  return classPlace({ grade: neis[1], classNumber: neis[2] });
}

export function rosterPage(roster, path) {
  const url = new URL(path, 'http://local.invalid');
  const parts = url.pathname.split('/').filter(Boolean);
  const year = Number(url.searchParams.get('schoolYear'));
  const stamp = item => Number.isInteger(year) ? { ...item, schoolYear: year } : { ...item };
  if (parts.length === 1) return page(roster.classes.map(stamp), url.searchParams);
  const classId = decodeURIComponent(parts[1]);
  const direct = roster.classes.find(item => item.id === classId);
  const place = direct ? null : placeFromClassId(classId);
  const matched = direct || roster.classes.find(item => {
    const current = classPlace(item);
    return place && current && current.grade === place.grade && current.classNumber === place.classNumber;
  });
  if (!matched) throw new LocalError('학급을 확인해 주세요.', 404);
  return page(roster.students.filter(item => item.classId === matched.id).map(stamp), url.searchParams);
}

let cached = null;
let pending = null;
let unavailable = false;

export function clearBackendRosterCache() {
  cached = null;
  pending = null;
  unavailable = false;
}

export async function loadBackendRoster(signal) {
  if (unavailable) return null;
  if (cached) return cached;
  if (!pending) {
    pending = (async () => {
      let response;
      try {
        response = await fetch('/api/v1/students', {
          signal,
          headers: { Accept: 'application/json' },
        });
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        unavailable = true;
        return null;
      }
      const text = await response.text();
      const trimmed = text.replace(/^\uFEFF/, '').trimStart();
      // Static hosting rewrites /api/v1/* to index.html, and a stopped API proxy
      // answers with an empty gateway error. Neither one is a roster payload.
      if (trimmed.startsWith('<') || (!response.ok && !trimmed.startsWith('{') && !trimmed.startsWith('['))) {
        unavailable = true;
        return null;
      }
      if (!response.ok) throw new LocalError('학생 명단을 불러오지 못했어요.', response.status);
      let body;
      try {
        body = JSON.parse(trimmed);
      } catch {
        throw new LocalError('학생 명단 응답 형식을 확인해 주세요.', response.status);
      }
      cached = rosterFromApiRows(body);
      return cached;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}
