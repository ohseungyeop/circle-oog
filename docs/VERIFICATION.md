# OOG 검증

## 병렬 기능 통합 검증 2026년 10월 13일

Java 단위 검사 20건·실패/오류/건너뜀 0, Python 4건, 실제 oog DB/API 39건 통과. 프런트 TypeScript/build 통과. 새 API 검증은 자동 매핑·m/ton 단위·행합계 수량 변환·원치수 별도 저장·중복 전체 거부·원본 bytes·이력·이동/잠금/해제·겹침/한도/회전 거부·원본 계획 불변·프로젝트 소속·전체 시나리오 Excel·수치 합계를 검사했다. 테스트 자료는 정리했다. [기록](verification-parallel.json).

DB 테이블 변경은 없으며 V2와 public의 oog_ 6개·core_ 1개를 유지한다. 화면을 띄워 업무를 직접 조작한 검증은 수행하지 않았다. CLP Excel 도면은 격자 셀 기반 개략도이고 수치 좌표는 Assignments에 보존한다. 선사 사양·공학 승인·모든 고객 Excel 양식의 자동 인식은 검증 범위에 포함하지 않는다.

## 초기 기반 검증 2026년 10월 13일

Java Gradle build 및 OOG 경계 테스트 1건, React/TypeScript production build, Python 배치 제약 테스트 4건이 통과했다. 실제 oog DB에서 인증·프로젝트·실제 Excel 미리보기/가져오기·중복 전체 거부·판정 근거·CLP 생성/재조회·수량 보존·분석 Excel·감사·접두어 검사 19건이 통과했다. 검증용 프로젝트·화물·파일·이력은 정리했다.

Flyway V2 적용 완료. public 업무 oog_ 6개와 공통 core_ 1개이며 도구 관리 flyway_schema_history 외에 접두어 없는 테이블은 없다. 원본 FMS DB는 변경하지 않았다. 서버 실제 PostgreSQL 버전은 16.5이며 문서 권고 17과 다르지만 현재 연결/마이그레이션/업무 검증은 통과했다.

사용자 매뉴얼 v0.1은 Microsoft Word로 8페이지 렌더링하고 전 페이지 PNG를 시각 검수했다. 샘플 Excel 17개는 읽기 전용으로 구조를 기록했다. 실제 가져오기 검증은 PackingList_sample.xlsx의 포장치수와 개당 중량 매핑으로 수행했다. 모든 샘플의 업무 의미와 선사 제원을 승인한 것은 아니다.

## 수행 명령

이번 검증은 자동화 코드와 실제 인증 HTTP API 중심이다. UI는 인앱 브라우저의 로그인 페이지 표시만 확인했다. 로그인 이후 폼 입력·클릭·도면·인쇄 흐름을 화면에서 직접 검증한 것으로 기록하지 않는다.

- Java 21: backend/gradlew.bat build --no-daemon
- 프런트: frontend/npm run build
- Python: optimizer/python -m unittest -v
- 실제 DB: oog 접속, Flyway 이력, API 생성/조회/검증, 테스트 자료 정리
- 화면: 브라우저 로그인 → 프로젝트 → Excel 매핑 → 분석 → CLP → 출력

빌드와 실제 DB 검증은 구분한다. DB 서버 IP가 같아도 DB_URL은 /oog로 끝나야 한다. FMS DB는 쓰지 않는다. 기능별 미검증 상태는 FEATURE-STATUS.md에 표시한다.

최신 실행 결과는 verification-foundation.json에 기록한다. 원본 Excel 양식이 매우 달라 매핑을 사용자에게 보여주고 단위를 명시적으로 선택한다. 장비 초기값과 허용 Rule은 회사/선사 검토가 필요하다.
