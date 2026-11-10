# 교육24 React 프론트엔드

현재 프론트엔드는 학급·관찰·생기부를 브라우저 저장소에 두고, 계정은 Firebase 프로젝트 `gyo624`의 인증과 Firestore로 관리합니다. 학교, 학급, 시간표, 학사일정은 나이스 교육정보 개방 API로 불러옵니다.

## 실행

```sh
npm install
npm run dev
```

나이스 인증키는 `gyo624_FrontEnd/.env.local`의 `NEIS_API_KEY=` 오른쪽에 적습니다. 키는 개발 서버만 읽고 화면으로 전달하지 않습니다. 저장한 뒤 설정의 키 확인을 누르고 학교를 선택하면 시간표가 실제 데이터로 바뀝니다. 개발 서버를 다시 켤 필요는 없습니다.

## 계정

처음 열면 학교 관리자 계정을 만듭니다. 관리자는 교사 계정 화면에서 초대 링크를 만들고, 초대받은 사람은 그 링크로 비밀번호를 설정해 가입합니다. 비밀번호 재설정 메일은 Firebase Authentication이 보냅니다.

Firebase 웹 설정은 `gyo624_FrontEnd/.env.local`에 둡니다. 예시 키 이름은 `.env.example`에 있습니다.

## 저장 방식과 범위

- 학급·학생·관찰·진로·생기부·시간표·알림은 현재 브라우저의 localStorage에 저장됩니다.
- 저장 키: `education24-ui-workspace-v1`. 로그인 세션은 sessionStorage의 `education24-ui-session-v1`을 사용합니다.
- 기존 API 세션 및 과거 프론트 저장소와 별도입니다. 기존 DB 데이터를 가져오거나 변경하지 않습니다.
- 브라우저/도메인/포트가 다르면 데이터도 별도입니다. 저장소를 지우면 작성 내용은 사라집니다.
- 계정, 역할, 초대는 Firebase에 저장되어 브라우저가 달라도 같은 학교 계정을 사용합니다. 초대 링크는 가입할 사람에게 직접 전달하고, 비밀번호 재설정은 이메일로 전달됩니다.
- 실제 학생 개인정보 대신 화면 확인용 자료를 사용하세요.

## 구조

`src/App.jsx` → `src/api/*` 화면 → `src/api/client.js` → `src/data/local-client.js`

계정 요청은 `src/data/firebase-accounts.js`가 Firebase Authentication과 Firestore로 처리합니다. 그 외 화면 데이터는 `src/data/local-store.js`의 브라우저 저장소를 사용합니다.

`src/api`라는 디렉터리명은 이전 구조를 유지한 것입니다. 현재 해당 화면에서 HTTP API를 호출하지 않습니다. 이전 HTTP 클라이언트는 `src/integration/http-client.js`에 보존했으며 앱에서 가져오지 않습니다. 향후 연동은 이 데이터 경계를 교체하고 당시 API 계약에 맞춰 검증하면 됩니다.

## 검사

```sh
npm run lint
npm test
npm run build
```

[페이지별 변경과 기능 설명](docs/frontend-standalone.md)을 참고하세요. 이전 API 연동 문서는 과거 기록이며 현재 실행 방법이 아닙니다.
