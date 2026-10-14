import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'docs/user-manual.json';manual=json.loads(path.read_text(encoding='utf-8'))
manual['version']='0.3'
for page in manual['pages']:
    if page['title']=='프로젝트와 초기 접속':page['blocks']=[
        {'text':'회사 코드, 계정과 비밀번호로 로그인합니다. 초기 회사 코드는 OOG이고 최초 플랫폼 관리자 계정은 admin입니다. 초기 비밀번호는 서버 관리자가 제공하며 이후 회사별로 등록한 계정으로 접속합니다.'},
        {'text':'사용자·역할·메뉴 권한은 DB에서 관리합니다. 로그인한 회사의 프로젝트만 보이며 요청에 다른 회사 번호를 넣어도 서버가 현재 회사로 제한합니다. 다른 회사 업무는 그 회사 계정으로 로그인해 처리하세요.'},
        {'text':'Access 세션은 30분이며 화면의 Refresh 세션은 메모리에서만 유지합니다. 갱신 시 이전 세션은 폐기됩니다. 로그아웃하면 같은 계정의 세션을 폐기합니다. 계정 비활성화나 역할 변경 후에는 다시 로그인해야 합니다.'},
        {'text':'비밀번호를 5회 틀리면 15분 동안 새 로그인이 잠깁니다. 회사 코드와 계정을 확인하고 잠금이 풀린 뒤 다시 시도하세요. 관리자는 다른 사용자의 상태를 변경하여 잠금과 기존 세션을 정리할 수 있습니다.'}
    ]
    if page['title']=='장비와 계획 규칙':page['blocks'].append({'text':'장비 제원과 DEFAULT 규칙은 현재 공통 기준입니다. 변경은 회사 1의 플랫폼 SUPER_ADMIN 계정과 메뉴 수정 권한이 있어야 가능합니다. 회사별 선사 Rule은 후속 개발입니다.'})
    if page['title']=='개발 수치와 검증 상태 읽기':
        page['blocks'][-1]={'text':'남은 기능은 장비 편집, 다중 선사 규칙, Multi-FR·지지점, 전용 PDF, 견적·포장추정과 라싱 공학입니다. 공통 인증은 연결됐으며 회사 프로필·조직·상품 구독·개인환경 같은 추가 공통 설정은 아직 지원하지 않습니다. 기능 수가 실제 선사 또는 공학 승인을 뜻하지 않습니다.'}
extra=[
 {'title':'회사와 사용자 등록','blocks':[
     {'text':'회사·사용자·권한 메뉴는 관리자 계정에서 엽니다. 회사 탭은 플랫폼 관리자에게만 보입니다. 새 회사에서 영문 대문자·숫자·밑줄·하이픈의 회사 코드와 회사명을 입력하고 최초 관리자 계정·비밀번호를 함께 등록합니다.'},
     {'text':'새 회사에는 기본 역할과 메뉴가 생성됩니다. 해당 회사 코드와 초기 관리자 계정으로 로그인하면 그 회사의 사용자와 프로젝트를 관리합니다. 플랫폼 관리자는 다른 회사 프로젝트를 자동으로 열람할 수 없습니다.'},
     {'text':'사용자 탭에서 계정·초기 비밀번호·역할을 등록합니다. 비밀번호는 12자 이상, UTF-8 기준 72바이트 이하입니다. 사용자 역할 또는 상태를 변경하면 토큰 버전이 증가하고 기존 세션이 폐기됩니다. 다른 관리자가 먼저 바꾸면 새로고침 후 다시 확인하세요.'},
     {'text':'본인 계정과 플랫폼 관리자 계정은 이 화면에서 변경할 수 없습니다. 다른 회사의 역할 번호로 사용자를 등록하거나 변경할 수 없습니다.'}
 ]},
 {'title':'역할별 메뉴 권한','blocks':[
     {'text':'역할·메뉴 탭에서 변경할 역할을 선택하면 현재 권한을 읽습니다. 메뉴별 조회·등록·수정·삭제·출력을 확인한 후 저장하세요. 등록·수정·삭제·출력을 허용하려면 조회도 허용해야 합니다.'},
     {'text':'ADMIN과 SUPER_ADMIN은 기본 관리자 역할이므로 메뉴 권한을 변경할 수 없습니다. PLANNER는 화물 계획 업무, ENGINEER는 분석·계획, SALES와 CUSTOMER는 허용한 조회·출력 업무를 기본으로 제공합니다.'},
     {'text':'권한은 서버에서 요청마다 검사합니다. 화면에 버튼이 남아 있어도 현재 권한을 회수하면 작업이 거부됩니다. 공통 장비 규칙 변경은 메뉴 권한 외에도 플랫폼 관리자 조건이 필요합니다.'}
 ]}
]
names={p['title'] for p in manual['pages']};manual['pages'].extend(p for p in extra if p['title'] not in names)
path.write_text(json.dumps(manual,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
status_path=root/'docs/feature-status.json';status=json.loads(status_path.read_text(encoding='utf-8'));status['verificationRuns']['사용자 매뉴얼']='v0.3 / '+str(len(manual['pages']))+'페이지';status_path.write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Updated core user manual',len(manual['pages']),'sections')
