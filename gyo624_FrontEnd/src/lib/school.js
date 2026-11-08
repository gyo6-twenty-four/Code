export function normalizeSchool(value) {
  return {
    name: String(value?.name || value?.schoolName || '').trim(),
    schoolCode: String(value?.schoolCode || '').trim().toUpperCase(),
    officeCode: String(value?.officeCode || '').trim(),
    officeName: String(value?.officeName || '').trim(),
    kind: String(value?.kind || '').trim(),
  }
}

export function schoolSearchParams(value) {
  const text = String(value || '').trim()
  if (/^[A-Za-z0-9]{7,10}$/.test(text)) return { SD_SCHUL_CODE: text.toUpperCase() }
  if (text.length >= 2) return { SCHUL_NM: text }
  return null
}

export function schoolFromNeis(row) {
  const school = normalizeSchool({
    name: row?.SCHUL_NM,
    schoolCode: row?.SD_SCHUL_CODE,
    officeCode: row?.ATPT_OFCDC_SC_CODE,
    officeName: row?.ATPT_OFCDC_SC_NM,
    kind: row?.SCHUL_KND_SC_NM,
  })
  if (!school.name || !school.schoolCode || !school.officeCode) return null
  return { ...school, address: String(row?.ORG_RDNMA || '').trim() }
}

export function toNeisSchool(school) {
  const next = normalizeSchool(school)
  if (!next.officeCode || !next.schoolCode) return null
  return {
    officeCode: next.officeCode,
    officeName: next.officeName,
    schoolCode: next.schoolCode,
    schoolName: next.name,
    kind: next.kind,
  }
}
