> **과거 연동 기록**: 2026-10-28부터 현재 프론트는 백엔드 없이 동작합니다. 현재 실행 방법은 [README](../README.md), 기능과 경계는 [독립 프론트 설명](frontend-standalone.md)을 확인하세요. 아래 서버 연결 내용은 현재 실행 설정이 아닙니다.

# API v1.0.0 프론트 연결 기록

> API 연동용 백엔드 수정본을 `gyo624_BackEnd` 폴더에 반영했습니다. 로컬 프론트의 `.env.local`은 교육24 백엔드의 8081 포트로 연결합니다.


기준: 사용자가 제공한 `API_명세서.md` v1.0.0. 기본 경로 `/api/v1`.
이번 요청으로 백엔드 소스를 수정하고 프론트와 연결했습니다. 실제 사용자 DB에는 마이그레이션이나 데이터 변경을 실행하지 않았습니다. 이 문서는 구현된 계약과 외부 설정/정책 확정 항목을 구분합니다.

## 실행과 설정

- `.env.example`을 참고하여 `.env.local`을 생성합니다.
- `VITE_API_BASE_URL=/api/v1`: 프론트가 사용하는 API 경로. 운영에서는 HTTPS 역방향 프록시로 제공합니다.
- `API_PROXY_TARGET=http://127.0.0.1:8081`: 개발 서버가 `/api` 요청을 전달할 백엔드 주소입니다. Vite 설정 변경 후 서버를 재시작합니다.
- 모든 `VITE_*` 값은 빌드 결과에 공개됩니다. 토큰·비밀번호·DB 접속정보를 넣지 않습니다.
- API 서버가 없거나 명세와 다르면 오류와 다시 불러오기를 표시합니다. 예시 학생·고정 계정·localStorage 데이터로 대체하지 않습니다.

## 공통 처리

- JSON 성공 `{data,meta}`, 목록 `data: [] + meta`의 page/size/totalPages, 오류 `{error:{code,message,fields},meta}`.
- `Authorization: Bearer`, UUID v4 `X-Request-Id`.
- 중복 방지 작업에 `Idempotency-Key`. 같은 본문 실패 재시도는 같은 키, 본문 변경이나 성공 후 새 작업은 새 키.
- 만료된 보호 요청은 한 번의 토큰 갱신을 공유하고 원래 요청을 1회 재시도합니다. 로그인 실패는 갱신하지 않습니다. 갱신/재시도 401 시 세션 해제. 409 수정 충돌은 사용자의 초안을 덮어쓰지 않고 표시합니다.
- Access Token은 메모리, Refresh Token은 탭의 sessionStorage에 저장합니다. 비밀번호 자체를 저장하지 않습니다. 브라우저 스크립트가 Refresh Token을 읽을 수 있는 구조이므로, 운영 보안 정책에서 HttpOnly Cookie를 선택하면 서버 갱신 계약과 함께 조정해야 합니다.
- 로그아웃 시 서버 토큰 폐기를 요청하고 이 기기의 세션은 해제합니다. 서버 요청 실패는 성공으로 숨기지 않고 알립니다.
- 요청 취소, 세션 세대 구분으로 계정 전환 후 이전 응답을 폐기합니다. 조회 데이터는 계정 변경 시 다시 불러옵니다.
- 서버의 사용자 ID와 `TEACHER/ADMIN` 역할을 사용합니다. 예전 로컬 계정·데모 비밀번호로 로그인할 수 없습니다.
- 학생/학급은 서버 UUID를 사용합니다. 이름·학급 문자열로 저장된 기존 로컬 기록을 자동 업로드하거나 임의 학생에게 연결하지 않습니다.

## 화면 연결

| 화면 | 요청 |
|---|---|
| 로그인/복원/로그아웃 | POST /auth/login, /auth/refresh, /auth/logout; GET /me |
| 초대 | GET /invitations/{token}, POST /invitations/{token}/accept |
| 비밀번호 복구 | POST /auth/password/forgot; GET/POST /auth/password/reset/{token} |
| 온보딩 | GET/PATCH /onboarding; POST /onboarding/complete |
| 학급/학생 선택 | GET /classes, /classes/{classId}/students |
| 관찰 | GET/POST /students/{studentId}/observations; GET/PATCH/DELETE /observations/{id} |
| 일괄 관찰 | POST /classes/{classId}/observations/bulk/validate, /bulk |
| 진로 | GET/POST /students/{studentId}/career-records; PATCH/DELETE /career-records/{id} |
| 생기부 보드 | GET /classes/{classId}/record-board, /students/{studentId}/record-board |
| 항목 편집 | GET/POST /students/{studentId}/record-items; GET/PATCH /record-items/{id}; POST /submit |
| 이력 | GET /record-items/{id}/versions; POST /versions/{versionId}/restore |
| 검사 | POST /record-items/{id}/gate-checks; GET /gate-checks/latest; GET /gate-rules |
| 내보내기 | POST /exports/neis/preview, /exports/neis; GET /exports/{id}, /download |
| 이관 | POST /transfers/preview, /transfers; GET /transfers/{id}; POST /cancel |
| 알림 | GET /notifications, /notifications/unread-count; PATCH /{id}/read; POST /read-all; DELETE /{id} |
| 설정 | GET/PATCH /settings/profile, /settings/notifications; POST /settings/password/change |
| 관리자 학교 설정 | GET/PATCH /settings/school |
| 관리자 집계 | GET /admin/dashboard/summary, /completion, /activity |
| 교사 관리 | GET /admin/teachers, /{id}; POST /invitations, /invitations/bulk, /invitations/{id}/resend; PATCH /{id}, /{id}/status; DELETE /{id} |
| 명단 | POST /admin/classes; PATCH/DELETE /admin/classes/{id}; POST /admin/classes/{id}/students; PATCH /admin/students/{id}; 명단 사전 검증·등록·결과·양식 |
| 시간표 | GET /timetables; 관리자 POST/PATCH/DELETE /admin/timetables/entries; 파일 사전 검증·등록 |
| 감사 로그 | GET /admin/audit-logs, /{id}; POST /export |

