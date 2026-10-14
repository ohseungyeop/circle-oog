import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(name):return json.loads((root/'docs'/name).read_text(encoding='utf-8'))
def write(name,value):(root/'docs'/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
proof=read('verification-suite.json');assert proof['javaTests']==70 and proof['apiChecks']==248 and proof['canonicalMatches']
d=read('feature-status.json');d['updated']='2026-10-14';d['version']='0.5'
for item in d['items']:
 if item['id']=='I04':item.update(description='자동 시트/헤더 탐지·매핑 제안·개당/행합계·수동 확인',evidence='탐지 API 9건·병합/다중 시트/단위 미확정 검사. 파일 선택 시 자동 기본, 모호한 값은 선택·확인 필요. UI는 build 검증')
 if item['id']=='L02':item.update(description='미배정 수·장비 대수 기준 자동 추천·수동 대안 선택',evidence='대안 생성·보존 API 통과. 자동 생성/추천·수동 전환 frontend build 통과, 직접 UI 업무검증은 미실시. 최적해/비용 최적화 미구현')
 if item['id']=='L05':item.update(development='COMPLETE',verification='PASSED',description='개당 Multi-FR 자동 배열 후보·수동 비교·검토 이력',evidence='API 18건. 최대 32대·원입력 치수 방향·잠정 배열 필요조건 검토. 단순 payload 합산은 적재가능 판정이 아님. 지지점/CoG/반력 계산 제외')
 if item['id']=='Q01':item.update(development='COMPLETE',verification='PASSED',description='회사 포장 규칙·등록 단가로 자동 추정/사전견적·수동 선택',evidence='API 31건. PRE_PACK/PRE_QUOTE·불변 snapshot·Decimal·통화혼합 거부·미단가 합계 null. 현재 화물 자동 덮어쓰기 제외')
 if item['id']=='E01':item.update(development='IN_PROGRESS',verification='PENDING',description='자동 누락 점검·수동 검토 기록·공학 계산 및 승인',evidence='검토 기록 API 19건·엔지니어 역할/회사 분리 회귀 통과. 모두 기록해도 승인 아님. CoG/지지 반력/점하중/라싱 물리 계산 미구현')
d['verificationRuns'].update({'Java 단위 검사':'70건 통과·실패 0','Python 검사':'4건 통과','공통 인증 실제 DB/API':'68건 통과','장비·선사 규칙·PDF 실제 DB/API':'45건 통과','자동 탐지 실제 API':'9건 통과','Multi-FR 사전검토 실제 DB/API':'18건 통과','포장 추정·견적 실제 DB/API':'31건 통과','공학 검토 기록 실제 DB/API':'19건 통과','자동 검증 명령':'verify-all.ps1 · 전체 API 248건 통과','사용자 매뉴얼':'v0.5 / 18페이지','DB':'V8 / core_ 8 / oog_ 13 / 기술 원장 1'})
d['notes'][1]='완료는 명시한 내부 개발 범위다. 남은 1개 E01은 CoG·지지 반력·점하중·라싱 물리 계산 및 승인이다. 공학 검토 기록만 구현했다. OR-Tools와 추가 FMS 공통 설정은 별도 후속 범위다.'
d['notes'].append('자동을 기본으로 제공하고 수동 선택·근거를 보존한다. 단위/중량 의미·포장 규칙·단가·지지점 등 불확실하거나 누락된 값을 임의로 확정하지 않는다.')
write('feature-status.json',d)
summary={'total':25,'completed':24,'incomplete':1,'inProgress':1,'notStarted':0,'verified':23,'verificationPending':2}
parallel=read('verification-parallel.json');parallel['numericSummary']=summary;write('verification-parallel.json',parallel)
entry='''## 자동 기본과 수동 선택 및 검증 자동화 2026년 10월 14일

파일 선택 시 시트·헤더·매핑·단위 후보를 자동 탐지하고 불명확한 단위/중량 의미는 직접 선택·확인하게 했다. 화물 검증·저장 후 분석·CLP 자동 생성이 기본이며 옵션으로 끌 수 있다. 미배정 수와 장비 대수 순으로 대안을 추천하고 수동 대안 선택·Move/Lock을 유지한다. 회사별 포장 규칙과 장비 단가를 등록해 자동 예상 포장/사전견적을 만들고 수동값·근거를 저장한다. 현재 화물을 자동 덮어쓰지 않고 미단가 합계는 null이다. Multi-FR은 개당 자동 배열 후보·수동 비교·검토 이력까지 구현했다. 지지 가능/공학 승인 판정은 아니다.

공학은 자동 누락 점검과 엔지니어/관리자의 근거 기록만 지원한다. CoG·지지 반력·점하중·라싱 물리 계산은 미구현이며 모든 메모를 기록해도 승인 상태로 바꾸지 않는다. 기능 25·완료 24·미완료 1, 기능 검증 통과 23·대기 2다. 실제 UI 조작은 미검증이고 L03도 검증 대기다.

V6~V8 적용으로 core_ 8·oog_ 13·기술 원장 1, 총 22개다. Java 70·Python 4·실제 DB/API 248건과 TypeScript/build 통과. tools/verify-all.ps1 한 명령으로 빌드·OOG 서버 갱신·검사·숫자 비교를 실행하고 실패하면 중단한다. 검증용 회사/규칙/업무 자료를 정리하며 테스트 세션만 폐기한다. [자동 검사 기록](verification-suite.json).

'''
for name in ['DEVELOPMENT-STATUS.md','VERIFICATION.md']:
 p=root/'docs'/name;s=p.read_text(encoding='utf-8');first,rest=s.split('\n',1);p.write_text(first+'\n\n'+entry+rest.lstrip(),encoding='utf-8')
p=root/'docs/OOG-ROADMAP.md';s=p.read_text(encoding='utf-8');start=s.index('현재 기능');end=s.index('\n\n',start);s=s[:start]+'현재 기능 25개 중 완료 24·미완료 1(진행 1·미착수 0), 검증 통과 23·대기 2다. 자동 탐지·자동 CLP/추천·포장 추정/사전견적·Multi-FR 후보 및 수동 선택을 구현했다. E01의 물리 공학 계산·승인, B07 OR-Tools 및 실제 선사 기준 검증, 추가 FMS 공통 설정은 남아 있다. 단계 전체 완료와 기능별 내부 범위를 구분한다.'+s[end:];p.write_text(s,encoding='utf-8')
p=root/'README.md';s=p.read_text(encoding='utf-8').replace('완료 22·미완료 3(진행 1·미착수 2)','완료 24·미완료 1(진행 1·미착수 0)').replace('21개 통과·4개 대기','23개 통과·2개 대기');s+='\n자동 기본은 Excel 탐지·검증 후 CLP 생성·대안 추천·등록 규칙/단가 기반 예상 포장과 견적·Multi-FR 후보다. 사용자가 수동 선택과 근거를 남길 수 있다. 단위·단가·공학 정보가 없으면 누락 상태로 표시한다.\n\n전체 자동 검사: `./tools/verify-all.ps1` (빌드 포함), `./tools/verify-all.ps1 -SkipBuild` (기존 빌드로 DB/API 검사). 직접 UI 업무 조작 검사는 포함하지 않는다. 결과는 docs/verification-suite.json이다.\n';p.write_text(s,encoding='utf-8')
p=root/'docs/ARCHITECTURE.md';s=p.read_text(encoding='utf-8');s+='''
## 자동 기본과 수동 선택

ImportDetectionService는 최대 50시트/30헤더행을 검사하며 숫자 크기로 단위를 추측하지 않는다. 유일하고 명확한 후보만 자동 선택하고 확인 후 저장한다. UI는 자동 생성 옵션과 자동/수동 시나리오 선택을 제공한다. 회사 포장 규칙·장비 단가·추정·견적은 V6의 4개 oog_ 테이블에 저장한다. 금액은 BigDecimal이며 대안별 독립 계산, 통화 혼합 거부, 단가 누락 total=null을 적용한다. 포장 추정은 실제 화물을 자동 갱신하지 않는다.

V7 oog_multi_fr_review는 개당/최대32대/원입력 방향의 잠정 배열과 필요조건·규칙·수동 선택을 저장한다. 간격을 연속 지지 길이로 더하지 않고 균등 하중 분담을 가정하지 않는다. V8 oog_engineering_review는 누락 점검과 근거 기록만 저장하며 물리 계산은 NOT_IMPLEMENTED, approved=false다. 같은 프로젝트·계획과 회사 조건을 검사하고 검토 기록은 ENGINEER/ADMIN/SUPER_ADMIN 및 PLANNING edit 권한으로 제한한다.

verify-all.ps1은 독립 oog DB를 확인한 후 빌드/서버 갱신/순차 회귀/숫자 비교를 실행한다. 검증 fixture는 정확한 UUID/테스트 회사에만 생성·정리한다. 불변 테이블 fixture 정리는 배타 잠금과 트리거 일시 변경·복구를 같은 트랜잭션 안에서 수행한다. verify-status.py는 문서 원본과 실행 API를 비교하고 실제 검사 수를 취합한다.
''';p.write_text(s,encoding='utf-8')
p=root/'docs/SCHEMA-SEPARATION.md';s=p.read_text(encoding='utf-8').replace('현재는 **업무 oog_ 7개 + 공통 core_ 8개 + Flyway 기술 원장 1개 = 총 16개**다.','현재는 **업무 oog_ 13개 + 공통 core_ 8개 + Flyway 기술 원장 1개 = 총 22개**다.').replace('현재 총 16개(core_ 8·oog_ 7·Flyway 1)다.','V5 당시 총 16개(core_ 8·oog_ 7·Flyway 1)였다.');s+='''
V6는 oog_packing_rule, oog_equipment_rate, oog_packing_estimate, oog_quotation을 추가한다. 규칙/단가와 입력·결과는 불변이며 회사·사용자·프로젝트 조건을 보존한다. V7은 oog_multi_fr_review, V8은 oog_engineering_review를 추가한다. 총 22개이며 원본 FMS DB는 변경하지 않았다.
''';p.write_text(s,encoding='utf-8')
manual=read('user-manual.json');assert manual['version']=='0.4' and len(manual['pages'])==14;manual['version']='0.5';manual['updated']='2026년 10월 14일'
manual['pages'][2]={'title':'Excel 자동 탐지와 수동 선택','blocks':[{'text':'Packing List에서 파일을 선택하면 자동 탐지가 기본으로 시작됩니다. 시트·헤더와 매핑이 명확한 경우 후보를 자동 선택하고 미리보기를 표시합니다. 여러 시트가 비슷하면 후보 목록에서 직접 선택하세요.'},{'text':'헤더에 단위나 개당·행합계 기준이 없으면 자동으로 숫자를 추측하지 않습니다. 미확정 선택값은 비워두므로 원본을 확인해 길이 단위·중량 단위·중량 의미를 선택해야 합니다. 매핑·단위 확인 체크 후 검증과 저장을 실행하세요.'},{'text':'수동 설정을 선택하면 시트·헤더 시작 행과 1행 또는 2행을 직접 지정합니다. 행 번호와 시트 번호는 0부터 입력합니다. 자동 탐지를 다시 선택하면 현재 파일을 다시 검사합니다.'},{'text':'15MB 이하 xls/xlsx를 지원합니다. 자동 탐지는 최대 50시트와 상단 30행을 검사하며 나머지 양식은 수동 미리보기를 사용합니다. 원본 파일은 변경하지 않습니다.'}]}
manual['pages'][6]={'title':'자동 CLP와 수동 대안 선택','blocks':[{'text':'화물 검증·저장 후 자동 분석과 CLP 생성이 기본입니다. Packing List 또는 CLP 화면에서 자동 생성 체크를 끄면 화물만 저장하고 자동 계획 생성 버튼으로 필요한 때 계획을 만듭니다. 자동 계획 서비스 오류가 나도 성공한 화물 저장은 유지됩니다.'},{'text':'자동 추천은 미배정 포장 수가 적은 대안을 우선하고 같은 경우 장비 대수가 적은 대안을 표시합니다. 비용 최적화나 최적해 보장은 아닙니다. 대안 탭을 클릭하면 수동 선택으로 전환하고 자동 추천을 다시 선택하면 추천 대안으로 돌아갑니다.'},{'text':'미배정 화물을 확인하고 실제 선사·지지점·라싱 조건을 검토하세요. 수동 이동·잠금·회전은 기존 규칙을 검증한 후 새로운 계획 사본으로 저장됩니다. 기존 계획은 바뀌지 않습니다.'}]}
manual['pages'][3]['blocks'].append({'text':'직접 입력하는 치수·중량이 추정값이면 확인 상태에서 추정값을 선택하세요. 분석에서 추정값 경고가 표시되고 공학 검토의 실제 포장 값 확인 항목에 남습니다.'})
manual['pages'][10]['blocks'][-1]['text']='남은 기능은 CoG·지지 반력·점하중·라싱 물리 계산과 승인입니다. 검토 메모 기능만 구현했으며 승인 완료를 뜻하지 않습니다. OR-Tools와 회사 프로필·조직·구독·개인환경 등 추가 공통 설정도 별도 후속 범위입니다.'
manual['pages'].extend([
 {'title':'회사 포장 규칙과 장비 단가','blocks':[{'text':'장비·규칙 메뉴의 포장 추정과 사전 견적에서 회사 포장 규칙과 장비 단가를 등록합니다. 조회·등록 권한은 MASTER 메뉴에 따르며 다른 회사 설정은 조회되지 않습니다.'},{'text':'포장 규칙에는 포장 유형, 전체 추가 길이·폭·높이와 개당 포장 자체 중량을 입력합니다. 여유는 한 면 치수가 아닌 전체 추가 값입니다. 기준 중량을 순중량 또는 현재 총중량으로 선택하고 근거를 남깁니다.'},{'text':'장비 단가에는 장비·통화·대당 단가·유효기간·근거를 입력합니다. 종료일을 포함해 같은 장비·통화 기간이 겹치면 등록할 수 없습니다. 규칙과 단가는 기존 버전을 수정하지 않고 신규 버전을 추가합니다.'}]},
 {'title':'자동 포장 추정과 수동 사전 견적','blocks':[{'text':'Packing List 아래 포장 추정을 열면 자동 기본으로 원치수와 회사 규칙의 여유를 더하고 기준 중량에 포장 자체 중량을 더합니다. 규칙·원치수·중량이 없으면 계산 불가 상태를 표시합니다. 수동 선택에서는 예상 치수·중량과 근거를 입력합니다.'},{'text':'추정 결과는 PRE_PACK이고 현재 화물과 기존 계획을 자동 덮어쓰지 않습니다. 실제 입력에 사용할 때는 담당자가 확인하고 추정 상태를 표시하세요.'},{'text':'프로젝트 메뉴에서 프로젝트를 선택한 뒤 사전 견적을 생성합니다. 저장된 계획과 단가 적용일·통화를 확인하세요. 등록된 단가로 대안별 장비 대수에 대한 금액을 계산하며 수동 선택에서는 장비별 단가와 근거를 변경합니다.'},{'text':'단가가 없으면 MISSING_RATE로 표시하고 합계를 미확정으로 둡니다. 포장비·라싱비는 확인한 수동 금액만 입력하고 근거를 남깁니다. 서로 다른 통화를 합산하거나 환산하지 않습니다. 대안 금액은 서로 더하지 않으며 세금·운임·미배정 화물 비용은 제외한 PRE_QUOTE입니다.'}]},
 {'title':'Multi FR 자동 후보와 수동 배열','blocks':[{'text':'CLP 아래 Multi-FR에서 화물을 선택하면 자동 후보를 계산합니다. 사전 공학 검토가 필요한 화물을 우선 표시하며 단일 FR 범위 내 화물은 자동 다중 후보에서 제외합니다. 간격을 모르면 미확인으로 두세요.'},{'text':'20FR·40FR의 길이·폭 방향 배열과 합산 계획 중량은 필요조건 비교입니다. 개당 화물 기준이며 수량 전체 선적 장비 대수가 아닙니다. 최대 32대까지 원입력 치수 방향의 후보를 계산하고 회전·혼합 장비 최적화는 포함하지 않습니다.'},{'text':'수동 배열 비교를 선택하면 장비·길이 방향 대수·폭 방향 대수를 직접 지정합니다. 치수·중량 필요조건이 부족하면 부족 상태로 표시합니다. 선택 결과는 근거와 함께 검토 이력으로 저장합니다.'},{'text':'간격은 지지가 없는 구간입니다. 단순 길이와 payload 합계로 실제 적재 가능을 판정하지 않습니다. 지지점·CoG·접촉면·점하중·반력·라싱 및 선사 승인은 별도 검토가 필요합니다.'}]},
 {'title':'자동 점검과 수동 공학 검토 기록','blocks':[{'text':'저장 계획을 열면 추정 포장 값과 미배정 화물을 자동 점검합니다. 실제 치수·CoG·지지점·접촉 면적·집중 하중·라싱 재료와 각도·선사 확인에 필요한 기록 항목을 표시합니다.'},{'text':'엔지니어 또는 관리자 역할과 PLANNING 수정 권한이 있는 사용자는 확인한 자료·수치·근거를 작성합니다. 미확인 항목은 비워두고 검토 메모와 함께 저장합니다. 현재 회사·프로젝트·계획에만 기록합니다.'},{'text':'항목을 모두 작성해도 검토 기록 완료일 뿐 공학 승인이 아닙니다. CoG·지지 반력·점하중·라싱 강도 계산은 아직 구현하지 않았으며 계획 상태는 PRE_PLAN을 유지합니다. 저장된 계획과 이전 기록은 덮어쓰지 않습니다.'}]}
]);assert len(manual['pages'])==18;write('user-manual.json',manual)
print(json.dumps({'summary':summary,'javaTests':70,'apiChecks':248,'manualVersion':'0.5','manualPages':18}))
