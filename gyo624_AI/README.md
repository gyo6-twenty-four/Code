# 교육24 AI — FastAPI

프론트엔드 안에 있던 세특 생성 서버와 생성 지침을 Python으로 분리한 서비스입니다. 기존 화면의 요청·응답 형식을 유지합니다. 실행에 프론트 소스나 JavaScript 런타임이 필요하지 않습니다.

## 시작하기

Python 3.12 이상과 `uv`를 사용합니다. 명령은 이 폴더에서 실행합니다.

```sh
uv sync --locked
cp .env.example .env.local
```

`.env.local`에서 다음을 설정합니다. 기존 `.env.local`이 있다면 복사로 덮어쓰지 말고 필요한 항목을 추가합니다.

- `OPENAI_API_KEY`: 모델 호출 키입니다. 프론트 폴더나 `VITE_` 변수에 두지 않습니다.
- `FIREBASE_WEB_API_KEY`: 프론트가 로그인하는 Firebase 프로젝트의 웹 API 키입니다. 같은 프로젝트여야 합니다. 서비스 계정 비밀키를 넣는 칸이 아닙니다.
- `AI_MODEL`: 사용할 모델을 명시하려면 설정합니다. 미설정 기본값은 기존 코드에서 가져왔으며 실제 사용 가능 여부는 모델 제공자에서 확인해야 합니다.
- `AI_PROVIDER`: `openai`, `gemini`, `anthropic`입니다. OpenAI 이외의 제공자는 `AI_API_KEY`를 설정합니다.

```sh
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

- API 문서: <http://127.0.0.1:8001/docs>
- 프로세스 확인: <http://127.0.0.1:8001/health>
- 모델 설정 유무: <http://127.0.0.1:8001/api/setek/status>

상태 API는 키가 설정되었는지만 확인합니다. 실제 키의 유효성이나 모델 가용성을 검사하지 않습니다. 생성 API는 유효한 Firebase ID 토큰을 요구하며, 로컬 실행에도 인증 우회는 없습니다.

## 프론트 연결

다른 터미널에서 `../gyo624_FrontEnd`의 `npm run dev`를 실행합니다. Vite가 `/api/setek` 요청을 `http://127.0.0.1:8001`로 전달합니다. 주소 변경 시 프론트의 `.env.local`에 `SETEK_PROXY_TARGET`을 설정하고 Vite를 다시 시작합니다.

정적 배포에서는 Vite 프록시가 없으므로 프론트의 `VITE_SETEK_ORIGIN`을 배포한 FastAPI 주소로 설정하고 다시 빌드합니다. AI의 `ALLOWED_ORIGINS`에는 허용할 프론트 주소를 쉼표로 구분해 설정합니다. 기존 Worker 주소가 남아 있으면 브라우저는 계속 그 주소를 호출하므로 전환 시 확인해야 합니다.

현재 연결은 **프론트 → FastAPI**입니다. 향후 **프론트 → Java 백엔드 → FastAPI**로 연결할 때는 백엔드 담당자와 서비스 인증·권한·저장 계약을 먼저 합의해야 합니다. 이 분리 작업에서 Java 백엔드는 수정하지 않았습니다.

## 폴더별 역할

```text
app/
  main.py            # FastAPI 경로, 오류 응답, 서비스 연결
  config.py          # AI 전용 환경변수
  schemas.py         # 요청·응답 형식, 입력 검증
  auth.py            # Firebase ID 토큰 확인
  providers.py       # OpenAI / Gemini / Anthropic HTTP 호출
  prompt_builder.py  # 입력을 모델 프롬프트로 구성
  prompts/
    system.txt       # 기존 공통 생성 지침
    sources.txt      # 문장별 근거 출력 지침
  generation.py      # 생성·분량 보강·근거 응답·사용량 제한
  fields.py          # 입력 항목, 글자·바이트·문자 위치 계산
  body_limit.py      # 요청 본문 크기 제한
tests/
  fixtures/          # 기존 JavaScript에서 만든 가상 입력·프롬프트
```

