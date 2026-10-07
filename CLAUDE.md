# CLAUDE.md

공통 지침은 `AGENTS.md`에 있다. 아래는 Claude Code에서만 쓰이는 내용이다.

@AGENTS.md

## Claude Code 전용 설정

- **응답 언어**: 한국어. 코드 식별자와 기술 용어는 원문 유지.
- **출력 스타일**: `Attention-kind` (`.claude/output-styles/attention-kind.md`, 출처 alexgreensh/attention-span).
  말하는 방식만 바뀌고 코드 작업 방식은 바뀌지 않는다. `.claude/settings.json`의 `outputStyle`로 켜져 있다.
  바꾸려면 `/output-style`.
- **완료 선언 전**: `verification-before-completion` 스킬(`.claude/skills/`)을 적용한다.
  "완료", "수정됨", "통과", "동작함"을 말하기 전에 `AGENTS.md`의 증거 명령 표에 있는 명령을 실제로 실행하고 출력을 읽는다.
- **화면 작업 전**: `DESIGN.md`를 먼저 읽는다.
- **anti-slop 플러그인**: 설치되어 있으면 커밋 전에 `/slop-check diff`를 돌리고, 결과는 라벨(Scan score / Review score)을 붙여 보고한다.
  설치 명령:
  ```
  /plugin marketplace add TheMizeGuy/anti-slop
  /plugin install anti-slop@anti-slop
  ```
  설치 여부와 관계없이 `AGENTS.md`의 "AI 슬롭 방지" 규칙은 항상 적용한다.
- **환경 변수 파일**(`backend/.env.*`, `frontend/.env.*`)은 비밀값이 들어 있으므로 읽거나 출력하지 않는다.
  키 이름이 필요하면 코드의 `process.env.*` / `import.meta.env.*` 참조를 grep한다.
- **커밋**: 사용자가 요청할 때만. 메시지는 한국어 한 줄 요약.
