import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(name):return json.loads((root/'docs'/name).read_text(encoding='utf-8'))
def write(name,value):(root/'docs'/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
r=read('verification-master-pdf.json');assert r['apiChecks']>=42 and r['javaTests']>=51 and r['fixturesRemoved']
core=read('verification-core.json');parallel=read('verification-parallel.json');foundation=read('verification-foundation.json')
assert core['apiChecks']==66 and parallel['apiChecks']==39 and foundation['apiChecks']==19
d=read('feature-status.json');d['updated']='2026-10-14';d['version']='0.4'
changes={
 'M01':('장비 물리 제원 편집·DEFAULT 규칙 분리·버전 충돌·감사','실제 장비 편집/범위·버전/플랫폼 권한/전후 감사 API 통과. 초기 제원의 실무 승인은 별도'),
 'M02':('회사별 선사 규칙·불변 버전·유효기간·선택·대체 정책','회사 분리·중복 기간·v1/v2·종료일 포함·SQL 변경/삭제 거부·snapshot/API/Excel 검증. 종료 없는 버전은 이후 등록을 막으므로 기간 확인 필요'),
 'O02':('저장 CLP 전용 한글 PDF·전체 시나리오·3면 개략도','실제 API PDF 생성/한글/미배정/대안 보존·5페이지 렌더 확인. OOG_PDF_FONT 한글 TTF 필요. 공학도면 아님')}
for item in d['items']:
    if item['id'] in changes:
        item['description'],item['evidence']=changes[item['id']];item['development']='COMPLETE';item['verification']='PASSED'
d['verificationRuns'].update({'Java 단위 검사':f"{r['javaTests']}건 통과·실패 0",'장비·선사 규칙·PDF 실제 DB/API':f"{r['apiChecks']}건 통과",'사용자 매뉴얼':'v0.4 / 14페이지','DB':'V5 / core_ 8 / oog_ 7 / 기술 원장 1'})
d['notes'][1]='완료는 표에 명시한 내부 개발 범위다. 남은 3개는 L05 Multi-FR, Q01 견적/포장추정, E01 공학이다. OR-Tools 최적화와 추가 FMS 공통 설정은 별도 후속 범위다.'
d['notes'][3]='공통 장비 제원/DEFAULT 규칙 변경은 회사 1 플랫폼 SUPER_ADMIN과 MASTER 수정 권한이 모두 필요하다. 선사 규칙은 회사별 불변 버전으로 관리하며 미일치 DEFAULT 대체 여부를 선택한다.'
write('feature-status.json',d)
summary={'total':25,'completed':22,'incomplete':3,'inProgress':1,'notStarted':2,'verified':21,'verificationPending':4}
parallel['numericSummary']=summary;parallel['javaTests']=r['javaTests'];write('verification-parallel.json',parallel)
for name in ['verification-core.json','verification-foundation.json','verification-parallel.json','verification-master-pdf.json']:
    value=read(name);value['date']='2026-10-14';write(name,value)
entry=f'''## 장비와 선사 규칙 및 PDF 검증 2026년 10월 14일

장비 물리 제원 편집에 낙관적 버전과 변경 전후 감사를 적용했다. 회사별 선사 규칙은 유효기간이 겹치지 않는 불변 버전으로 추가하며 분석과 계획에 선사·적용일·DEFAULT 대체 정책을 선택한다. 선택 정보와 실제 규칙은 계획 snapshot 및 분석/CLP Excel에 보존한다. 저장된 CLP의 전용 한글 PDF에 전체 시나리오·미배정·경고·3면 개략도를 출력한다. 실제 선사 제원과 공학 승인은 별도다.

Java {r['javaTests']}건, 신규 실제 DB/API {r['apiChecks']}건, 기존 회귀 19+39+66건, 프런트 TypeScript/build 통과. V4 장비 버전 및 V5 oog_carrier_rule_version 적용으로 core_ 8·oog_ 7·기술 원장 1, 총 16개다. 테스트 회사/규칙/장비/업무 자료를 정리하고 테스트 세션만 폐기했다. API로 받은 PDF 5페이지를 렌더링해 확인했다. 직접 UI 업무 조작은 미검증이다. 기능 25·완료 22·미완료 3, 기능 검증 통과 21·대기 4다. [검증 근거](verification-master-pdf.json).

'''
for name in ['DEVELOPMENT-STATUS.md','VERIFICATION.md']:
    p=root/'docs'/name;s=p.read_text(encoding='utf-8');first,rest=s.split('\n',1);p.write_text(first+'\n\n'+entry+rest.lstrip(),encoding='utf-8')
p=root/'docs/OOG-ROADMAP.md';s=p.read_text(encoding='utf-8');start=s.index('현재 기능');end=s.index('\n\n',start)
s=s[:start]+'현재 기능 목록은 25개이며 완료 22·미완료 3(진행 1·미착수 2), 검증 통과 21·대기 4다. 장비 편집·다중 선사 규칙·전용 PDF를 추가 검증했다. B07의 OR-Tools와 실제 선사 기준 승인, B08의 견적·포장추정 및 Multi-FR/공학은 남아 있다. 단계 전체 완료와 기능별 완료를 구분한다.'+s[end:];p.write_text(s,encoding='utf-8')
p=root/'README.md';s=p.read_text(encoding='utf-8').replace('완료 19·미완료 6(진행 3·미착수 3)','완료 22·미완료 3(진행 1·미착수 2)').replace('18개 통과·7개 대기','21개 통과·4개 대기').replace('분석 Excel 또는 브라우저 PDF 출력','선사·적용일 확인 → 분석 Excel 및 저장 CLP Excel/PDF 출력');p.write_text(s,encoding='utf-8')
p=root/'docs/ARCHITECTURE.md';s=p.read_text(encoding='utf-8').replace('현재 DEFAULT 규칙만 지원하며 실제 선사별 유효기간·복수 규칙 버전은 후속 개발이다.','V5 oog_carrier_rule_version에서 회사별 선사·장비의 불변 버전과 유효기간을 관리한다. 기간 중복을 차단하고 규칙 미일치 시 명시적인 DEFAULT 대체 또는 거부 정책을 적용한다. 선택·버전 정보를 입력/결과 snapshot에 보존한다.').replace('추가 FMS 공통 설정, 다중 선사 Rule과 외부 HTTPS 구성은 별도 범위다.','추가 FMS 공통 설정과 외부 HTTPS 구성은 별도 범위다.')
s+='\n## 장비 편집과 전용 PDF\n\nV4 장비 version으로 동시 편집 충돌을 409로 반환한다. 공통 물리 제원은 플랫폼 관리자만 변경하며 기존 저장 계획은 변경되지 않는다. PDFBox로 저장된 모든 시나리오를 한글 PDF와 3면 개략도로 출력한다. OOG_PDF_FONT는 설치된 한글 TTF 경로이며 Windows 기본값은 C:/Windows/Fonts/malgun.ttf다. 글꼴 파일이 없으면 503을 반환한다. 원본 글꼴은 소스에 복사하지 않고 PDF에는 사용 글리프만 포함한다.\n';p.write_text(s,encoding='utf-8')
p=root/'docs/SCHEMA-SEPARATION.md';s=p.read_text(encoding='utf-8').replace('현재는 **업무 oog_ 6개 + 공통 core_ 8개 + Flyway 기술 원장 1개 = 총 15개**다.','현재는 **업무 oog_ 7개 + 공통 core_ 8개 + Flyway 기술 원장 1개 = 총 16개**다.');s=s.replace('| 업무 | oog_carrier_rule | OOG 장비 계획 규칙 |','| 업무 | oog_carrier_rule | 공통 DEFAULT 장비 계획 규칙 |\n| 업무 | oog_carrier_rule_version | 회사별 선사 규칙 불변 버전과 유효기간 |');s+='\nV4는 oog_equipment.version을 추가하고 V5는 oog_carrier_rule_version 및 기간 중복·불변 트리거를 추가한다. 현재 총 16개(core_ 8·oog_ 7·Flyway 1)다. UPDATE/DELETE를 차단해 기존 버전을 보존한다. 관리자가 테스트 자료를 정리할 때에만 배타 잠금과 트리거 변경을 같은 트랜잭션 안에서 처리하며 지정한 테스트 회사의 규칙만 제거한다. 운영 API에는 수정/삭제 경로가 없다.\n';p.write_text(s,encoding='utf-8')
manual=read('user-manual.json');manual['version']='0.4';manual['updated']='2026년 10월 14일'
manual['pages'][5]={'title':'장비 제원과 계획 규칙','blocks':[{'text':'장비·규칙 메뉴에서 물리 제원과 계획 허용치를 별도로 확인합니다. 초기 값은 개발 기준이며 실제 선사·장비 사양은 담당자가 확인해야 합니다.'},{'text':'플랫폼 관리자는 장비 행의 제원 편집에서 길이·폭·높이·Payload와 측면·상부 개방 여부를 변경합니다. 단위는 mm와 kg입니다. 다른 담당자가 먼저 저장하면 최신 목록을 조회한 후 다시 편집하세요.'},{'text':'DEFAULT 계획 규칙의 유효 길이·중량 비율과 초과 허용 폭·높이는 별도 설정입니다. 물리 제원 변경은 저장된 계획에 소급되지 않으며 이후 분석과 새 계획부터 적용됩니다.'}]}
manual['pages'][7]={'title':'계획 출력과 개발 현황','blocks':[{'text':'분석 Excel은 현재 선택한 선사·적용일과 대체 정책을 적용합니다. Rule Selection 시트에서 실제 장비별 규칙 버전과 DEFAULT 대체 여부를 확인하세요.'},{'text':'CLP Excel과 CLP PDF는 저장 당시 입력과 계획의 모든 시나리오를 출력합니다. 대안별 장비 대수는 서로 더하지 않습니다. 과거 계획도 이력의 출력 버튼으로 다운로드합니다.'},{'text':'PDF에는 한글 품목·배정·미배정·검토 경고와 상면·측면·정면 개략도가 포함됩니다. 원본 좌표 단위는 mm입니다. 도면은 사전계획이며 공학 승인 완료를 뜻하지 않습니다. 글꼴 설정 오류는 서버 관리자에게 문의하세요.'},{'text':'대시보드와 업무 안내는 같은 기능 목록으로 개발 완료와 검증 통과 수를 별도로 표시합니다. 실제 UI 업무 조작 검증과 API 검증은 구분합니다.'}]}
manual['pages'][10]['blocks'][-1]['text']='남은 기능 묶음은 Multi-FR·지지점, 견적·포장추정과 라싱 공학입니다. OR-Tools 및 회사 프로필·조직·상품 구독·개인환경 등 추가 공통 설정은 별도 후속 범위입니다. 기능 수가 선사 또는 공학 승인을 뜻하지 않습니다.'
manual['pages'].append({'title':'회사별 선사 규칙과 적용일','blocks':[{'text':'장비·규칙 메뉴의 회사별 선사 규칙에서 선사·장비·적용 시작일·종료일·계획 허용치와 근거를 입력합니다. 등록 권한이 있는 회사 계정만 추가하며 다른 회사 규칙은 조회되지 않습니다.'},{'text':'기존 버전은 수정하거나 삭제하지 않습니다. 종료일을 포함하여 동일 선사·장비의 기간이 겹치면 등록할 수 없습니다. 종료일 없이 등록하면 이후 기간도 겹치므로 등록 전에 기간을 확인하세요.'},{'text':'같은 메뉴에서 적용 선사·적용일과 규칙 미일치 정책을 선택합니다. DEFAULT 적용을 허용하면 해당 선사의 규칙이 없는 장비만 공통값을 사용합니다. 모든 장비의 선사 규칙 필요를 선택하면 하나라도 없을 때 분석과 계획이 거부됩니다.'},{'text':'선택을 바꾸면 현재 분석은 다시 계산됩니다. 새 자동 계획부터 해당 선택을 저장하며 과거 계획은 당시 규칙을 유지합니다. 분석자료와 CLP 출력의 선사·적용일·버전·대체 여부를 담당자에게 확인받으세요.'}]})
assert len(manual['pages'])==14;write('user-manual.json',manual)
print(json.dumps({'summary':summary,'javaTests':r['javaTests'],'newApiChecks':r['apiChecks'],'manualVersion':'0.4'},ensure_ascii=False))
