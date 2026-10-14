import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
core=json.loads((root/'docs/verification-core.json').read_text(encoding='utf-8'))
assert core['apiChecks']==66 and core['javaTests']==37 and core['javaFailures']==0 and core['fixturesRemoved']
path=root/'docs/feature-status.json';status=json.loads(path.read_text(encoding='utf-8'))
status['version']='0.3'
for item in status['items']:
    if item['id']=='C02':item.update({'description':'DB 관리자 계정·JWT API 인증','evidence':'DB 로그인·세션 폐기·재발급/토큰 갱신 API 검증. 메모리/Basic 인증 제거'})
    if item['id']=='C03':item.update({'development':'COMPLETE','verification':'PASSED','description':'회사/사용자/역할/메뉴·JWT·DB 세션·회사 접근 분리','evidence':'core_ 7개 신규·회사/초기 관리자/사용자/메뉴 권한 연결·JWT/회전/폐기/잠금/회사 분리 API 66건. 추가 회사·조직/구독 설정 제외'})
    if item['id']=='I02':item['evidence']='실제 mm/kg와 m/ton·행합계 매핑 API 통과. cm/다른 고객 양식은 별도 검증'
status['verificationRuns']={'Java 단위 검사':'37건 통과·실패 0','Python 검사':'4건 통과','공통 인증 실제 DB/API':'66건 통과','업무 실제 DB/API 회귀':'19+39건 통과','프런트 TypeScript/build':'통과','UI 직접 업무검증':'미실시','사용자 매뉴얼':'v0.3 / 갱신 중','DB':'V3 / core_ 8 / oog_ 6 / 기술 원장 1'}
status['notes']=[
 '로그인 이후 UI 직접 업무검증은 미실시다. L03 2D는 build만 확인하여 검증 대기다.',
 '완료는 표에 명시한 내부 개발 범위다. 남은 6개는 M01 장비 편집, M02 다중 Rule, L05 Multi-FR, O02 전용 PDF, Q01 견적/포장추정, E01 공학이다.',
 'FMS 공통 19개 중 인증/회사/권한 7개를 OOG에 연결했고 기존 공통 감사까지 core_ 8개다. 회사 프로필/조직/구독/메시지/개인환경/채번의 추가 공통 설정은 아직 미이식이다.',
 '공통 장비 제원/DEFAULT 규칙은 전역이다. 변경은 회사 1 플랫폼 SUPER_ADMIN과 메뉴 수정 권한이 모두 필요하다. 회사별 선사 Rule은 M02 후속 범위다.',
 '자동 매핑은 사용자 확인이 필요하다. 최적해 보장과 선사·공학·실무 승인은 개발 완료 숫자에 포함하지 않는다.'
]
path.write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
parallel_path=root/'docs/verification-parallel.json';parallel=json.loads(parallel_path.read_text(encoding='utf-8'))
parallel.update({'javaTests':37,'javaFailures':0,'optimizerTests':4,'manualVersion':'0.3','numericSummary':{'total':25,'completed':19,'incomplete':6,'inProgress':3,'notStarted':3,'verified':18,'verificationPending':7}})
parallel_path.write_text(json.dumps(parallel,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert sum(i['development']=='COMPLETE' for i in status['items'])==19
assert sum(i['verification']=='PASSED' for i in status['items'])==18
print('Recorded core_ 8 + oog_ 6 + Flyway 1; feature complete 19 / 25')
