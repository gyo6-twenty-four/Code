// Keep the API value as domestic digits; separators are presentation only.
export function phoneDigits(value) {
  const raw = String(value || '').trim();
  let digits = raw.replace(/[^0-9]/g, '');
  if (/^(?:\+82|0082)/.test(raw)) {
    digits = digits.slice(raw.startsWith('+') ? 2 : 4);
    if (digits && !digits.startsWith('0')) digits = `0${digits}`;
  }
  return digits.slice(0, 11);
}

export function formatPhone(value) {
  const digits = phoneDigits(value);
  const prefix = digits.startsWith('02') ? 2 : 3;
  if (digits.length <= prefix) return digits;
  if (digits.length <= prefix + 4) return `${digits.slice(0, prefix)}-${digits.slice(prefix)}`;
  return `${digits.slice(0, prefix)}-${digits.slice(prefix, -4)}-${digits.slice(-4)}`;
}

export function phoneError(value) {
  const digits = phoneDigits(value);
  if (!digits) return '';
  return /^(?:02[0-9]{7,8}|010[0-9]{8}|01[16789][0-9]{7,8}|0[3-6][0-9]{8,9}|070[0-9]{8}|080[0-9]{7})$/.test(digits)
    ? '' : '지역번호를 포함한 연락처를 끝까지 입력해 주세요. 예: 010-1234-5678';
}

export function phoneCaret(formatted, digitCount) {
  if (!digitCount) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (/[0-9]/.test(formatted[index]) && ++seen === digitCount) return index + 1;
  }
  return formatted.length;
}

export function invitationEmailMatches(value, invitedEmail) {
  return !!invitedEmail && value.trim().toLowerCase() === invitedEmail.trim().toLowerCase();
}
