import { useRef, useState } from 'react'
import { dateValue, monthDays, parseDate, shiftDate, todayValue } from './field-utils'
import { readCollection } from '../lib/state'
import { lessonsForDate, recordsForDate } from '../lib/dashboard-calendar'
import { timetableSeed } from '../screens/AdminData'
import './dashboard-calendar.css'

export default function DashboardCalendar({ settings, account, records }) {
  const today = todayValue()
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const dayRefs = useRef({})
  const lessons = readCollection('classroom-timetable', timetableSeed)
  const memos = readCollection('classroom-memos')
  const teacher = account?.name || settings.name
  const classrooms = [...new Set([`${settings.grade}학년 ${settings.classroom}반`, ...lessons.filter(item => item.teacher === teacher).map(item => item.classroom)])]
  const ownRecords = records.filter(item => classrooms.some(classroom => item.student.endsWith(` · ${classroom}`)))
  const [year, monthNumber] = month.split('-').map(Number)
  const days = monthDays(year, monthNumber - 1)
  const selectedLessons = lessonsForDate(lessons, selected, teacher)
  const selectedRecords = recordsForDate(ownRecords, memos, selected, classrooms)
  const label = new Intl.DateTimeFormat('ko', { timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'long' }).format(parseDate(selected))
  function select(date, focus = false) { setSelected(date); setMonth(date.slice(0, 7)); if (focus) requestAnimationFrame(() => dayRefs.current[date]?.focus()) }
  function moveMonth(delta) {
    const date = parseDate(`${month}-01`); date.setUTCMonth(date.getUTCMonth() + delta)
    const last = new Date(date); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0)
    date.setUTCDate(Math.min(Number(selected.slice(-2)), last.getUTCDate()))
    select(dateValue(date))
  }
  function keydown(event, date) {
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
    if (offset) { event.preventDefault(); select(shiftDate(date, offset), true) }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); const weekday = parseDate(date).getUTCDay(); select(shiftDate(date, event.key === 'Home' ? -weekday : 6 - weekday), true) }
    else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); moveMonth(event.key === 'PageUp' ? -1 : 1) }
  }
  return <section className="dashboard-calendar" aria-label="수업과 기록 캘린더">
    <div className="home-calendar-panel"><header className="home-calendar-heading"><div><p className="calendar-eyebrow">나의 수업과 기록</p><h2 id="home-calendar-title" aria-live="polite">{year}년 {monthNumber}월</h2></div><div className="calendar-month-controls"><button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>‹</button><button type="button" className="calendar-today" onClick={() => select(today)}>오늘</button><button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>›</button></div></header>
      <table className="home-calendar-grid" aria-labelledby="home-calendar-title"><thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map(day => <th key={day} scope="col">{day}</th>)}</tr></thead><tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(date => {
        const dayLessons = lessonsForDate(lessons, date, teacher)
        const dayRecords = recordsForDate(ownRecords, memos, date, classrooms)
        return <td key={date}><button ref={element => { dayRefs.current[date] = element }} type="button" className={`home-calendar-day${date.slice(0, 7) !== month ? ' adjacent-month' : ''}`} tabIndex={date === selected ? 0 : -1} aria-pressed={date === selected} aria-current={date === today ? 'date' : undefined} aria-label={`${date} ${dayLessons.length ? `수업 ${dayLessons.length}건` : '수업 없음'} ${dayRecords.length ? `기록 ${dayRecords.length}건` : '기록 없음'}`} onClick={() => select(date)} onKeyDown={e => keydown(e, date)}><span className="day-number">{Number(date.slice(-2))}</span><span className="calendar-day-details">{dayLessons.length > 0 && <span className="lesson-dot">수업 {dayLessons.length}</span>}{dayRecords.length > 0 && <span className="record-dot">기록 {dayRecords.length}</span>}</span></button></td>
      })}</tr>)}</tbody></table><p className="calendar-legend"><span className="lesson-dot">수업</span><span className="record-dot">관찰·메모</span><span>수업은 주간 시간표 기준이에요.</span></p>
    </div>
    <aside className="selected-day-panel" aria-label="선택한 날짜의 수업과 기록"><header><p className="calendar-eyebrow">{selected === today ? '오늘의 일정' : '선택한 날짜'}</p><h2 aria-live="polite">{label}</h2></header><div className="day-agenda-section"><h3>수업 <span>{selectedLessons.length}</span></h3>{selectedLessons.length ? <ul className="day-lessons">{selectedLessons.map(item => <li key={item.id}><span className="period-label">{item.period}교시</span><div><strong>{item.subject}</strong><p>{item.classroom}</p></div></li>)}</ul> : <p className="agenda-empty">이 날짜에 배정된 수업이 없어요.</p>}</div><div className="day-agenda-section"><h3>남긴 기록 <span>{selectedRecords.length}</span></h3>{selectedRecords.length ? <ul className="day-records">{selectedRecords.map(item => <li key={`${item.kind}-${item.id}`}><span>{item.kind}</span><strong>{item.title}</strong><p>{item.content}</p></li>)}</ul> : <p className="agenda-empty">아직 남긴 기록이 없어요.</p>}</div><div className="calendar-actions"><a href={`#/students?date=${selected}`}>이 날짜에 관찰 작성</a><a href="#/timeline">타임라인 보기 →</a></div></aside>
  </section>
}
