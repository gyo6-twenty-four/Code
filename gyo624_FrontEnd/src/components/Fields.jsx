import { Children, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dateAllowed, dateValue, monthDays, parseDate, placePanel, shiftDate, todayValue } from './field-utils'

function Icon({ name, ...props }) {
  const paths = { chevron: 'm6 9 6 6 6-6', left: 'm15 6-6 6 6 6', right: 'm9 6 6 6-6 6', check: 'm5 12 4 4L19 6', calendar: 'M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z', minus: 'M5 12h14', plus: 'M5 12h14M12 5v14' }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>
}
function errorMessage(input, label) {
  if (input.validity.valueMissing) return `${label} 입력이 필요해요.`
  if (input.validity.typeMismatch) return '올바른 이메일 주소를 입력해 주세요.'
  if (input.validity.patternMismatch) return '입력한 내용을 확인해 주세요.'
  if (input.validity.tooShort) return `${input.minLength}자 이상 입력해 주세요.`
  return input.validationMessage || '입력한 내용을 확인해 주세요.'
}
function useValidation(label, ref, focusRef) {
  const [error, setError] = useState('')
  function validate() { const input = ref.current; const message = input && !input.validity.valid ? errorMessage(input, label) : ''; setError(message); return !message }
  function invalid(event) {
    event.preventDefault()
    validate()
    const input = ref.current
    const first = input.form && [...input.form.elements].find(element => element.willValidate && !element.validity.valid)
    if (!first || first === input) (focusRef?.current || input).focus()
  }
  return { error, clear: () => setError(''), validate, invalid }
}
function usePanel(triggerRef, panelRef, calendar = false) {
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState(null)
  const [style, setStyle] = useState({})
  function show() { const trigger = triggerRef.current; setHost(trigger.closest('dialog') || document.body); setOpen(true) }
  function close(restore = false) { setOpen(false); if (restore) triggerRef.current?.focus() }
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    function position() {
      const anchor = trigger.getBoundingClientRect()
      const width = Math.min(calendar ? 320 : Math.max(anchor.width, 180), window.innerWidth - 24)
      const height = Math.min(panel.getBoundingClientRect().height, window.innerHeight - 24)
      setStyle({ width, maxHeight: window.innerHeight - 24, ...placePanel(anchor, width, height, window.innerWidth, window.innerHeight) })
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(trigger)
    observer.observe(panel)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => { observer.disconnect(); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true) }
  }, [open, triggerRef, panelRef, calendar])
  useEffect(() => {
    if (!open) return
    function outside(event) { if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false) }
    function escape(event) { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true) }
  }, [open, triggerRef, panelRef])
  return { open, show, close, style, host }
}
function optionText(node) { return Children.toArray(node).map(child => typeof child === 'object' ? optionText(child.props.children) : String(child)).join('') }
function ErrorText({ id, error }) { return error ? <p className="field-error" id={`${id}-error`} role="alert">{error}</p> : null }
const changeEvent = (value, name) => ({ target: { value, name }, currentTarget: { value, name } })

