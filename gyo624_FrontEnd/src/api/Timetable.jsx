import { className } from './model';
import { useState } from 'react';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { dateValue, monthDays, parseDate, todayValue } from '../components/field-utils';
import { resource } from './client';
import { useMutation, usePage, useResource } from './hooks';
import { ApiState, ClassSelect, Pagination, SaveButton } from './shared';
import '../components/dashboard-calendar.css';
const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  labels = ['월요일', '화요일', '수요일', '목요일', '금요일'];
export default function Timetable({
  classes,
  classId,
  selectClass,
  year,
  account,
  notify,
  home = false
}) {
  const [semester, setSemester] = useState(new Date().getMonth() < 7 ? '1' : '2'),
    [selected, setSelected] = useState(todayValue),
    [month, setMonth] = useState(todayValue().slice(0, 7));
  const [draft, setDraft] = useState(null),
    [remove, setRemove] = useState(false);
  const admin = account.role === 'ADMIN';
  const state = useResource(admin && !classId ? null : resource('/timetables', {
    schoolYear: year,
    semester,
    classId,
    ...(!admin ? {
      teacherId: account.id
    } : {})
  }), false, true);
  const teachers = usePage(admin ? '/admin/teachers' : null);
  const mutation = useMutation(notify);
  const items = Array.isArray(state.data) ? state.data : state.data?.entries || [];
  const name = item => item.className || item.class?.name || className(classes.data?.find(value => value.id === item.classId));
  const daily = items.filter(item => days[parseDate(selected).getUTCDay() - 1] === item.dayOfWeek);
  const [yy, mm] = month.split('-').map(Number);
  function move(delta) {
    const next = parseDate(`${month}-01`);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(dateValue(next).slice(0, 7));
  }
  async function edit(item, dayOfWeek = 'MONDAY', period = 1) {
    setRemove(false);
    setDraft(item ? {
      ...item
    } : {
      schoolYear: year,
      semester: Number(semester),
      classId,
      teacherId: '',
      dayOfWeek,
      period,
      subject: '',
      room: ''
    });
    if (item?.id) {/* GET entry is not defined; editing uses the current list version. */}
  }
  return <section className="api-stack"><div className="api-toolbar"><ClassSelect classes={classes} value={classId} onChange={selectClass} /><Field label="학기" value={semester} onChange={e => setSemester(e.target.value)}><option value="1">1학기</option><option value="2">2학기</option></Field>{admin && <PrimaryButton onClick={() => edit(null)}>수업 추가</PrimaryButton>}{!admin && <p className="dialog-hint">시간표 변경은 학교 관리자에게 요청해 주세요.</p>}</div><ApiState state={state} empty={admin && !classId ? '시간표를 확인할 학급을 선택해 주세요.' : '등록된 시간표가 없어요.'} />
    {home ? <div className="dashboard-calendar"><div className="home-calendar-panel"><header className="home-calendar-heading"><h2>{yy}년 {mm}월</h2><div className="calendar-month-controls"><button type="button" aria-label="이전 달" onClick={() => move(-1)}>‹</button><button type="button" className="calendar-today" onClick={() => {
              setMonth(todayValue().slice(0, 7));
              setSelected(todayValue());
            }}>오늘</button><button type="button" aria-label="다음 달" onClick={() => move(1)}>›</button></div></header><table className="home-calendar-grid"><thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map(day => <th key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({
              length: 6
            }, (_, i) => <tr key={i}>{monthDays(yy, mm - 1).slice(i * 7, i * 7 + 7).map(date => <td key={date}><button type="button" className={`home-calendar-day${date.slice(0, 7) !== month ? ' adjacent-month' : ''}`} aria-pressed={selected === date} aria-label={`${date} 수업 조회`} aria-current={date === todayValue() ? 'date' : undefined} onClick={() => setSelected(date)}><span className="day-number">{Number(date.slice(-2))}</span></button></td>)}</tr>)}</tbody></table></div><aside className="selected-day-panel"><h2>{selected} 수업</h2><ul className="day-lessons">{daily.map(item => <li key={item.id}><span className="period-label">{item.period}교시</span><div><strong>{name(item)}</strong><p>{item.subject}</p></div></li>)}</ul>{!daily.length && <p className="agenda-empty">이 날짜에 배정된 수업이 없어요.</p>}</aside></div> : <div className="schedule-scroll" tabIndex={0} role="region" aria-label="주간 시간표"><table className="schedule-table"><thead><tr><th>교시</th>{labels.map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{Array.from({
            length: 9
          }, (_, i) => i + 1).map(period => <tr key={period}><th>{period}교시</th>{days.map(day => <td key={day}>{items.filter(item => item.dayOfWeek === day && item.period === period).map(item => <button type="button" className="lesson-card" aria-label={`${name(item)} ${item.subject} ${item.period}교시${admin ? ' 수정' : ''}`} key={item.id} onClick={admin ? () => edit(item) : undefined} disabled={!admin}><strong>{name(item)}</strong><span>{item.subject}</span></button>)}{admin && !items.some(item => item.dayOfWeek === day && item.period === period) && <button type="button" className="empty-slot" aria-label={`${labels[days.indexOf(day)]} ${period}교시 수업 추가`} onClick={() => edit(null, day, period)}>＋ 수업 추가</button>}</td>)}</tr>)}</tbody></table></div>}
    {draft && admin && <Modal title={remove ? '수업 삭제' : '시간표 수업'} onClose={() => setDraft(null)}><form className="api-stack" onSubmit={async e => {
        e.preventDefault();
        const conflict = !remove && items.some(item => item.id !== draft.id && item.dayOfWeek === draft.dayOfWeek && Number(item.period) === Number(draft.period) && (item.teacherId === draft.teacherId || item.classId === draft.classId));
        if (conflict) {
          notify('같은 시간에 교사 또는 학급의 수업이 있어요.');
          return;
        }
        const body = {
          schoolYear: year,
          semester: Number(semester),
          classId: draft.classId,
          teacherId: draft.teacherId,
          dayOfWeek: draft.dayOfWeek,
          period: Number(draft.period),
          subject: draft.subject.trim(),
          room: draft.room
        };
        if (await mutation.run(`/admin/timetables/entries${draft.id ? `/${draft.id}` : ''}`, {
          method: remove ? 'DELETE' : draft.id ? 'PATCH' : 'POST',
          ...(remove ? {} : {
            body
          })
        }, '시간표를 변경했어요.')) {
          state.reload();
          setDraft(null);
        }
      }}>{remove ? <p>{name(draft)} {draft.subject} 수업을 삭제할까요?</p> : <><ClassSelect classes={classes} value={draft.classId} onChange={value => setDraft({
            ...draft,
            classId: value
          })} /><ApiState state={teachers} /><Field label="담당 교사" required value={draft.teacherId} onChange={e => setDraft({
            ...draft,
            teacherId: e.target.value
          })}><option value="">교사 선택</option>{teachers.data?.filter(item => item.role === 'TEACHER' && item.status === 'ACTIVE').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Field><Pagination state={teachers} /><Field label="요일" value={draft.dayOfWeek} onChange={e => setDraft({
            ...draft,
            dayOfWeek: e.target.value
          })}>{days.map((day, i) => <option key={day} value={day}>{labels[i]}</option>)}</Field><Field label="교시" value={draft.period} onChange={e => setDraft({
            ...draft,
            period: e.target.value
          })}>{Array.from({
              length: 9
            }, (_, i) => <option key={i} value={i + 1}>{i + 1}교시</option>)}</Field><Field label="과목" required maxLength={40} value={draft.subject} onChange={e => setDraft({
            ...draft,
            subject: e.target.value
          })} /><Field label="강의실" value={draft.room || ''} onChange={e => setDraft({
            ...draft,
            room: e.target.value
          })} /></>}<SaveButton mutation={mutation}>{remove ? '삭제 확인' : '저장하기'}</SaveButton>{draft.id && !remove && <button type="button" className="text-button danger" onClick={() => setRemove(true)}>수업 삭제</button>}</form></Modal>}
  </section>;
}
