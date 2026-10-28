# 교육24 React 프론트엔드

현재는 **백엔드 없이 실행하는 독립 프론트엔드**입니다. 화면의 로그인·조회·저장 흐름은 브라우저 저장소로 동작합니다. 서버 실행, DB, API 환경변수가 필요하지 않습니다.

## 실행

```sh
npm install
npm run dev
```

기존 개발 서버가 켜져 있었다면 종료 후 다시 실행하세요. Vite의 API 프록시를 제거했으므로 기존 `.env.local`의 `API_PROXY_TARGET`은 사용하지 않습니다.

## 화면 확인용 계정

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 교사 | teacher@education24.local | Edu24!2026 |
| 관리자 | admin@education24.local | Edu24!2026 |
| 다른 교사 | teacher2@education24.local | Edu24!2026 |

계정 안내는 제품 화면에 표시하지 않습니다. 로그인하면 계정 역할에 맞는 메뉴가 열립니다. 이 계정과 권한 판정은 UI 개발용이며 운영 인증이 아닙니다.

## 저장 방식과 범위

- 학급·학생·관찰·진로·생기부·시간표·알림은 현재 브라우저의 localStorage에 저장됩니다.
- 저장 키: `education24-ui-workspace-v1`. 로그인 세션은 sessionStorage의 `education24-ui-session-v1`을 사용합니다.
- 기존 API 세션 및 과거 프론트 저장소와 별도입니다. 기존 DB 데이터를 가져오거나 변경하지 않습니다.
- 브라우저/도메인/포트가 다르면 데이터도 별도입니다. 저장소를 지우면 작성 내용은 사라집니다.
- 초대 링크와 비밀번호 변경 흐름도 같은 브라우저 안에서만 확인합니다. 이메일은 발송하지 않으며 다른 사용자와 실시간 공유하지 않습니다.
- 실제 학생 개인정보 대신 화면 확인용 자료를 사용하세요.

## 구조

`src/App.jsx` → `src/api/*` 화면 → `src/api/client.js` → `src/data/local-client.js` → `src/data/local-store.js`

`src/api`라는 디렉터리명은 이전 구조를 유지한 것입니다. 현재 해당 화면에서 HTTP API를 호출하지 않습니다. 이전 HTTP 클라이언트는 `src/integration/http-client.js`에 보존했으며 앱에서 가져오지 않습니다. 향후 연동은 이 데이터 경계를 교체하고 당시 API 계약에 맞춰 검증하면 됩니다.

## 검사

```sh
npm run lint
npm test
npm run build
```

[페이지별 변경과 기능 설명](docs/frontend-standalone.md)을 참고하세요. 이전 API 연동 문서는 과거 기록이며 현재 실행 방법이 아닙니다.