function SelectField({ id, label, children, value, defaultValue = '', onChange, name, required, disabled, placeholder = '선택해 주세요' }) {
  const options = Children.toArray(children).map(option => ({ value: String(option.props.value ?? optionText(option.props.children)), label: optionText(option.props.children), disabled: option.props.disabled }))
  const [internal, setInternal] = useState(defaultValue)
  const selected = String(value ?? internal)
  const selectedIndex = options.findIndex(option => option.value === selected)
  const [active, setActive] = useState(Math.max(selectedIndex, 0))
  const [query, setQuery] = useState('')
  const visibleOptions = options.map((option, index) => ({ option, index })).filter(({ option }) => option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef({ text: '', time: 0 })
  const panel = usePanel(triggerRef, panelRef)
  const inputRef = useRef(null)
  const validation = useValidation(label, inputRef, triggerRef)
  const listId = `${id}-list`
  useEffect(() => { if (panel.open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [panel.open, active, id])
  function show(index = selectedIndex) { setQuery(''); setActive(Math.max(index, 0)); panel.show() }
  function choose(index) {
    const option = options[index]
    if (!option || option.disabled) return
    setInternal(option.value); onChange?.(changeEvent(option.value, name)); validation.clear(); panel.close(true)
  }
  function nextIndex(direction) { for (let offset = 1; offset <= options.length; offset++) { const index = ((active + offset * direction) % options.length + options.length) % options.length; if (!options[index].disabled && options[index].label.toLocaleLowerCase().includes(query.toLocaleLowerCase())) return index } return active }
  function keydown(event) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      if (!panel.open) { show(event.key === 'ArrowUp' ? options.length - 1 : selectedIndex); return }
      if (event.key === 'Enter' || event.key === ' ') choose(active)
      else if (event.key === 'Home') setActive(options.findIndex(option => !option.disabled))
      else if (event.key === 'End') setActive(options.findLastIndex(option => !option.disabled))
      else setActive(nextIndex(event.key === 'ArrowDown' ? 1 : -1))
    } else if (event.key === 'Tab') panel.close()
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.nativeEvent.isComposing) {
      const search = searchRef.current
      search.text = event.timeStamp - search.time > 700 ? event.key : search.text + event.key
      search.time = event.timeStamp
      const index = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(search.text.toLocaleLowerCase()))
      if (index >= 0) { if (!panel.open) panel.show(); setActive(index) }
    }
  }
  return <>
    <input className="field-validation-proxy" ref={inputRef} name={name} type="text" value={selectedIndex < 0 ? '' : selected} onChange={() => {}} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onInvalid={validation.invalid} />
    <button ref={triggerRef} id={id} type="button" className="field-control field-select" role="combobox" aria-labelledby={`${id}-label`} aria-expanded={panel.open} aria-controls={listId} aria-haspopup="listbox" aria-activedescendant={panel.open && active >= 0 ? `${id}-option-${active}` : undefined} aria-required={required || undefined} aria-invalid={!!validation.error || undefined} aria-describedby={validation.error ? `${id}-error` : undefined} disabled={disabled} onClick={() => panel.open ? panel.close() : show()} onKeyDown={keydown}><span className={selectedIndex < 0 ? 'field-placeholder' : ''}>{options[selectedIndex]?.label || placeholder}</span><Icon name="chevron" className={panel.open ? 'is-rotated' : ''} /></button>
    {panel.open && panel.host && createPortal(<div ref={panelRef} className="field-popover select-popover" style={panel.style}>{options.length > 5 && <div className="select-search"><input type="text" aria-label={`${label} 옵션 검색`} placeholder="검색어를 입력해 주세요" value={query} onChange={event => { setQuery(event.target.value); setActive(options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().includes(event.target.value.toLocaleLowerCase()))) }} onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) keydown(event); else if (event.key === 'Tab') panel.close(true) }} /></div>}<div id={listId} role="listbox" aria-labelledby={`${id}-label`}>{visibleOptions.map(({ option, index }) => <div key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === selected} aria-disabled={option.disabled || undefined} className={`select-option${index === active ? ' is-active' : ''}${option.value === selected ? ' is-selected' : ''}`} onPointerMove={() => { if (!option.disabled) setActive(index) }} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}><span>{option.label}</span>{option.value === selected && <Icon name="check" />}</div>)}{!visibleOptions.length && <p className="select-empty">검색 결과가 없어요.</p>}</div></div>, panel.host)}
    <ErrorText id={id} error={validation.error} />
  </>
}