생성 지침을 바꾸려면 `prompts/`, 생성 호출 방식을 바꾸려면 `providers.py`, 결과 처리를 바꾸려면 `generation.py`부터 확인합니다. 저장·관리자 업무는 이 서비스의 책임에 포함하지 않습니다.

## API 계약

| 경로 | 용도 | 인증 |
| --- | --- | --- |
| `GET /health` | 프로세스 실행 확인 | 없음 |
| `GET /api/setek/status` | 제공자와 키 설정 유무 | 없음 |
| `POST /api/setek/generate` | 초안 생성·분량 축약 | `Authorization: Bearer <Firebase ID token>` |

프론트와 호환되도록 HTTP JSON은 `camelCase`, Python 내부는 `snake_case`를 사용합니다. `/docs`에서 전체 형식을 볼 수 있습니다.

요청 예시:

```json
{
  "curriculumName": "2022 개정 교육과정",
  "curriculumYear": 2022,
  "schoolLevel": "high",
  "subjectName": "수학",
  "subjectType": "일반선택",
  "lesson": { "lessonActivities": "이차함수 그래프의 꼭짓점을 설명했다." },
  "student": {},
  "growth": {},
  "traits": [],
  "unit": "characters",
  "targetLength": 300,
  "includeSources": true
}
```

응답에는 `content`, `reviewNotes`, `count`, `characterCount`, `byteCount`, `unit`, `targetLength`, `overLimit`, `provider`가 포함됩니다. `includeSources=true`이면 문장별 `sentences`와 `sources`도 반환합니다. 근거의 `start`는 프론트 `String.slice()`와 맞춘 UTF-16 위치입니다.

실패 시에는 `{"message":"안내 문구"}`를 반환합니다. 입력 오류 `400`, 미인증 `401`, 비활성 계정 `403`, 본문 초과 `413`, 사용량 초과 `429`, 외부 연결·출력 오류 `502`, 설정 누락 `503`을 구분합니다. 생성 결과를 DB에 저장하거나 기존 작성본을 덮어쓰지 않습니다.

## 검증

```sh
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
```

시험에서 Firebase와 모델 HTTP 응답은 `httpx.MockTransport`로 대체합니다. 실제 학생 자료와 유료 모델 호출 없이 입력 검증, 인증, 근거 ID, 소수점·이모지 위치, 제공자 오류, 분량 보강, 사용량 제한을 확인합니다. 기존 JavaScript에서 저장한 네 가지 프롬프트와 Python 결과도 비교합니다.

이 테스트는 실제 모델의 문장 품질이나 사실성을 보증하지 않습니다. 별도로 가상 사례의 실제 생성 결과와 교사 검토를 수집해야 합니다.

## 분리 범위와 남은 판단

- 기존 프롬프트의 연도별 규정, 교육과정으로 학년을 추정하는 로직, 짧은 초안의 1회 분량 보강을 우선 그대로 옮겼습니다. 이 규칙의 최신성·정확성을 검증한 것은 아닙니다.
- 문장별 근거 ID와 원문 위치를 검사하지만, 문장의 모든 주장이 원문에서 뒷받침되는지 자동 보장하지 않습니다.
- Python 문장 분리는 줄바꿈과 종결 문장부호를 사용합니다. JavaScript `Intl.Segmenter`의 모든 경계와 동일하지 않습니다. 소수점·한국어 종결·이모지 위치는 회귀 테스트에 포함합니다.
- 현재 인증은 기존과 같이 Firebase 사용자 확인입니다. 교사 역할·담당 학생 권한은 향후 백엔드 연동에서 별도로 보장해야 합니다.
- 사용량 제한은 프로세스 메모리 단위입니다. 여러 프로세스·서버에서 합산하려면 공유 저장소나 게이트웨이가 필요합니다.

구조·비동기 호출 참고: [FastAPI 다중 파일 구성](https://fastapi.tiangolo.com/tutorial/bigger-applications/), [HTTPX 비동기 클라이언트](https://www.python-httpx.org/async/).
