import { className } from './model';
import { useEffect, useState } from 'react';
import { Field, Modal, PrimaryButton } from '../components/ui';
import { dateValue, monthDays, parseDate, todayValue } from '../components/field-utils';
import { resource } from './client';
import { useMutation, usePage, useResource } from './hooks';
import { ApiState, ClassSelect, Pagination, SaveButton } from './shared';
import { loadClasses, loadSchedule, loadTimetable, onNeisSchool, readNeisSchool } from './neis';
import '../components/dashboard-calendar.css';
function schoolSemester(value = todayValue()) {
  const month = Number(value.slice(5, 7));
  return month >= 3 && month <= 8 ? '1' : '2';
}
function shiftDate(value, count) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + count);
  return dateValue(date);
}
function mondayOf(value) {
  return shiftDate(value, -((parseDate(value).getUTCDay() + 6) % 7));
}
function monthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}
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
  const [semester, setSemester] = useState(schoolSemester),
    [selected, setSelected] = useState(todayValue),
    [month, setMonth] = useState(todayValue().slice(0, 7)),
    [weekStart, setWeekStart] = useState(() => mondayOf(todayValue()));
  const [draft, setDraft] = useState(null),
    [remove, setRemove] = useState(false);
  const [neisSchool, setNeisSchool] = useState(readNeisSchool);
  const [neisClassId, setNeisClassId] = useState('');
  const [neisClasses, setNeisClasses] = useState({ loading: false, error: '', data: [] });
  const [neisLessons, setNeisLessons] = useState({ loading: false, error: '', data: [] });
  const [schedule, setSchedule] = useState([]);
  const [attempt, setAttempt] = useState(0);
  const admin = account.role === 'ADMIN';
  const neisOn = Boolean(neisSchool);
  useEffect(() => onNeisSchool(() => { setNeisSchool(readNeisSchool()); setNeisClassId(''); }), []);
  useEffect(() => {
    if (!neisOn) return undefined;
    const controller = new AbortController();
    setNeisClasses({ loading: true, error: '', data: [] });
    loadClasses(neisSchool, year, controller.signal).then(data => setNeisClasses({ loading: false, error: '', data })).catch(error => {
      if (error.name !== 'AbortError') setNeisClasses({ loading: false, error: error.message, data: [] });
    });
    return () => controller.abort();
  }, [neisOn, neisSchool, year, attempt]);
  useEffect(() => {
    if (!neisOn || !home) return undefined;
    const controller = new AbortController();
    const range = monthBounds(month);
    loadSchedule(neisSchool, range, controller.signal).then(setSchedule).catch(error => {
      if (error.name !== 'AbortError') setSchedule([]);
    });
    return () => controller.abort();
  }, [neisOn, neisSchool, home, month, attempt]);
  useEffect(() => {
    if (!neisOn || !neisClassId) {
      setNeisLessons({ loading: false, error: '', data: [] });
      return undefined;
    }
    const found = neisClasses.data.find(item => item.id === neisClassId);
    if (!found) return undefined;
    const controller = new AbortController();
    const range = home ? monthBounds(month) : { from: weekStart, to: shiftDate(weekStart, 4) };
    setNeisLessons({ loading: true, error: '', data: [] });
    loadTimetable(neisSchool, { year, semester, grade: found.grade, classLabel: found.classLabel, ...range }, controller.signal).then(data => setNeisLessons({ loading: false, error: '', data })).catch(error => {
      if (error.name !== 'AbortError') setNeisLessons({ loading: false, error: error.message, data: [] });
    });
    return () => controller.abort();
  }, [neisOn, neisClassId, neisClasses.data, neisSchool, year, semester, month, weekStart, home, attempt]);
  const state = useResource(!neisOn && (admin && !classId ? null : resource('/timetables', {
    schoolYear: year,
    semester,
    classId,
    ...(!admin ? {
      teacherId: account.id
    } : {})
  })), false, true);
  const teachers = usePage(admin ? '/admin/teachers' : null);
  const mutation = useMutation(notify);
  const localItems = Array.isArray(state.data) ? state.data : state.data?.entries || [];
  const items = neisOn ? neisLessons.data : localItems;
  const classSource = neisOn ? { ...neisClasses, error: neisClasses.error ? new Error(neisClasses.error) : null, reload: () => setAttempt(value => value + 1) } : classes;
  const name = item => item.className || item.class?.name || className((neisOn ? neisClasses.data : classes.data)?.find(value => value.id === item.classId));
  const daily = items.filter(item => item.date ? item.date === selected : days[parseDate(selected).getUTCDay() - 1] === item.dayOfWeek);
  const dayEvents = schedule.filter(item => item.date === selected);
  const [yy, mm] = month.split('-').map(Number);
  const weekNames = ['일', '월', '화', '수', '목', '금', '토'];
  function lessonOn(date) {
    if (neisOn) return items.some(item => item.date === date);
    const key = days[parseDate(date).getUTCDay() - 1];
    return Boolean(key && date.slice(0, 7) === month && items.some(item => item.dayOfWeek === key));
  }
  function dayTitle(value) {
    const date = parseDate(value);
    return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 ${weekNames[date.getUTCDay()]}요일`;
  }
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
  const neisView = { ...neisLessons, error: neisLessons.error ? new Error(neisLessons.error) : null, reload: () => setAttempt(value => value + 1) };
  return <section className="api-stack">{neisOn ? <p className="dialog-hint">{neisSchool.schoolName}의 나이스 시간표와 학사일정이에요. 이 화면에서는 수업을 고칠 수 없어요.</p> : <p className="dialog-hint">지금은 화면 확인용 시간표예요. <a href={`#${admin ? '/admin/settings' : '/settings'}`}>설정</a>에서 나이스 학교를 연결하면 실제 시간표로 바뀝니다.</p>}<div className="api-toolbar"><ClassSelect classes={classSource} value={neisOn ? neisClassId : classId} onChange={neisOn ? setNeisClassId : selectClass} empty={neisOn ? '이 학년도의 나이스 학급이 없어요.' : undefined} /><Field label="학기" value={semester} onChange={e => setSemester(e.target.value)}><option value="1">1학기</option><option value="2">2학기</option></Field>{!neisOn && admin && <PrimaryButton onClick={() => edit(null)}>수업 추가</PrimaryButton>}{!neisOn && !admin && !home && <p className="dialog-hint">시간표 변경은 학교 관리자에게 요청해 주세요.</p>}</div>{!neisOn && <ApiState state={state} empty={admin && !classId ? '시간표를 확인할 학급을 선택해 주세요.' : '등록된 시간표가 없어요.'} />}{neisOn && !neisClassId && <p className="agenda-empty">학급을 선택하면 나이스 시간표를 불러와요.</p>}{neisOn && neisClassId && <ApiState state={neisView} empty="이 기간의 나이스 시간표가 없어요." />}{neisOn && !home && <div className="schedule-caption"><button type="button" className="secondary-button" onClick={() => setWeekStart(shiftDate(weekStart, -7))}>이전 주</button><span>{weekStart} – {shiftDate(weekStart, 4)}</span><button type="button" className="secondary-button" onClick={() => setWeekStart(shiftDate(weekStart, 7))}>다음 주</button></div>}
    {home ? <div className="dashboard-calendar"><aside className="selected-day-panel"><p className="calendar-eyebrow">{selected === todayValue() ? '오늘 수업' : '선택한 날'}</p><h2>{dayTitle(selected)}</h2><ul className="day-lessons">{daily.map(item => <li key={item.id}><span className="period-label">{item.period}교시</span><div><strong>{item.subject}</strong><p>{name(item)}{item.room ? `, ${item.room}` : ''}</p></div></li>)}</ul>{!daily.length && <p className="agenda-empty">{neisOn && !neisClassId ? '학급을 선택하면 그날의 수업이 보여요.' : '이 날짜에 배정된 수업이 없어요.'}</p>}{dayEvents.length > 0 && <div className="day-agenda-section"><h3>학사일정</h3><ul className="day-records">{dayEvents.map(item => <li key={`${item.date}-${item.name}`}><span>나이스</span><strong>{item.name}</strong>{item.detail && <p>{item.detail}</p>}</li>)}</ul></div>}</aside><div className="home-calendar-panel"><header className="home-calendar-heading"><h2>{yy}년 {mm}월</h2><div className="calendar-month-controls"><button type="button" aria-label="이전 달" onClick={() => move(-1)}>‹</button><button type="button" className="calendar-today" onClick={() => {
              setMonth(todayValue().slice(0, 7));
              setSelected(todayValue());
            }}>오늘</button><button type="button" aria-label="다음 달" onClick={() => move(1)}>›</button></div></header><table className="home-calendar-grid"><thead><tr>{weekNames.map(day => <th key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({
              length: 6
            }, (_, i) => <tr key={i}>{monthDays(yy, mm - 1).slice(i * 7, i * 7 + 7).map(date => <td key={date}><button type="button" className={`home-calendar-day${date.slice(0, 7) !== month ? ' adjacent-month' : ''}${lessonOn(date) ? ' has-lesson' : ''}`} aria-pressed={selected === date} aria-label={`${dayTitle(date)} 수업 조회`} aria-current={date === todayValue() ? 'date' : undefined} onClick={() => setSelected(date)}><span className="day-number">{Number(date.slice(-2))}</span>{lessonOn(date) && <span className="day-mark" />}</button></td>)}</tr>)}</tbody></table></div></div> : <div className="schedule-scroll" tabIndex={0} role="region" aria-label="주간 시간표"><table className="schedule-table"><thead><tr><th>교시</th>{labels.map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{Array.from({
            length: 9
          }, (_, i) => i + 1).map(period => <tr key={period}><th>{period}교시</th>{days.map(day => <td key={day}>{items.filter(item => item.dayOfWeek === day && item.period === period).map(item => <button type="button" className="lesson-card" aria-label={`${name(item)} ${item.subject} ${item.period}교시${admin && !neisOn ? ' 수정' : ''}`} key={item.id} onClick={admin && !neisOn ? () => edit(item) : undefined} disabled={neisOn || !admin}><strong>{name(item)}</strong><span>{item.subject}</span></button>)}{admin && !neisOn && !items.some(item => item.dayOfWeek === day && item.period === period) && <button type="button" className="empty-slot" aria-label={`${labels[days.indexOf(day)]} ${period}교시 수업 추가`} onClick={() => edit(null, day, period)}>＋ 수업 추가</button>}</td>)}</tr>)}</tbody></table></div>}
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
