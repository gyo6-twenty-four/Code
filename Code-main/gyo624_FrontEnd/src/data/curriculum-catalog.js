let pending

export function loadCurriculumCatalog() {
  pending ||= import('./curriculum-2022.json').then(mod => mod.default)
  return pending
}

export function coursesFrom(catalog, schoolLevel) {
  return (catalog?.subjects || []).filter(item => item.schoolLevel === schoolLevel)
}

export function standardsFrom(catalog, subjectId) {
  return (catalog?.standards || []).filter(item => item.subjectId === subjectId)
}
