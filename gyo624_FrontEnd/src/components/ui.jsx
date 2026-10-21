import { Children, useEffect, useId, useRef } from 'react'
import rowMark from '../assets/row-mark.svg'
import { Field as FormField } from './Fields'

export function Brand({ onClick, label = '교육24' }) {
  const copy = <><span className="brand-mark" aria-hidden="true">교</span><span>{label}</span></>
  return onClick ? <button type="button" className="brand" onClick={onClick} aria-label="메뉴 열기">{copy}</button> : <div className="brand">{copy}</div>
}
export function PrimaryButton({ children, className = '', ...props }) { return <button type="button" className={`primary-button ${className}`} {...props}>{children}</button> }
export function ListRow({ title, detail, meta, onClick, href, selected, className = '' }) {
  const copy = <><img className="row-mark" src={rowMark} width="36" height="36" alt="" /><span className="row-copy"><span className="row-title">{title}</span><span className="row-detail">{detail}</span></span><span className="row-meta">{meta}</span></>
  if (href) return <a className={`settings-row ${className}`} href={`#${href}`}>{copy}</a>
  return <button type="button" className={`settings-row ${className}`} onClick={onClick} aria-pressed={selected}>{copy}</button>
}
export function Field({ label, multiline, children, ...props }) {
  return <FormField label={label} multiline={multiline} {...props}>{children}</FormField>
}
export function Filters({ items = ['전체', '최근 기록', '담당 학급'], value, onChange }) { return <div className="filters" role="group" aria-label="목록 필터">{items.map(item => <button className="filter" key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)}>{item}</button>)}</div> }
export function InfoPanel({ title, lines, className = '' }) { return <aside className={`info-panel ${className}`}><h2>{title}</h2>{lines.map(line => <p key={line}>{line}</p>)}</aside> }
export function Modal({ title, onClose, children, className = '' }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} className={`settings-dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="close-button" aria-label="닫기" onClick={onClose}>×</button></div>{children}{Children.toArray(children).some(child => child.type === 'form') && <button type="button" className="secondary-button modal-cancel" onClick={onClose}>취소</button>}
  </dialog>
}
