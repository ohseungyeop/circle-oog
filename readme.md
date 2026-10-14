# Circle OOG

고객 Packing List를 프로젝트별로 가져와 검증하고 OOG 판정, 장비 후보 비교, CLP 사전계획과 2D 출력으로 연결하는 신규 제품이다. 제공된 제품기획안 v0.1과 기술아키텍처 권고안 v0.2를 기준으로 개발한다.

## 실행

1. backend/.env.example을 참고해 backend/.env를 준비한다. 기존 FMS 연결 설정에서 DB 이름만 oog로 변경한 로컬 설정이 생성되어 있다. 초기 관리자 암호는 OOG_ADMIN_PASSWORD이며 12자 이상 필요하다.
2. Java 21 환경에서 backend/gradlew.bat build 실행.
3. Python 3.12 이상 환경에서 optimizer/requirements.txt 설치 후 optimizer 폴더에서 `python -m uvicorn main:app --host 127.0.0.1 --port 8003` 실행.
4. 루트에서 `tools/start-oog.ps1` 실행. API는 8083이며 Flyway가 oog DB를 갱신한다.
5. frontend에서 `npm ci`, `npm run dev` 실행. 화면은 http://127.0.0.1:5175 이며 계정은 admin이다.

현재 인증은 DB 계정·회사·역할·메뉴 권한과 JWT다. 초기 회사 코드는 OOG, 계정은 admin이다. 회사·초기 관리자·사용자는 공통 관리 화면에서 등록한다. OOG JWT 서명키는 FMS와 별도다. 토큰은 화면 메모리에서만 유지하고 로그아웃 시 세션을 폐기한다. 외부 운영에는 HTTPS 구성이 필요하다.

## 업무 흐름

등록 기능 **34개 중 완료 32·미완료 2(진행 2·미착수 0)**, 기능 검증 **32개 통과·2개 대기**다. 대시보드와 업무 안내·개발현황은 동일 기능 목록에서 숫자를 계산한다. 브라우저 검증은 사용자 요청으로 제외하며 프런트는 코드로 검증한다. 과거 v0.6 직접 UI 근거는 별도로 보존한다. 신규 장비 등록·개구부 단면 검토를 추가했으며 실제 증빙/승인·확대 구조은 docs/REMAINING-WORK.md에 구분한다.

프로젝트 생성 → Packing List 시트/헤더/컬럼/단위 확인 → 검증 후 가져오기 → OOG 분석 및 후보 근거 확인 → 자동 CLP 시나리오 비교 → 상면/측면/정면 검토 → 선사·적용일 확인 → 분석 Excel 및 저장 CLP Excel/PDF 출력.

1/2행·병합 헤더의 자동 컬럼 제안을 확인하고 원치수와 포장치수를 별도로 연결한다. 중량을 개당 또는 행합계로 선택하며 행합계는 수량 컬럼이 필요하다. 수동 이동·잠금은 기존 장비의 배정 화물에 적용하고 검증 후 새 계획 사본을 저장한다. 이력에서 원본 Excel·매핑·과거 계획·감사를 조회하며 CLP Excel은 저장된 모든 시나리오와 배정·미배정·규칙·3면 개략도를 출력한다.

고객별 Excel 매핑 템플릿은 회사·고객·헤더가 일치할 때 최신 버전을 제안한다. 적용 후 컬럼·단위·중량 기준을 직접 수정할 수 있고 최종 확인 뒤 가져온다. 변경은 새 버전으로 저장한다. 사전 견적은 저장 당시의 입력·단가·대안별 금액과 누락 상태를 Excel/PDF로 출력하며 현재 단가로 다시 계산하지 않는다.

CLP의 AUTO는 OR-Tools CP-SAT로 적층 없는 1열 모델의 장비 대수를 최소화한다. HEURISTIC을 직접 선택할 수 있으며 규모·시간 한도 또는 솔버 미사용 시 fallback 이유를 보존한다. OPTIMAL은 해당 제한 모델에만 적용된다. 공학 계산은 사용자가 확인한 CoG·지지점·허용값을 바탕으로 두 지지점 정적 반력·평균 면압과 단일 방향 직접 라싱 미끄럼 필요조건을 계산한다. 내부 승인과 실제 선사 승인은 별개이며 모든 CLP는 PRE_PLAN을 유지한다.

중량은 개당 G/W를 매핑한다. 행 합계 중량을 개당 중량으로 올리지 않는다. 가져오기 오류가 있으면 그 업로드 전체를 저장하지 않는다. 표준 장비 제원은 개발용 기준값이며 실제 선사·장비 제원 승인이 필요하다.

## 개발 관리

- [기능별 상태](docs/FEATURE-STATUS.md)
- [개발 진행 기록](docs/DEVELOPMENT-STATUS.md)
- [로드맵](docs/OOG-ROADMAP.md)
- [구조](docs/ARCHITECTURE.md)
- [FMS 공통 재사용](docs/CORE-REUSE.md)
- [검증](docs/VERIFICATION.md)
- [DB 접두어와 영역](docs/SCHEMA-SEPARATION.md)
- [자동 최적화 모델과 fallback](docs/OPTIMIZATION.md)
- [공학 계산·입력 근거·내부 검토 범위](docs/ENGINEERING-CALCULATIONS.md)
- [업무 매뉴얼 원본](docs/user-manual.json)
- [사용자 Word 매뉴얼](docs/Circle-OOG-User-Manual.docx)

기존 소스는 reference/legacy-20261013에 보존했다. 기존 Git 이력은 루트 .git에 남겨두었으며 커밋은 실행하지 않았다.

자동 기본은 Excel 탐지·검증 후 CLP 생성·대안 추천·등록 규칙/단가 기반 예상 포장과 견적·Multi-FR 후보다. 사용자가 수동 선택과 근거를 남길 수 있다. 단위·단가·공학 정보가 없으면 누락 상태로 표시한다.

전체 자동 검사: `./tools/verify-all.ps1` (빌드 포함), `./tools/verify-all.ps1 -SkipBuild` (기존 빌드로 DB/API 검사). 직접 UI 업무 조작 검사는 포함하지 않는다. 결과는 docs/verification-suite.json이다.


확대 공학 v0.7은 운송 구간 4방향·전도·압축 접촉·마찰/yaw·단순 보 검토를 지원한다. 근거와 경계는 [공학 연구](docs/ENGINEERING-RESEARCH.md), 검사는 [종합 기록](docs/verification-suite.json)을 참조한다. 프런트는 `npm test`(Vitest/jsdom, 브라우저 엔진 미사용)로 검사하며 전체 자동화는 `tools/verify-all.ps1`이다. 실장비·실해상 검증과 선사 승인은 별도다.
