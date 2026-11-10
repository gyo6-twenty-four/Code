import { useId, useRef, useLayoutEffect, useState } from 'react';
import { formatPhone, phoneDigits, phoneError, phoneCaret } from '../lib/phone';

export default function PhoneField({ value = '', onChange, label = '연락처' }) {
  const id = useId();
  const ref = useRef(null);
  const selection = useRef(null);
  const [error, setError] = useState('');
  const formatted = formatPhone(value);

  useLayoutEffect(() => {
    ref.current.setCustomValidity(phoneError(value));
    if (selection.current !== null) {
      ref.current.setSelectionRange(selection.current, selection.current);
      selection.current = null;
    }
  }, [value]);

  function change(raw, position) {
    const digits = phoneDigits(raw);
    const next = formatPhone(digits);
    const caret = phoneCaret(next, phoneDigits(raw.slice(0, position)).length);
    ref.current.value = next;
    ref.current.setCustomValidity(phoneError(digits));
    ref.current.setSelectionRange(caret, caret);
    selection.current = caret;
    setError('');
    onChange(digits);
  }

  function keyDown(event) {
    const input = event.currentTarget;
    if (input.selectionStart !== input.selectionEnd) return;
    const caret = input.selectionStart;
    // Deleting next to an automatic separator should delete a digit, not get stuck.
    if (event.key === 'Backspace' && formatted[caret - 1] === '-') {
      event.preventDefault();
      change(formatted.slice(0, caret - 2) + formatted.slice(caret), caret - 2);
    } else if (event.key === 'Delete' && formatted[caret] === '-') {
      event.preventDefault();
      change(formatted.slice(0, caret) + formatted.slice(caret + 2), caret);
    }
  }

  return <div className="phone-field">
    <div className="field phone-number"><label htmlFor={id}>{label} <span className="phone-optional">(선택)</span></label><input ref={ref} id={id} name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={formatted} placeholder="010-1234-5678" aria-invalid={!!error || undefined} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} onChange={event => change(event.target.value, event.target.selectionStart)} onKeyDown={keyDown} onBlur={() => setError(phoneError(value))} onInvalid={event => { event.preventDefault(); setError(phoneError(value)); event.currentTarget.focus(); }} />{error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}</div>
    <p className="phone-hint" id={`${id}-hint`}>숫자만 입력하면 전화번호 형식으로 표시돼요.</p>
  </div>;
}
