import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneDigits, formatPhone, phoneError, phoneCaret, invitationEmailMatches } from './phone.js';

test('phone input strips letters/separators and limits the domestic number length', () => {
  assert.equal(phoneDigits('010abc-1234 한글 5678'), '01012345678');
  assert.equal(phoneDigits('010123456789999'), '01012345678');
  assert.equal(phoneDigits('문자만'), '');
  assert.equal(formatPhone(''), '');
});
test('Korean international paste is converted to a domestic number without duplicating the country code', () => {
  for (const value of ['+82 10-1234-5678', '+82 (0)10-1234-5678', '0082 10 1234 5678']) {
    assert.equal(phoneDigits(value), '01012345678');
    assert.equal(formatPhone(value), '010-1234-5678');
  }
});
test('mobile, Seoul and other regional numbers receive the appropriate separators', () => {
  assert.equal(formatPhone('01012345678'), '010-1234-5678');
  assert.equal(formatPhone('0212345678'), '02-1234-5678');
  assert.equal(formatPhone('021234567'), '02-123-4567');
  assert.equal(formatPhone('0311234567'), '031-123-4567');
  assert.equal(formatPhone('0101'), '010-1');
});
test('optional empty numbers are allowed while partial numbers block form submission', () => {
  for (const value of ['', '01012345678', '021234567', '0311234567']) assert.equal(phoneError(value), '');
  for (const value of ['010', '010123456', '0101234567', '12345678901', '02123456789']) assert.ok(phoneError(value));
});
test('caret follows the edited digit rather than jumping to the end after formatting', () => {
  assert.equal(phoneCaret('010-1234-5678', 4), 5);
  assert.equal(phoneCaret('010-1234-5678', 7), 8);
  assert.equal(phoneCaret('010-1234-5678', 11), 13);
  assert.equal(phoneCaret('010-1234-5678', 0), 0);
});
test('invitation email confirmation accepts normalized matches and rejects another address', () => {
  assert.ok(invitationEmailMatches(' Teacher@School.kr ', 'teacher@school.kr'));
  assert.equal(invitationEmailMatches('another@school.kr', 'teacher@school.kr'), false);
  assert.equal(invitationEmailMatches('', ''), false);
  assert.equal(invitationEmailMatches('teacher@school.kr', undefined), false);
});
