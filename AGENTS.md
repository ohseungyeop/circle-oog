# Circle OOG 개발

- 신규 제품 소스는 backend, frontend, optimizer다. reference/legacy-20261013은 다른 개발자의 참고 소스이며 신규 구현으로 복사하지 않는다.
- 사용자가 허용한 Circle FMS 공통 구현은 backend/shared-core로 재사용하며 출처를 docs/CORE-REUSE.md에 기록한다. 원본 FMS는 수정하지 않는다.
- docs/OOG-ROADMAP.md, FEATURE-STATUS.md, DEVELOPMENT-STATUS.md, ARCHITECTURE.md, VERIFICATION.md를 함께 관리한다. 단계별 상태와 검증 근거를 기록하고 미구현·미검증을 완료로 표시하지 않는다.
- 사용자 업무가 바뀌면 docs/user-manual.json과 사용자 매뉴얼을 갱신한다.
- DB는 동일 PostgreSQL 서버의 독립 oog DB만 사용한다. fms 테이블 및 데이터는 변경하지 않는다.
- public 단일 스키마에서 OOG 업무 테이블은 oog_, 공통 테이블은 core_ 접두어를 사용한다.
- 비밀값은 backend/.env에만 저장하고 출력·커밋하지 않는다.
- 저장 단위는 mm/kg/CBM. 원치수와 포장치수는 별도 관리한다.
- 장비 물리 제원과 계획 규칙을 분리한다. 판정 근거와 규칙 버전을 보존한다.
- Optimizer는 DB에 직접 연결하지 않는다. 미배정 화물을 숨기지 않는다.
- 모든 CLP는 PRE_PLAN이며 공학 승인 완료를 뜻하지 않는다.
- 적용된 Flyway 마이그레이션은 수정하지 않고 다음 버전을 추가한다.
- 변경에 맞는 Java/Python 검사와 프런트 빌드를 실행하고 실제 DB/API 검증은 별도로 기록한다.
