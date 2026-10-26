export function passwordError(password, confirmation) {
  if (password.length < 8 || password.length > 128 || !/[a-z]/i.test(password) || !/\d/.test(password)) return '비밀번호는 영문과 숫자를 포함해 8~128자로 입력해 주세요.'
  return password !== confirmation ? '두 비밀번호가 일치하지 않아요.' : ''
}
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new Uint8Array(salt.match(/.{2}/g).map(byte => parseInt(byte, 16))), iterations: 100000, hash: 'SHA-256' }, key, 256)
  return hex(new Uint8Array(bits))
}
export async function createPasswordRecord(password) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await derive(password, salt) }
}
export async function verifyPasswordRecord(password, record) {
  if (!/^[a-f0-9]{32}$/.test(record?.salt || '') || !/^[a-f0-9]{64}$/.test(record?.hash || '')) return false
  return await derive(password, record.salt) === record.hash
}
