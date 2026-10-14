"""Historical one-off updater; superseded by the OOG scope correction in v0.8."""
raise SystemExit("Superseded. Edit docs/feature-status.json and use sync-development-status.py instead.")
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'docs/feature-status.json';d=json.loads(p.read_text(encoding='utf-8-sig'))
new=[
 {'id':'M03','name':'장비 타입·모델 신규 등록','description':'물리 제원·DEFAULT 규칙 원자적 등록·근거 감사·플랫폼 권한·중복 차단','development':'COMPLETE','verification':'PASSED','evidence':'Java 입력/권한·실제 API 생성/규칙/감사/중복/타회사 차단·jsdom 검사. 가상 제원 자동 등록 없음'},
 {'id':'M04','name':'반입 개구부 단면 검사','description':'DOOR/TOP/SIDE 직사각형 단면·면당 여유·수평90도 비교','development':'COMPLETE','verification':'PASSED','evidence':'Java 치수 경계/축/회전/개방면/유한 입력·실제 API·jsdom 결과 무효화 검사. 이동 경로·인양 해석 제외'},
 {'id':'E04','name':'확대 구조와 실제 장비 모델','description':'Multi-FR 상호 하중 분담·장비 강성 연성·국부 응력/좌굴/피로 등','development':'IN_PROGRESS','verification':'PENDING','evidence':'현재 독립 패드/일정 EI 단순 보의 제한 모델까지만 검증. 장비 도면·연성 모델과 별도 검증 필요'},
 {'id':'S01','name':'냉동·탱크 전용 운용','description':'온도/환기/전원 및 탱크·액체·위험물 등 전용 운용 제약','development':'NOT_STARTED','verification':'PENDING','evidence':'일반 기하 배치와 구분. 전용 요구사항·자료·모델 미구현'}]
for item in new:
 d['items']=[i for i in d['items']if i['id']!=item['id']];d['items'].append(item)
for i in d['items']:
 if i['id']=='E01':i['description']='실제 장비·실측 화물 자료 대조와 운송/선사 승인 연계';i['evidence']='공개 선사 지침·수치 모델·독립 내부 검토는 구현됨. 개별 장비·화물의 증빙 및 실제 선사 승인 연계는 대기. 확대 구조와 전용 운용은 E04/S01 별도 집계'
d['notes']=[n for n in d['notes'] if not n.startswith('전체31') and '신규 타입 생성 화면은 미구현' not in n]
d['notes'].insert(0,'확장 범위 전체35·완료32·미완료3(E01/E04/S01), 기능검증32·대기3. 기존 31개 정의에서 장비 등록·개구부·확대 구조·전용 운용을 분리 추가했다.')
d['notes'].append('장비 신규 등록 화면/API 구현. 같은 계열도 선사·모델·상태가 다르면 별도 코드와 근거로 관리한다. 문/상부/측면은 선언 개구부의 직사각형 단면 검사이며 자동 CLP 승인이나 내부 이동 경로 해석은 아니다.')
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=root/'docs/user-manual.json';m=json.loads(p.read_text(encoding='utf-8'))
for page in m['pages']:
 for b in page['blocks']:
  if 'text'in b:
   b['text']=b['text'].replace('전체 31개','전체 35개').replace('완료 30개','완료 32개').replace('미완료 1개','미완료 3개').replace('검증 30개','검증 32개').replace('대기 1개','대기 3개')
 if page['title']=='장비 제원과 계획 규칙':
  if not any(b.get('heading')=='반입 개구부 검토' for b in page['blocks']):
   page['blocks'] += [{'heading':'반입 개구부 검토'},{'text':'장비 행의 개구부 검토에서 화물 치수, 반입 방향, 실제 유효 개구부 A/B 치수, 면당 작업 여유와 확인 근거를 입력합니다. DOOR는 폭/높이, TOP는 길이/폭, SIDE는 길이/높이입니다. 수평 90도 회전 비교를 선택하면 반입 전 회전한 후보도 검사합니다. 입력을 바꾸면 이전 결과는 지워집니다. 단면 통과 후보는 내부 회전·이동 경로·기울임·인양 또는 운송 적합성을 확정하지 않으며 저장 계획을 자동 변경하지 않습니다.'}]
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ['ARCHITECTURE.md','OOG-ROADMAP.md','DEVELOPMENT-STATUS.md','VERIFICATION.md']:
 p=root/'docs'/name
 with p.open('a',encoding='utf-8')as f:f.write('\n\n## 2026-10-14 장비 등록과 반입 개구부\n\n장비 등록 화면/API가 물리 제원과 DEFAULT 규칙 및 확인 근거 감사를 한 트랜잭션으로 생성한다. 플랫폼 관리자만 생성하며 코드 충돌/잘못된 비율/닫힌 면 초과 허용을 거부한다. 개구부 검토는 MASTER 조회 권한으로 선언된 유효 개구부의 DOOR/TOP/SIDE 직사각형 단면과 면당 여유를 검사하며 수평90도 후보를 비교한다. 내부 이동 경로/인양/선사 승인 및 저장 계획 자동 변경은 제외다. 기존 미완료 큰 항목을 E01 실제 증빙/승인, E04 확대 구조, S01 냉동·탱크 전용 운용으로 분리하고 M03/M04을 추가했다. 확장 기능 정의는 전체35·완료32·미완료3이며 과거31개 집계는 당시 범위다.\n')
p=root/'docs/PUBLIC-CARRIER-REFERENCES.md';s=p.read_text(encoding='utf-8-sig').replace('현재 장비 관리 화면은 기존 장비 수정용이며 신규 타입 생성 화면은 아직 없다.','장비 관리 화면에서 플랫폼 관리자가 신규 타입·모델 제원과 기본 규칙을 확인 근거와 함께 등록할 수 있다. 개구부 검토는 선언한 실제 유효 개구부의 정방향/수평90도 단면 검사까지만 제공한다.');p.write_text(s,encoding='utf-8')
