# VOS-OOG 작업 지침

이 저장소에서 일하는 모든 AI 에이전트(Claude Code, Codex 등)의 공통 지침이다.
Claude Code 전용 설정은 `CLAUDE.md`, 화면 설계 규칙은 `DESIGN.md`에 있다.

## 프로젝트 개요

VOS-OOG(ValueOnSys Out of Gauge System). 플랫랙(Flat Rack)·오픈탑(Open Top) 특수 컨테이너에
싣는 OOG 화물의 패킹 리스트를 엑셀로 올리면, 박스 치수와 CBM을 계산하고 컨테이너별로
묶어(CLP, Container Loading Plan) 라싱(고박) 포인트까지 저장하는 업무용 웹 시스템이다.
사용자는 물류 담당자이고, UI 문구·주석·커밋 메시지는 한국어를 쓴다.

## 구조

- `backend/` : Fastify 5 + Knex(MySQL/MariaDB), ESM(`"type": "module"`), JavaScript. 진입점 `src/app.js`
  - `src/routes/*.js` : API 핸들러. `index.js`에서 prefix로 등록하며 접두사는 `/vos/oog/v1`
  - `src/utils/` : `authMiddleware`(인증·소유자·관리자 확인), `session`(JWT 쿠키), `users`(허용 목록),
    `calculateHelper`(박스·CBM·그룹핑 계산), `replyHelper`(응답 포장), `emailHelper`
  - `src/config/` : `cors`, `db`(knex를 `fastify.knex`로 데코레이트), `mailer`
  - `src/models/*.sql` : 테이블 DDL. 마이그레이션 도구 없음, DB에 수동 적용
- `frontend/` : Vite 4 + React 18 + TypeScript(strict) + MUI v7. 진입점 `src/main.tsx`
  - `pages/`(화면), `components/`(그리드·다이얼로그·핸들러), `context/`(OogColumnsContext),
    `theme/`(MUI 템플릿 기반 커스텀 테마), `utils/`(단위 변환), `styles/`(공통 CSS Module)
  - 상태는 로컬 state + Context만 쓴다. 별도 상태 관리 라이브러리 없음
- 자동화 테스트 없음. 린트는 frontend만(`eslint.config.js`). 포맷은 루트 `.prettierrc`(4칸 들여쓰기, 작은따옴표, 132자)

## 명령

| 작업 | 명령 |
|------|------|
| 백엔드 로컬 실행 | `cd backend && npm run local` (nodemon, 디버거 포트 3301, `.env.local` 로드) |
| 백엔드 dev / prd | `npm run dev` / `npm run prd` (`.env.{NODE_ENV}` 로드) |
| 프론트 개발 서버 | `cd frontend && npm run dev` (포트 3000 고정, 사용 중이면 실패) |
| 프론트 빌드 | `cd frontend && npm run build` |
| 프론트 타입 검사 | `cd frontend && npx tsc -p tsconfig.app.json --noEmit` |
| 프론트 린트 | `cd frontend && npx eslint src` |

## 프로젝트 고유 규칙

- **인증**: httpOnly 쿠키 `oogSession`(JWT, `typ: 'session'`). 보호 API는 `preHandler`에 `authMiddleware`를 건다.
  업로드 차수(`PCK_ORD_SEQ`)를 다루는 API는 `requireOwner`로 소유자를 확인하고, 관리자 전용은 `adminOnly`를 추가한다.
- **허용 목록**: `ADMIN_EMAILS` 환경변수의 주소는 항상 관리자. 그 외는 `vos_oog_usr.USR_STS`가 `'A'`(허용)일 때만 로그인된다.
  `'I'`는 승인 대기, `'S'`는 차단.
- **응답 형식**: 일반 API는 `replyHelper`로 감싸 `{ success, message, timestamp, size, data }`를 돌려준다.
  인증 계열은 `{ code: 'S' | 'E', status, message, data }`. 새 API는 같은 모듈의 기존 형식을 따른다.
- **이름 규칙**: DB 테이블은 `vos_oog_*`, 컬럼은 대문자 스네이크(`PCK_ORD_SEQ`, `ITM_LEN`). 프론트에서는 camelCase로 바꿔 쓴다.
- **단위**: 저장 기준은 길이 mm, 무게 kg, 부피 CBM. 표시 단위 변환은 `frontend/src/utils/UnitConverter.tsx`에서만 한다.
- **비밀값**: `.env.*`에만 둔다. 코드·문서·커밋·로그에 절대 넣지 않는다. 키 목록은 `backend/.env.example`.
- **프론트 API 호출**: 주소는 `import.meta.env.VITE_API_URL`, `fetch`에 `credentials: 'include'`를 반드시 붙인다.
- **업로드 파일**: 사용자가 올린 엑셀은 신뢰하지 않는다. 경로는 `path.join`으로 만들고 파일명·시트 내용을 검증한다.
- **커밋 메시지**: 한국어 한 줄 요약(기존 `git log` 스타일). 사용자가 요청할 때만 커밋한다.