## 업무 규칙

- 관찰 미래 날짜 차단은 프론트와 서버 양쪽에서 적용합니다.
- 일괄 관찰은 공통 내용과 학생별 내용을 사용하며 선택 학생을 페이지 간 유지합니다. 날짜/범주/본문/태그/선택 변경 시 사전 검증을 무효화합니다. 최종 저장의 원자성은 서버가 보장합니다.
- 생기부 PATCH는 조회한 version을 전달합니다. 수정 충돌 시 초안 보관 후 최신 내용 조회를 안내합니다.
- 제출 버튼은 저장된 최신 내용에 대해 이 화면에서 실행한 검사만 근거로 사용합니다. 최근 검사 조회만으로 제출을 허용하지 않습니다. ERROR/FAIL은 차단하고 WARNING은 명시적으로 확인해야 합니다. 서버가 제출 순간 다시 검사해야 합니다.
- 내보내기는 서버 미리보기 확인 후 작업을 생성하고 대기/처리/완료/실패/만료 상태를 표시합니다. 성공한 작업의 보호 다운로드 API에서 파일을 받습니다. 브라우저가 CSV를 만들어 검사를 우회하지 않습니다.
- 이관은 학년도/학급/학생 ID, 포함 기록 종류, SKIP/OVERWRITE/CREATE_COPY를 사용합니다. 조건 변경 시 미리보기를 폐기하고 실행 전 확인합니다. QUEUED 작업에만 취소 버튼이 있습니다.
- 시간표 편집은 ADMIN 전용이며 교사는 조회만 가능합니다. 1~9교시, 직접 과목 입력, 학급 우선 표시를 유지합니다. 100개씩 조회해 누락된 교시가 생기지 않도록 페이지를 합칩니다. 서버의 교사·학급 충돌 검증이 최종 기준입니다.
- 관리자가 자신의 역할을 해제하거나 비활성화하는 UI는 차단합니다. 이는 마지막 관리자 보호보다 보수적인 규칙이며, 다른 관리자에 대한 변경에서도 마지막 관리자 검증은 서버가 수행해야 합니다.
- 감사 로그는 서버가 기록합니다. 브라우저에서 예시 작업자를 붙이거나 변경 이력을 생성하지 않습니다.

## 명세에 없는 기능

- 평가, 수업 메모, 수업 교체/날짜별 교체 API는 정의되지 않아 활성 저장/요청 메뉴에서 제외했습니다. 임의 주소를 만들거나 로컬 저장 성공을 표시하지 않습니다.
- 타임라인은 선택한 학생의 관찰 API를 사용합니다. 학교 전체 관찰·메모 통합 타임라인으로 간주하지 않습니다.
- 수업 녹음은 이전 요청대로 UI만 유지합니다. 마이크·음성 업로드 API를 새로 만들지 않았습니다.
- 기존 `src/screens`, 일부 `src/lib`의 로컬 데이터 기반 화면·테스트는 보존되어 있으나 App 진입 경로에서 사용하지 않습니다. 운영 화면은 `src/api`를 사용합니다(녹음 UI 제외). 기존 사용자 로컬 데이터를 지우지 않습니다.

## 실제 백엔드 연결 (2026-10-26)

백엔드에 명세 기반 `/api/v1`을 구현했습니다. `/me`, data/meta 및 error/meta 응답, 외부 UUID, 1부터 시작하는 페이지, 학급/학생 배정과 권한, 설정, 관찰·진로·생기부·파일·작업 API를 사용합니다. 기존 숫자 ID와 승인/AI 모델의 데이터는 보존하며, 외부 접근은 차단한 `/api/legacy/v1`에 소스를 분리했습니다.

