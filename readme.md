# Circle OOG

고객 Packing List를 프로젝트별로 가져와 검증하고 OOG 판정, 장비 후보 비교, CLP 사전계획과 2D 출력으로 연결하는 신규 제품이다. 제공된 제품기획안 v0.1과 기술아키텍처 권고안 v0.2를 기준으로 개발한다.

## 실행

1. backend/.env.example을 참고해 backend/.env를 준비한다. 기존 FMS 연결 설정에서 DB 이름만 oog로 변경한 로컬 설정이 생성되어 있다. 초기 관리자 암호는 OOG_ADMIN_PASSWORD이며 12자 이상 필요하다.
2. Java 21 환경에서 backend/gradlew.bat build 실행.
3. Python 3.12 이상 환경에서 optimizer/requirements.txt 설치 후 optimizer 폴더에서 `python -m uvicorn main:app --host 127.0.0.1 --port 8003` 실행.
4. 루트에서 `tools/start-oog.ps1` 실행. API는 8083이며 Flyway가 oog DB를 갱신한다.
5. frontend에서 `npm ci`, `npm run dev` 실행. 화면은 http://127.0.0.1:5175 이며 계정은 admin이다.

현재 인증은 초기 개발용 HTTP Basic이며 외부 운영에는 HTTPS와 FMS 기반 인증/권한 이식이 필요하다. 비밀번호는 화면의 메모리에서만 유지하고 로그아웃 시 제거한다.

## 업무 흐름

등록 기능 **25개 중 완료 18·미완료 7(진행 3·미착수 4)**, 기능 검증 **17개 통과·8개 대기**다. 대시보드와 업무 안내·개발현황은 동일 기능 목록에서 숫자를 계산한다. UI 직접 업무검증은 미실시이며 내부 개발·API 검증과 구분한다.

프로젝트 생성 → Packing List 시트/헤더/컬럼/단위 확인 → 검증 후 가져오기 → OOG 분석 및 후보 근거 확인 → 자동 CLP 시나리오 비교 → 상면/측면/정면 검토 → 분석 Excel 또는 브라우저 PDF 출력.

1/2행·병합 헤더의 자동 컬럼 제안을 확인하고 원치수와 포장치수를 별도로 연결한다. 중량을 개당 또는 행합계로 선택하며 행합계는 수량 컬럼이 필요하다. 수동 이동·잠금은 기존 장비의 배정 화물에 적용하고 검증 후 새 계획 사본을 저장한다. 이력에서 원본 Excel·매핑·과거 계획·감사를 조회하며 CLP Excel은 저장된 모든 시나리오와 배정·미배정·규칙·3면 개략도를 출력한다.

중량은 개당 G/W를 매핑한다. 행 합계 중량을 개당 중량으로 올리지 않는다. 가져오기 오류가 있으면 그 업로드 전체를 저장하지 않는다. 표준 장비 제원은 개발용 기준값이며 실제 선사·장비 제원 승인이 필요하다.

## 개발 관리

- [기능별 상태](docs/FEATURE-STATUS.md)
- [개발 진행 기록](docs/DEVELOPMENT-STATUS.md)
- [로드맵](docs/OOG-ROADMAP.md)
- [구조](docs/ARCHITECTURE.md)
- [FMS 공통 재사용](docs/CORE-REUSE.md)
- [검증](docs/VERIFICATION.md)
- [DB 접두어와 영역](docs/SCHEMA-SEPARATION.md)
- [업무 매뉴얼 원본](docs/user-manual.json)
- [사용자 Word 매뉴얼](docs/Circle-OOG-User-Manual.docx)

기존 소스는 reference/legacy-20261013에 보존했다. 기존 Git 이력은 루트 .git에 남겨두었으며 커밋은 실행하지 않았다.
