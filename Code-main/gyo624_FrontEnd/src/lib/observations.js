import { parseDate, todayValue } from '../components/field-utils.js'
export function observationDateError(date, today = todayValue()) {
  if (!parseDate(date)) return '올바른 관찰 날짜를 선택해 주세요.'
  return date > today ? '관찰 날짜는 오늘 또는 과거 날짜만 선택할 수 있어요.' : ''
}
