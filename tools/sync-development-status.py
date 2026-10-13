import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
source=root/'docs/feature-status.json'
status=json.loads(source.read_text(encoding='utf-8-sig'))
items=status['items'];ids=[i['id'] for i in items]
assert len(ids)==len(set(ids))
counts={key:sum(i['development']==key for i in items) for key in ['COMPLETE','IN_PROGRESS','NOT_STARTED']}
verified=sum(i['verification']=='PASSED' for i in items)
labels={'COMPLETE':'완료','IN_PROGRESS':'진행','NOT_STARTED':'미착수','PASSED':'통과','PENDING':'대기'}
md=['# OOG 기능 상태','',f"기준일 {status['updated']} · 관리 버전 {status['version']}",'',
    f"전체 **{len(items)}개** · 완료 **{counts['COMPLETE']}개** · 미완료 **{counts['IN_PROGRESS']+counts['NOT_STARTED']}개** (진행 {counts['IN_PROGRESS']} · 미착수 {counts['NOT_STARTED']})",
    f"기능별 검증 **{verified}개 통과 / {len(items)-verified}개 대기**",'',
    '완료는 표에 명시한 내부 개발 범위 기준이다. 실제 회사/선사 승인과 UI 직접 업무검증은 별도로 관리한다. 검증은 해당 항목의 대표 규칙·API 검사를 의미하며 모든 입력 조합의 무오류 보장을 뜻하지 않는다.','',
    '| ID | 기능 | 내용 | 개발 | 검증 | 근거 또는 남은 범위 |','|---|---|---|---|---|---|']
for i in items:md.append('| '+ ' | '.join([i['id'],i['name'],i['description'],labels[i['development']],labels[i['verification']],i['evidence'].replace('|','/').replace('\n',' ')])+' |')
md+=['','## 검증 실행 수','']
for key,value in status.get('verificationRuns',{}).items():md.append(f'- {key}: {value}')
md+=['','## 미완료 및 실무 적용 조건','']+[f'- {n}' for n in status.get('notes',[])]
(root/'docs/FEATURE-STATUS.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
dest=root/'backend/src/main/resources/development/feature-status.json';dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'total':len(items),'completed':counts['COMPLETE'],'incomplete':counts['IN_PROGRESS']+counts['NOT_STARTED'],'inProgress':counts['IN_PROGRESS'],'notStarted':counts['NOT_STARTED'],'verified':verified,'verificationPending':len(items)-verified}))
