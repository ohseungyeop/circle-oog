# OOG 공통과 업무 테이블

사용자 결정에 따라 Circle FMS와 동일한 접두어를 사용한다. DB는 oog 하나, 애플리케이션 스키마는 public이다. 회사·사용자·권한·공통 감사 등 공통 영역은 core_, OOG 업무는 oog_다. FMS DB와 테이블은 변경하지 않는다.

| 영역 | 테이블 | 내용 |
|---|---|---|
| 업무 | oog_project | 고객별 화물 프로젝트 |
| 업무 | oog_cargo | 화물·원치수·포장치수·중량·수량 |
| 업무 | oog_equipment | 장비 물리 제원 |
| 업무 | oog_carrier_rule | OOG 장비 계획 규칙 |
| 업무 | oog_packing_list | 원본 Excel 상대경로와 매핑 |
| 업무 | oog_clp_scenario | OOG 계획 입력 사본과 계산 결과 |
| 공통 | core_audit_history | 작성자·변경 행위·상세 이력 |

공통 사용자·회사·역할 테이블은 인증 이식 시 core_로 추가한다. 이름만 공통으로 바꾸는 것과 실제 FMS 공통 구현 재사용은 구분한다. 현재 core_audit_history는 OOG에서 새로 작성한 초기 감사 저장소이고 FMS 감사 스키마를 복사한 것은 아니다.

V1이 이미 실제 DB에 적용되어 V2에서 ALTER TABLE RENAME을 수행한다. 삭제/재생성 없이 OID·데이터·외래키를 유지한다. Flyway 이력 테이블은 도구 관리 테이블이므로 flyway_schema_history를 유지한다. 이후 적용된 마이그레이션은 수정하지 않는다.