## 작업 원칙 (Andrej Karpathy Guidelines)

출처: https://github.com/multica-ai/andrej-karpathy-skills (MIT). 원문 유지.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 완료 선언 전 검증 (Verification Before Completion)

출처: https://github.com/obra/superpowers `skills/verification-before-completion` (MIT).
전문은 `.claude/skills/verification-before-completion/SKILL.md`.

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

"됐습니다", "고쳤습니다", "통과합니다"라고 말하기 전에 반드시 다음 순서를 거친다.

1. **IDENTIFY**: 이 주장을 증명하는 명령이 무엇인가
2. **RUN**: 그 명령을 지금, 전체로, 새로 실행한다
3. **READ**: 전체 출력과 종료 코드를 읽는다
4. **VERIFY**: 출력이 주장을 뒷받침하는가. 아니면 실제 상태를 증거와 함께 말한다
5. **ONLY THEN**: 증거와 함께 주장한다

이 프로젝트에는 테스트가 없으므로 증거는 아래 명령으로 만든다.

| 주장 | 증거가 되는 명령 |
|------|------------------|
| 프론트 코드가 컴파일된다 | `cd frontend && npx tsc -p tsconfig.app.json --noEmit` → 오류 0 |
| 린트가 깨끗하다 | `cd frontend && npx eslint src` → 오류 0 |
| 빌드가 된다 | `cd frontend && npm run build` → exit 0 |
| 백엔드가 뜬다 | `cd backend && npm run local` → 리슨 로그 확인 후 종료 |
| API가 동작한다 | 실제 요청(curl 또는 브라우저)의 응답 본문과 상태 코드 |
| 버그가 고쳐졌다 | 원래 증상을 재현하는 절차를 다시 수행해 사라졌음을 확인 |

금지 표현: "아마", "될 것입니다", "그래 보입니다", 검증 전의 "완벽합니다". 서브에이전트의 성공 보고는
`git diff`로 직접 확인하기 전까지 믿지 않는다.

## AI 슬롭 방지 (anti-slop)

출처: https://github.com/TheMizeGuy/anti-slop (MIT)의 규칙을 이 프로젝트에 맞게 요약했다.
플러그인을 설치하면 `/slop-check diff`로 커밋 전 점검할 수 있다(`CLAUDE.md` 참고).
도메인 용어가 정확한 단어라면 아래 금지 목록보다 우선한다.

**글(응답, 문서, UI 문구)**
- 결론부터. 질문 되풀이, 아부성 서두("좋은 질문입니다"), 끝맺음 요약과 "추가로 도와드릴까요" 금지
- 줄표(—) 대신 쉼표나 마침표. "X가 아니라 Y입니다" 식 대조 문형, 세 개 묶음 나열 습관 금지
- 빈말 금지: "강력한", "포괄적인", "원활한", "다양한 요소" 대신 구체적 이름과 숫자
- 한 번 쓰는 외래 전문어는 5단어 이내로 풀어 쓴다

**코드**
- SQL은 Knex 쿼리 빌더로만. 문자열 조립 금지. 사용자 입력을 `innerHTML`, 경로, 쉘에 그대로 넣지 않는다
- 비밀값 하드코딩, `eval`, 예외를 삼키는 빈 `catch`, `as any`·`@ts-ignore`로 컴파일러 끄기 금지
- 코드를 그대로 되풀이하는 주석, "// 1단계" 식 내레이션 주석, 함수마다 붙는 형식적 JSDoc 금지. 주석은 "왜"만
- 한 번만 쓰는 추상화(팩토리, 전략, 유틸 래퍼) 금지. 주변 코드의 관례를 따른다
- 디버그 잔재(`console.log`)를 새로 추가하지 않는다. 기존 것은 요청 없이 지우지 않는다
- N+1 쿼리, 타임아웃 없는 외부 호출, 페이지네이션 없는 전체 조회를 새로 만들지 않는다
- React: 파생 값은 렌더 중 계산한다(`useEffect`+`setState`로 복제 금지). 효과에는 정리 함수를 둔다
- 테스트를 통과시키려고 단언을 약화하지 않는다. 한 곳을 고치려고 다른 곳 동작을 조용히 바꾸지 않는다

**화면**: `DESIGN.md`의 규칙을 따른다(접근성, 빈·오류·로딩 상태, 기본값 디자인 회피).