function DateField({ id, label, value = '', onChange, name, min, max, required, disabled }) {
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const panel = usePanel(triggerRef, panelRef, true)
  const inputRef = useRef(null)
  const validation = useValidation(label, inputRef, triggerRef)
  const [today] = useState(todayValue)
  const [focusDate, setFocusDate] = useState(() => parseDate(value) ? value : today)
  const [view, setView] = useState('days')
  const activeDate = parseDate(focusDate) || parseDate(today)
  const year = activeDate.getUTCFullYear()
  const month = activeDate.getUTCMonth()
  const validDate = parseDate(value)
  const headingId = `${id}-calendar-title`
  const days = monthDays(year, month)
  useLayoutEffect(() => { if (panel.open) (panelRef.current?.querySelector('.calendar-periods .is-selected') || panelRef.current?.querySelector('[tabindex="0"]'))?.focus() }, [panel.open, view, focusDate])
  useEffect(() => { inputRef.current.setCustomValidity(value && !dateAllowed(value, min, max) ? '선택할 수 있는 날짜 범위를 확인해 주세요.' : '') }, [value, min, max, inputRef])
  function show() { setFocusDate(parseDate(value) ? value : today); setView('days'); panel.show() }
  function choose(next) { if (next && !dateAllowed(next, min, max)) return; onChange?.(changeEvent(next, name)); validation.clear(); panel.close(true) }
  function moveMonth(offset) {
    const date = new Date(activeDate)
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + offset)
    if (date.getUTCFullYear() > 0 && date.getUTCFullYear() < 10000) setFocusDate(dateValue(date))
  }
  function moveYear(next) { if (next > 0 && next < 10000) setFocusDate(`${String(next).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`) }
  function dayKey(event) {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -activeDate.getUTCDay(), End: 6 - activeDate.getUTCDay() }
    if (event.key in offsets) { event.preventDefault(); const next = shiftDate(focusDate, offsets[event.key]); if (parseDate(next)) setFocusDate(next) }
    if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); moveMonth((event.key === 'PageDown' ? 1 : -1) * (event.shiftKey ? 12 : 1)) }
  }
  const yearStart = Math.floor(year / 12) * 12
  return <>
    <input ref={inputRef} className="field-validation-proxy" name={name} type="text" value={validDate ? value : ''} onChange={() => {}} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onInvalid={validation.invalid} />
    <button ref={triggerRef} id={id} type="button" className="field-control field-date" aria-haspopup="dialog" aria-expanded={panel.open} aria-controls={`${id}-calendar`} aria-labelledby={`${id}-label ${id}-date-value`} aria-required={required || undefined} aria-invalid={!!validation.error || undefined} aria-describedby={validation.error ? `${id}-error` : undefined} disabled={disabled} onClick={() => panel.open ? panel.close() : show()} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); show() } }}><span id={`${id}-date-value`} className={validDate ? '' : 'field-placeholder'}>{validDate ? `${validDate.getUTCFullYear()}년 ${validDate.getUTCMonth() + 1}월 ${validDate.getUTCDate()}일` : '날짜를 선택해 주세요'}</span><Icon name="calendar" /></button>
    {panel.open && panel.host && createPortal(<div ref={panelRef} role="dialog" aria-modal="false" aria-labelledby={headingId} id={`${id}-calendar`} className="field-popover calendar-popover" style={panel.style} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !triggerRef.current.contains(event.relatedTarget)) panel.close() }}>
      <div className="calendar-header"><button type="button" className="calendar-arrow" aria-label={view === 'days' ? '이전 달' : '이전 연도'} onClick={() => view === 'days' ? moveMonth(-1) : moveYear(year - (view === 'years' ? 12 : 1))}><Icon name="left" /></button><button type="button" className="calendar-heading" id={headingId} aria-label="연도와 월 선택" onClick={() => setView(view === 'days' ? 'months' : 'years')}>{view === 'years' ? `${Math.max(1, yearStart)}–${Math.min(9999, yearStart + 11)}년` : view === 'months' ? `${year}년` : `${year}년 ${month + 1}월`}</button><button type="button" className="calendar-arrow" aria-label={view === 'days' ? '다음 달' : '다음 연도'} onClick={() => view === 'days' ? moveMonth(1) : moveYear(year + (view === 'years' ? 12 : 1))}><Icon name="right" /></button></div>
      {view === 'days' ? <><div className="calendar-weekdays" aria-hidden="true">{['일', '월', '화', '수', '목', '금', '토'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-days" role="grid" aria-labelledby={headingId}>{Array.from({ length: 6 }, (_, week) => <div className="calendar-week" role="row" key={week}>{days.slice(week * 7, week * 7 + 7).map(day => { const date = parseDate(day); if (!date) return <div role="gridcell" key={day} />; return <div role="gridcell" key={day} aria-selected={day === value}><button type="button" data-date={day} tabIndex={day === focusDate ? 0 : -1} aria-label={`${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`} aria-current={day === today ? 'date' : undefined} aria-disabled={!dateAllowed(day, min, max)} className={`calendar-day${date.getUTCMonth() !== month ? ' is-outside' : ''}${day === value ? ' is-selected' : ''}`} onKeyDown={dayKey} onClick={() => choose(day)}>{date.getUTCDate()}</button></div> })}</div>)}</div></> : <div className="calendar-periods">{Array.from({ length: 12 }, (_, index) => view === 'months' ? index : yearStart + index).filter(period => view === 'months' || (period > 0 && period < 10000)).map(period => <button key={period} type="button" tabIndex={0} className={period === (view === 'months' ? month : year) ? 'is-selected' : ''} onClick={() => { if (view === 'months') { setFocusDate(`${String(year).padStart(4, '0')}-${String(period + 1).padStart(2, '0')}-01`); setView('days') } else { moveYear(period); setView('months') } }}>{view === 'months' ? `${period + 1}월` : `${period}년`}</button>)}</div>}
      <div className="calendar-footer"><button type="button" disabled={required || !value} onClick={() => choose('')}>초기화</button><button type="button" disabled={!dateAllowed(today, min, max)} onClick={() => choose(today)}>오늘</button><button type="button" onClick={() => panel.close(true)}>닫기</button></div>
    </div>, panel.host)}
    <ErrorText id={id} error={validation.error} />
  </>
}