- 계정은 기존 BCrypt `users`를 재사용합니다. 새 교사는 관리자 초대 링크에서 비밀번호를 설정하고 가입합니다.
- 초대 생성/재발송 응답의 invitationUrl을 관리자가 복사하여 전달할 수 있습니다. 메일 미설정을 발송 성공으로 표시하지 않습니다.
- 비밀번호 변경/재설정 시 기존 세션을 폐기하므로 프론트는 로그인 화면으로 돌아갑니다.
- 관찰 생성에는 선택한 classId와 schoolYear도 전달하여 여러 학년도에 소속된 동일 학생의 대상 학급을 구분합니다.
- 학교와 담당 학년도에 접근할 수 있어야 기록을 읽을 수 있습니다. 이관하지 않은 과거 학년도 본문을 새 담당 교사에게 노출하지 않습니다.
- 감사 로그 export 응답에 fileId/downloadPath를 추가하고 관리자 전용 다운로드를 연결했습니다.
- 로컬 실행/외부 서비스 설정/기존 데이터 매핑 주의사항은 백엔드 README.md를 참고합니다.

## 명세에 상세 DTO가 없어 백엔드와 함께 확정한 필드

아래 필드를 이번 백엔드와 프론트에서 함께 사용합니다. 공식 명세서에 반영할 때 팀 검토가 필요합니다.

- refresh/logout: JSON `{refreshToken}`. `/me`: 직접 data 안에 `{id,name,email,role,onboardingCompleted,school?}`.
- 초대 조회: data 안에 email, schoolName 또는 school.name. 토큰은 `/#/invite?token=...`으로 전달합니다.
- 학생/학급 목록: 배열 원소의 `id,name`; 학생은 `number`, 학급은 `grade,classNumber`. 학급 label에는 className도 읽을 수 있습니다.
- 진로/관찰/생기부 상세는 `id,version`을 반환해야 합니다. 생기부 생성/내보내기의 항목 코드는 명세에 예시로 명시된 BEHAVIOR_AND_OVERALL_OPINION만 노출합니다. 다른 항목 코드는 서버 enum 합의 후 늘립니다.
- 계정 상태 변경: ACTIVE/SUSPENDED. 일괄 초대 본문 `{invitations:[...]}`. 초대 재발송에는 교사 조회 응답의 invitationId가 필요합니다.
- 학급 생성/수정: `{schoolYear,name,grade,classNumber}`. 학생 등록/수정: `{name,number}`.
- 프로필: `{name,phone}`. 알림 설정: `{notificationEmail,notificationInApp}`. 학교 변경: `{name}`. 비밀번호 변경: `{currentPassword,newPassword,passwordConfirmation}`.
- 파일 검증/등록: multipart/form-data의 file 필드. 명세의 공통 JSON 규정만으로는 파일 전송 방식이 확정되지 않으므로 서버와 합의해야 합니다.
- 검증 응답: HTTP 성공에 valid:false 또는 errors가 있으면 차단. 명세에 없는 검증 ID는 임의로 만들지 않습니다.
- 경고 확인: submit/내보내기에 warningsAcknowledged 전달. 서버에서 실제 경고 승인 필드를 합의해야 합니다.
- 내보내기 생성은 data.exportId(또는 data.id), 이관은 data.transferId(또는 data.id), 명단 등록은 data.jobId를 반환해야 합니다.
- 감사 로그 export는 fileId/downloadPath/만료 정보를 반환합니다. 추가한 `/admin/audit-logs/exports/{fileId}/download`에서 보호 다운로드합니다.
- 명세 13절의 생성 권한이 담당 교사이므로 관리자에게 내보내기 생성 UI를 제공하지 않습니다. 22절의 관리자 O와 정책 합의가 필요합니다.

## 검증

- `npm run lint`, `npm run build`, `npm test`.
- API 전송 테스트: 인증 헤더·요청 ID·중복 방지, 동시 토큰 갱신, 세션 폐기, 이전 계정 응답 차단, 409, 네트워크 실패, 204/202, multipart.
- 명세 응답을 제공하는 별도 임시 서버로 브라우저에서 로그인·학급/학생 선택·관찰 생성·일괄 검증/저장·검사 오류 시 제출 차단·역할별 관리자 접근·모바일 화면·서버 연결 실패 시 성공 처리하지 않는 동작을 확인했습니다. 실제 백엔드/학생 데이터를 대상으로 하는 통합 검증은 아닙니다.

## 이번 실제 연동 검증

- H2 PostgreSQL 호환 모드로 실제 Spring HTTP 서버·영속 작업 큐를 검증했습니다. 프론트의 가짜 API 응답을 사용하지 않았습니다.
- 브라우저에서 관리자 로그인, 학급/학생 등록, 담당 학급 초대 링크 생성, 교사 로그인, 홈 캘린더 시간표, 학생 관찰 저장과 로그아웃을 확인했습니다.
- 2026-10-28 로컬 PostgreSQL 17.11의 `education24` DB를 백업한 뒤 V2 마이그레이션을 적용했습니다. 실제 DB에서 관리자 로그인·정보 조회, 교사 초대 확인·가입·로그인, 교사의 관리자 API 접근 거부(403)를 검증했습니다. 프론트 5173 → 백엔드 8081 프록시로 브라우저 관리자 로그인과 대시보드 표시도 확인했습니다.
- 반영한 백엔드 자동 테스트 29개와 프론트 테스트 49개, lint 및 빌드가 통과했습니다. SMTP, ClamAV, AWS 환경은 검증하지 않았습니다.
