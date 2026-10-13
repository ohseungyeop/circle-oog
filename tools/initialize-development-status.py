import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
target=root/'docs/feature-status.json'
if target.exists():raise SystemExit('Canonical status already exists; edit it directly')
items=[]
new={'P03':'원치수 수동 입력/Excel 매핑·별도 저장','I04':'1/2행·병합 헤더 자동 컬럼 제안·개당/행합계 중량','L04':'기존 장비 간 이동·잠금·회전·검증·불변 계획 개정','O03':'전체 시나리오 배정/입력/규칙/경고/미배정/3면 도면 출력','H01':'원본 파일·매핑·계획 사본·감사 이력 조회'}
for line in (root/'docs/FEATURE-STATUS.md').read_text(encoding='utf-8').splitlines():
    if not line.startswith('| '):continue
    parts=[s.strip() for s in line.split('|')[1:-1]]
    if len(parts)!=5 or len(parts[0])!=3 or not parts[0][1:].isdigit():continue
    id,name,description,development,evidence=parts
    state={'구현':'COMPLETE','일부':'IN_PROGRESS','예정':'NOT_STARTED'}[development]
    passed=state=='COMPLETE' and id!='L03'
    if id in new:description=new[id];state='IN_PROGRESS';passed=False;evidence='병렬 구현 통합 완료·실제 API 검증 진행'
    items.append({'id':id,'name':name,'description':description,'development':state,'verification':'PASSED' if passed else 'PENDING','evidence':evidence})
assert len(items)==25
status={'updated':'2026-10-13','version':'0.2','items':items,'verificationRuns':{'Java 단위 검사':'통합 실행 중','Python 검사':'이전 4건 통과','실제 DB/API 검사':'이번 통합 실행 중','프런트 build':'통과','UI 직접 업무검증':'미실시'},'notes':['로그인 이후 UI 직접 업무검증은 미실시다. L03 2D는 build만 확인하여 검증 대기다.','기능 완료는 명시한 내부 범위 기준이다. M01의 장비 편집, M02 다중 선사 Rule, L05 Multi-FR 대수/지지점, O02 전용 PDF, C03 JWT/회사/RBAC, Q01 견적/포장추정, E01 공학은 남아 있다.','자동 매핑은 사용자 확인이 필요하며 단위·중량 기준을 자동 확정하지 않는다.','선사 제원·지지점·하중·CoG·라싱·실무 승인과 최적해 보장은 개발 완료 수치에 포함하지 않는다.']}
target.write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Initialized 25 feature records')
