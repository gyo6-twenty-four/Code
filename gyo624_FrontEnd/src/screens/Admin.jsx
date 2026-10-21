import { useState } from 'react'
import { InfoPanel, ListRow } from '../components/ui'
import { readCollection } from '../lib/state'
import { WeeklyChart } from './Teacher'
import { rosterSeed, teacherSeed } from './AdminData'
export default function Admin() {
  const [teachers] = useState(() => readCollection('classroom-teachers', teacherSeed))
  const [rosters] = useState(() => readCollection('classroom-rosters', rosterSeed))
  const pending = 2 + teachers.filter(item => !teacherSeed.some(seed => seed.id === item.id) && item.status === '대기').length
  const classCount = 12 + rosters.filter(item => !rosterSeed.some(seed => seed.id === item.id)).length
  return <div className="teacher-dashboard admin-dashboard">
    <div className="metric-grid">{[['활성 교사', '18명', `초대 대기 ${pending}명`], ['운영 학급', `${classCount}개`, '이번 학년도'], ['기록 확인', '86%', '지난주보다 4% 높아요']].map(([label, value, caption]) => <section className="metric-card" key={label}><h2>{label}</h2><p className="metric-value">{value}</p><p>{caption}</p></section>)}</div>
    <div className="admin-columns"><WeeklyChart /><InfoPanel className="desktop-only" title="운영 알림" lines={['학교 전체 현황을 요약해요', '개별 학생 내용은 표시하지 않아요']} />
      <section className="admin-recent"><h2><span className="mobile-only">확인할 내용</span><span className="desktop-only">최근 확인할 내용</span></h2><div className="settings-list">{[['초대 대기', '수락을 기다리는 교사 계정', `${pending}명`, '/admin/teachers'], ['명단 확인', '학급 명단을 확인해 주세요', '1건', '/admin/rosters'], ['기록 현황', '학급별 진행 상태를 확인해요', '보기', '/admin/audit']].map(([title, detail, meta, href], i) => <ListRow key={title} className={i ? 'desktop-only' : ''} title={title} detail={detail} meta={meta} href={href} />)}</div></section>
      <InfoPanel className="admin-guide desktop-only" title="기록을 한 번에 확인해요" lines={['학교의 기록 진행 상황과 운영 이슈를 살펴봐요.']} />
    </div>
  </div>
}
