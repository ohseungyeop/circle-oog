# OOG 아키텍처

React 19 / TypeScript / Ant Design 화면은 Spring Boot 3.5.14 / Java 21 API를 호출한다. 업무 데이터는 PostgreSQL의 독립 oog DB와 public 스키마에 저장한다. 초기 서버 포트는 FMS 충돌을 피하기 위해 UI 5175, API 8083, Optimizer 8003이다. Docker/AWS를 사용하지 않는다.

## 모듈

backend/shared-core는 FMS common에서 가져온 ApiResponse, PageResponse, LogisticsCalcUtil을 독립 빌드한다. backend의 OOG 모듈은 프로젝트·화물·장비·규칙·파일·시나리오·감사를 담당한다. optimizer는 API가 전달한 입력으로만 계산하며 DB에 직접 접근하지 않는다.

## 데이터

oog_project → oog_cargo / oog_packing_list / oog_clp_scenario. oog_equipment와 oog_carrier_rule은 별도 테이블이며 시나리오는 화물·제원·규칙 입력 사본과 결과를 함께 저장한다. 공통 감사는 core_audit_history에 저장한다. 원본 Excel은 data/projects/{id}/packing-list에 저장하고 DB에는 상대 경로와 매핑·단위를 기록한다. 화물 Item은 프로젝트 내 유일하고 기본 낙관적 버전은 프로젝트·규칙에 적용한다.

분류 화면은 40HC 계획 기준 OL/OW/OH/OVERWEIGHT를 표시한다. 장비 후보는 각 장비의 물리 제원과 계획 규칙으로 별도 판정한다. 현재 DEFAULT 규칙만 지원하며 실제 선사별 유효기간·복수 규칙 버전은 후속 개발이다.

## 계산

CBM은 FMS 공통 계산의 소수 4자리 반올림을 그대로 재사용한다. 최적화는 면적/폭/중량 순서의 first-fit 1열 휴리스틱으로 수량을 포장 단위로 전개한다. 길이·폭·높이·중량·회전 제약을 검사하고 적층하지 않는다. 장비 대수 우선과 개별 작업 우선의 두 시나리오를 생성하며 최적해를 보장하지 않는다. OR-Tools와 비용/Slot Loss 목적함수는 아직 구현하지 않았다.

## 인증 및 제한

현재 초기 admin Basic 인증과 ADMIN/PLANNER 접근만 지원한다. FMS의 JWT 인증은 core_ 사용자·회사·권한 테이블과 결합되어 있어 그대로 연결하지 않는다. OOG DB용 공통 스키마·인증 이식, 역할별 접근, 고객 격리는 별도 기능으로 관리한다. HTTPS 외부 운영은 이 단계 이후다.

## 계획 개정과 이력 및 출력

수동 개정은 원본 oog_clp_scenario의 result/input_snapshot을 복사하여 선택 시나리오만 변경하고 신규 행을 저장한다. 현재 화물·Rule을 다시 읽지 않으며 원본과 나머지 시나리오는 보존한다. 수량·snapshot 중량·치수·회전·장비 한도·겹침·잠금을 검증하고 checked exception도 전체 롤백한다. 현재 배정된 화물을 기존 장비로 이동하는 범위이며 신규 장비·미배정 배정·적층은 지원하지 않는다.

이력 API는 실제 JSON으로 매핑·입력·결과·감사 상세를 반환하며 프로젝트 조건과 페이지 제한을 적용한다. 원본 다운로드는 DB의 상대 경로와 실제 파일 경로가 storage 내에 있는지 검사한다. CLP Excel은 저장된 모든 시나리오를 구분해 출력하고 대안끼리 장비 수를 합산해 실제 선적량으로 표시하지 않는다. 3면 도면은 셀 개략도이며 mm 좌표를 별도 보존한다.

## 기능 수치 원본

docs/feature-status.json이 기능 25개의 개발/검증 상태 원본이다. tools/sync-development-status.py가 상태 Markdown과 classpath JSON을 동기화한다. /api/development/status가 기능 ID와 상태 코드를 검사한 후 합계를 계산한다. 완료/미완료와 검증 통과/대기를 분리하며 임의로 완료 숫자를 하드코딩하지 않는다.