function TextField({ id, label, multiline, type = 'text', onChange, onBlur, ...props }) {
  const inputRef = useRef(null)
  const validation = useValidation(label, inputRef)
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  const inputProps = { ...props, ref: inputRef, id, className: 'field-input', 'aria-invalid': !!validation.error || undefined, 'aria-describedby': validation.error ? `${id}-error` : undefined, onInvalid: validation.invalid, onChange: event => { validation.clear(); onChange?.(event) }, onBlur: event => { validation.validate(); onBlur?.(event) } }
  return <><div className={`field-input-shell${password ? ' has-accessory' : ''}`}>{multiline ? <textarea {...inputProps} rows={3} /> : <input {...inputProps} type={password && visible ? 'text' : type} />}{password && <button type="button" className="password-toggle" aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? '숨기기' : '보기'}</button>}</div><ErrorText id={id} error={validation.error} /></>
}
function NumberField({ id, label, value, defaultValue = '', onChange, min, max, step = 1, disabled, name, required, ...props }) {
  const [internal, setInternal] = useState(defaultValue)
  const current = String(value ?? internal)
  const inputRef = useRef(null)
  const validation = useValidation(label, inputRef)
  const number = current.trim() ? Number(current) : NaN
  const minValue = min === undefined ? -Infinity : Number(min)
  const maxValue = max === undefined ? Infinity : Number(max)
  useEffect(() => { inputRef.current.setCustomValidity(current && (!Number.isInteger(number) || number < minValue || number > maxValue) ? `${Number.isFinite(minValue) ? minValue : '최솟값'}에서 ${Number.isFinite(maxValue) ? maxValue : '최댓값'} 사이의 정수를 입력해 주세요.` : '') }, [current, number, minValue, maxValue, inputRef])
  function change(next) { setInternal(next); onChange?.(changeEvent(next, name)); validation.clear() }
  function increment(direction) { change(String(Math.min(maxValue, Math.max(minValue, (Number.isFinite(number) ? number : Number.isFinite(minValue) ? minValue : 0) + Number(step) * direction)))) }
  return <><div className="field-number"><button type="button" className="number-step" aria-label={`${label} 줄이기`} disabled={disabled || number <= minValue} onClick={() => increment(-1)}><Icon name="minus" /></button><input {...props} id={id} ref={inputRef} className="field-input" name={name} type="text" inputMode="numeric" role="spinbutton" value={current} required={required} disabled={disabled} pattern="-?[0-9]+" aria-valuemin={Number.isFinite(minValue) ? minValue : undefined} aria-valuemax={Number.isFinite(maxValue) ? maxValue : undefined} aria-valuenow={Number.isFinite(number) ? number : undefined} aria-invalid={!!validation.error || undefined} aria-describedby={validation.error ? `${id}-error` : undefined} onChange={event => { if (/^-?\d*$/.test(event.target.value)) change(event.target.value) }} onBlur={validation.validate} onInvalid={validation.invalid} onKeyDown={event => { if (['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); increment(event.key === 'ArrowUp' ? 1 : -1) } }} /><button type="button" className="number-step" aria-label={`${label} 늘리기`} disabled={disabled || number >= maxValue} onClick={() => increment(1)}><Icon name="plus" /></button></div><ErrorText id={id} error={validation.error} /></>
}
export function Field({ label, multiline, children, type, ...props }) {
  const id = useId()
  return <div className="field"><label htmlFor={id} id={`${id}-label`}>{label}</label>{children ? <SelectField id={id} label={label} {...props}>{children}</SelectField> : type === 'date' ? <DateField id={id} label={label} {...props} /> : type === 'number' ? <NumberField id={id} label={label} {...props} /> : <TextField id={id} label={label} multiline={multiline} type={type} {...props} />}</div>
}
