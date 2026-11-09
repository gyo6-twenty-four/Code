export const VIRTUAL_STUDENT_SCHOOL_NAME = "경북소프트웨어마이스터고등학교";

export function usesVirtualStudentRoster(school) {
  const next = normalizeSchool(school);
  const compact = next.name.replace(/\s+/g, "");
  return (
    compact.includes("경북소프트웨어마이스터고") ||
    compact.includes("경소마고") ||
    next.schoolCode === "8750829"
  );
}

export function virtualStudentSchool(school) {
  const next = normalizeSchool(school);
  if (!usesVirtualStudentRoster(next)) return null;
  return {
    ...next,
    name: VIRTUAL_STUDENT_SCHOOL_NAME,
    kind: next.kind || "고등학교",
  };
}

export function normalizeSchool(value) {
  return {
    name: String(value?.name || value?.schoolName || "").trim(),
    schoolCode: String(value?.schoolCode || "")
      .trim()
      .toUpperCase(),
    officeCode: String(value?.officeCode || "").trim(),
    officeName: String(value?.officeName || "").trim(),
    kind: String(value?.kind || "").trim(),
  };
}

export function schoolSearchParams(value) {
  const text = String(value || "").trim();
  if (/^[A-Za-z0-9]{7,10}$/.test(text))
    return { SD_SCHUL_CODE: text.toUpperCase() };
  if (text.length >= 2) return { SCHUL_NM: text };
  return null;
}

export function elementarySchool(school) {
  return String(school?.kind || "").includes("초등");
}

export function schoolFromNeis(row) {
  const school = normalizeSchool({
    name: row?.SCHUL_NM,
    schoolCode: row?.SD_SCHUL_CODE,
    officeCode: row?.ATPT_OFCDC_SC_CODE,
    officeName: row?.ATPT_OFCDC_SC_NM,
    kind: row?.SCHUL_KND_SC_NM,
  });
  if (!school.name || !school.schoolCode || !school.officeCode) return null;
  return { ...school, address: String(row?.ORG_RDNMA || "").trim() };
}

export function toNeisSchool(school) {
  const next = normalizeSchool(school);
  if (!next.officeCode || !next.schoolCode) return null;
  return {
    officeCode: next.officeCode,
    officeName: next.officeName,
    schoolCode: next.schoolCode,
    schoolName: next.name,
    kind: next.kind,
  };
}

const adminSchoolKey = "education24-admin-school";

export function readAdminSchool(storage = globalThis.localStorage) {
  try {
    const school = normalizeSchool(
      JSON.parse(storage?.getItem(adminSchoolKey) || "null"),
    );
    return school.schoolCode ? school : null;
  } catch {
    return null;
  }
}

export function writeAdminSchool(school, storage = globalThis.localStorage) {
  const next = normalizeSchool(school);
  if (!storage) return next.schoolCode ? next : null;
  if (!next.schoolCode) storage.removeItem(adminSchoolKey);
  else storage.setItem(adminSchoolKey, JSON.stringify(next));
  return next.schoolCode ? next : null;
}
