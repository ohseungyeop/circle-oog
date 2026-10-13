# Circle FMS 공통 재사용

2026년 10월 13일 사용자가 Circle FMS core 재사용을 허용했다. FMS backend/core/src에는 실제 구현 파일이 없으며 common/auth/system에 공통 기능이 있다. 원본 FMS 파일과 DB는 수정하지 않는다.

| 출처 | OOG 위치 | 사용 내용 | 상태 |
|---|---|---|---|
| common/com/logistics/common/dto/ApiResponse.java | backend/shared-core 동일 패키지 | API 성공 응답 envelope | 연결 |
| common/com/logistics/common/dto/PageResponse.java | backend/shared-core 동일 패키지 | 프로젝트 목록 페이지 계약 | 연결 |
| common/com/logistics/common/util/LogisticsCalcUtil.java | backend/shared-core 동일 패키지 | CBM 계산 | 연결 |
| auth/security + common/security | 미이식 | JWT, 현재 사용자·회사 권한 | 계획 |
| system/user/role/menu/tenant | 미이식 | 회사·사용자·역할·메뉴 | 계획 |

가져온 세 파일은 패키지와 구현을 유지한다. 단순 이름 변경을 독립 구현으로 설명하지 않는다. 추가 재사용 시 의존 테이블·라이선스/출처·실행 검증을 기록한다. auth/system을 통째로 가져오면 FMS 상품권한·업무 테이블까지 결합되므로 OOG 권한 계약을 먼저 정하고 공통 영역만 분리해야 한다.
