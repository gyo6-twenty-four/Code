import { Field } from './ui'
import { classParts } from '../lib/classrooms'
import { registeredClasses } from '../lib/registry'

export function ClassroomField({ label = '학급', settings, value, onChange, optional = false, options, ...props }) {
  return <Field label={label} required={!optional} value={value} onChange={onChange} {...props}><option value="">{optional ? '학급 미배정' : '학급을 선택해 주세요'}</option>{(options || registeredClasses(settings)).map(item => <option key={item}>{item}</option>)}</Field>
}
export function ClassroomEditor({ value, onChange }) {
  const [grade, room] = classParts(value)
  return <div className="class-fields"><Field label="학년" required value={grade} onChange={e => onChange(`${e.target.value}학년 ${room || 1}반`)}><option value="">학년 선택</option>{[1, 2, 3, 4, 5, 6].map(item => <option key={item} value={item}>{item}학년</option>)}</Field><Field label="반" required value={room} onChange={e => onChange(`${grade || 1}학년 ${e.target.value}반`)}><option value="">반 선택</option>{Array.from({ length: 99 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}반</option>)}</Field></div>
}
