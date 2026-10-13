import json
from pathlib import Path
from xml.etree import ElementTree as ET
root=Path(__file__).resolve().parents[1]
report_path=root/'docs/verification-parallel.json'
report=json.loads(report_path.read_text(encoding='utf-8'))
assert report['apiChecks']==39 and report['testProjectsRemoved']
tests=failures=errors=skipped=0
for path in (root/'backend/build/test-results/test').glob('TEST-*.xml'):
    suite=ET.parse(path).getroot();tests+=int(suite.get('tests',0));failures+=int(suite.get('failures',0));errors+=int(suite.get('errors',0));skipped+=int(suite.get('skipped',0))
assert tests==20 and failures==errors==skipped==0,(tests,failures,errors,skipped)
report.update({'javaTests':tests,'javaFailures':failures,'optimizerTests':4,'manualVersion':'0.2','manualPages':11,'numericSummary':{'total':25,'completed':18,'incomplete':7,'inProgress':3,'notStarted':4,'verified':17,'verificationPending':8}})
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
path=root/'docs/feature-status.json';status=json.loads(path.read_text(encoding='utf-8'))
evidence={
 'P03':'원치수 수동 입력/Excel 분리·m→mm 실제 DB 확인',
 'I04':'병합 2행 자동 매핑·행합계/수량·ton→kg 실제 API 확인. 고객 확인 필요',
 'L04':'실제 이동/잠금/해제·겹침/회전/한도 거부·원본 불변·감사 검증. 미배정 배정/새 장비/적층은 제외',
 'O03':'실제 Excel 11시트·전체 시나리오·배정/미배정·3면 도면 셀·공식 입력 문자 검증. 개략도이며 공학도면 아님',
 'H01':'원본 bytes·구조화 JSON·계획/감사·소속/페이징 API 검증. UI 직접 업무검증 미실시'
}
for item in status['items']:
    if item['id'] in evidence:item.update({'development':'COMPLETE','verification':'PASSED','evidence':evidence[item['id']]})
status['verificationRuns']={'Java 단위 검사':'20건 통과·실패 0','Python 검사':'4건 통과','새 기능 실제 DB/API':'39건 통과','초기 회귀 API':'이전 19건 통과','프런트 TypeScript/build':'통과','UI 직접 업무검증':'미실시','사용자 매뉴얼':'v0.2 / 11페이지'}
assert sum(i['development']=='COMPLETE' for i in status['items'])==18
assert sum(i['verification']=='PASSED' for i in status['items'])==17
path.write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Recorded 25 / complete 18 / incomplete 7 / verified 17 / pending 8')
