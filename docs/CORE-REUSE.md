# Circle FMS 공통 재사용

2026년 10월 13일 사용자가 Circle FMS core 재사용을 허용했다. FMS backend/core/src에는 실제 구현 파일이 없으며 common/auth/system에 공통 기능이 있다. 원본 FMS 파일과 DB는 수정하지 않는다.

| 출처 | OOG 위치 | 사용 내용 | 상태 |
|---|---|---|---|
| common/com/logistics/common/dto/ApiResponse.java | backend/shared-core 동일 패키지 | API 성공 응답 envelope | 연결 |
| common/com/logistics/common/dto/PageResponse.java | backend/shared-core 동일 패키지 | 프로젝트 목록 페이지 계약 | 연결 |
| common/com/logistics/common/util/LogisticsCalcUtil.java | backend/shared-core 동일 패키지 | CBM 계산 | 연결 |
| common/com/fms/security/FmsPrincipal.java | backend/shared-core 동일 패키지 | 검증된 사용자·회사·역할 객체 | 원본 그대로 재사용 |
| auth/support/security/JwtProvider.java · JwtProperties.java | backend/src/main/java/com/circle/oog/auth | JWT 서명·issuer·만료 계약 | OOG issuer/세션 어댑트 |
| auth/session · system/user/role/menu/tenant · bootstrap/foundation.sql | OOG V3/CoreAuthService/CoreAdminController | 회사·사용자·권한·DB 세션·로그인 이력 | 의존성 분리 후 OOG 어댑터 구현·API 검증 |

처음 가져온 응답·페이지·CBM 세 파일과 추가 FmsPrincipal은 패키지와 구현을 유지한다. 단순 이름 변경을 독립 구현으로 설명하지 않는다. 추가 재사용 시 의존 테이블·라이선스/출처·실행 검증을 기록한다. auth/system을 통째로 가져오면 FMS 상품권한·업무 테이블까지 결합되므로 OOG 권한 계약을 먼저 정하고 공통 영역만 분리해야 한다.

2026년 10월 13일 V3에서 core_tenant/core_user_account/core_role/core_menu/core_role_menu/core_session/core_login_history 7개를 업무와 연결했다. 기존 core_audit_history까지 공통 8개이며 FMS의 공통 19개 전체를 복사한 것은 아니다. FmsPrincipal은 원본과 SHA256이 같다. JWT provider는 FMS의 서명·issuer·tokenUse·만료 원칙을 적용하되 issuer는 circle-oog, 서명키는 OOG 전용이고 refresh 원문 대신 SHA256을 저장한다. FMS partner·구독·상품·플랫폼 업무 조회 의존성은 가져오지 않았다.

FMS 원본 DDL을 그대로 적용하거나 FMS migration V1–V63을 OOG에 실행하지 않는다. V3는 OOG에서 사용할 최종 계약에 맞춘 신규 스키마이며 사용자 이름은 회사 내 고유하다. 기존 OOG 프로젝트는 초기 회사 1에 귀속한다. 회사·사용자·역할 상태와 token_version·DB 세션을 매 요청 재확인하고 공통 장비 규칙 수정은 플랫폼 회사 1의 SUPER_ADMIN으로 제한한다.

미이식 공통 범위는 회사 프로필/이벤트, 조직 설정/이벤트/명령, 사용자·회사 환경, 메시지, 채번, 상품 구독/이벤트/명령이다. 초기 인증 범위 완료와 전체 FMS 공통 제품군 재사용 완료를 구분한다.
