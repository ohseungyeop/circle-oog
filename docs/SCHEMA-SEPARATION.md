# OOG 공통과 업무 테이블

사용자 결정에 따라 Circle FMS와 동일한 접두어를 사용한다. DB는 oog 하나, 애플리케이션 스키마는 public이다. 회사·사용자·권한·공통 감사 등 공통 영역은 core_, OOG 업무는 oog_다. FMS DB와 테이블은 변경하지 않는다.

| 영역 | 테이블 | 내용 |
|---|---|---|
| 업무 | oog_project | 고객별 화물 프로젝트 |
| 업무 | oog_cargo | 화물·원치수·포장치수·중량·수량 |
| 업무 | oog_equipment | 장비 물리 제원 |
| 업무 | oog_carrier_rule | 공통 DEFAULT 장비 계획 규칙 |
| 업무 | oog_carrier_rule_version | 회사별 선사 규칙 불변 버전과 유효기간 |
| 업무 | oog_packing_list | 원본 Excel 상대경로와 매핑 |
| 업무 | oog_clp_scenario | OOG 계획 입력 사본과 계산 결과 |
| 업무 | oog_packing_rule | 회사별 포장 규칙 불변 버전 |
| 업무 | oog_equipment_rate | 회사별 장비 단가·통화·유효기간 |
| 업무 | oog_packing_estimate | 원치수·규칙 또는 수동 근거 기반 예상 포장 |
| 업무 | oog_quotation | 저장 계획별 사전 견적 입력·결과 |
| 업무 | oog_multi_fr_review | Multi-FR 잠정 후보와 수동 선택·필요 검토 |
| 업무 | oog_engineering_review | 공학 누락 점검·검토 근거 기록 |
| 업무 | oog_engineering_calculation | 제한된 공학 모델 입력·계산 결과 불변 사본 |
| 업무 | oog_engineering_decision | 독립 검토자 내부 결정 불변 버전 |
| 업무 | oog_import_template | 회사·고객별 Excel 매핑과 헤더 fingerprint 불변 버전 |
| 공통 | core_audit_history | 작성자·변경 행위·상세 이력 |

V2 당시에는 사용자·회사·역할 인증이 연결되지 않아 공통 감사 1개만 있었다. 이름만 공통으로 바꾸는 것과 실제 FMS 공통 구현 재사용은 구분한다. 현재 core_audit_history는 OOG에서 새로 작성한 초기 감사 저장소이고 FMS 감사 스키마를 복사한 것은 아니다.

## V3 공통 인증 기반

현재는 **업무 oog_ 16개 + 공통 core_ 8개 + Flyway 기술 원장 1개 = 총 25개**다. 초기 V2의 공통 1개는 사용자/회사 인증이 아직 연결되지 않은 상태였다. V3에서 다음 7개를 신규 추가했다.

| 공통 테이블 | 실제 기능 |
|---|---|
| core_tenant | 회사 등록·활성 상태·프로젝트 소속 |
| core_user_account | DB 계정·암호 해시·역할·상태·실패 잠금·토큰 버전 |
| core_role | 회사별 ADMIN/PLANNER/ENGINEER/SALES/CUSTOMER 및 플랫폼 SUPER_ADMIN |
| core_menu | 회사별 업무 메뉴 |
| core_role_menu | 조회/등록/수정/삭제/출력 권한 |
| core_session | JWT Access 세션 ID·Refresh 해시·만료·폐기 |
| core_login_history | 로그인 성공/실패/잠금·갱신·로그아웃 |

회사·역할·사용자 복합 FK로 다른 회사 역할 할당을 차단한다. 기존 프로젝트는 회사 1로 이관하고 tenant_id FK를 적용한다. 감사에는 회사와 실제 사용자 ID를 기록한다. 초기 회사 1의 관리자만 플랫폼 관리를 수행하며 다른 회사 업무를 자동 열람하지 않는다. core_audit_history는 기존 OOG 감사 구현을 확장한 것이다.

V1이 이미 실제 DB에 적용되어 V2에서 ALTER TABLE RENAME을 수행한다. 삭제/재생성 없이 OID·데이터·외래키를 유지한다. Flyway 이력 테이블은 도구 관리 테이블이므로 flyway_schema_history를 유지한다. 이후 적용된 마이그레이션은 수정하지 않는다.

V4는 oog_equipment.version을 추가하고 V5는 oog_carrier_rule_version 및 기간 중복·불변 트리거를 추가한다. V5 당시 총 16개(core_ 8·oog_ 7·Flyway 1)였다. UPDATE/DELETE를 차단해 기존 버전을 보존한다. 관리자가 테스트 자료를 정리할 때에만 배타 잠금과 트리거 변경을 같은 트랜잭션 안에서 처리하며 지정한 테스트 회사의 규칙만 제거한다. 운영 API에는 수정/삭제 경로가 없다.

V6는 oog_packing_rule, oog_equipment_rate, oog_packing_estimate, oog_quotation을 추가한다. 규칙/단가와 입력·결과는 불변이며 회사·사용자·프로젝트 조건을 보존한다. V7은 oog_multi_fr_review, V8은 oog_engineering_review를 추가했다. V8 당시 총 22개였다.

V9는 oog_engineering_calculation과 oog_engineering_decision을 추가한다. 계산 입력·원본 계획 사본·산식 버전·결과와 독립 검토자의 결정 버전은 불변이다. 회사·프로젝트 및 작성자/검토자 소속을 FK로 연결한다. 내부 결정은 선사 승인이나 CLP 상태 변경으로 사용하지 않는다.

V10은 oog_import_template를 추가한다. 회사·고객·이름별 버전, 헤더 fingerprint, 매핑·단위·중량 기준·사유·작성자를 보존한다. 운영 API는 새 버전 추가와 조회만 제공하며 UPDATE/DELETE는 불변 트리거로 차단한다. V10 기준 총 25개다. 원본 FMS DB와 테이블은 변경하지 않았다. OR-Tools는 API 입력만 계산하므로 별도 DB 테이블이나 직접 DB 권한이 없다.
