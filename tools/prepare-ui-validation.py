"""Create disposable UI-only company and generated packing list; never print live credentials."""
import base64,json,uuid,urllib.request
from pathlib import Path
import openpyxl
root=Path(__file__).resolve().parents[1];cfg=dict(line.split('=',1)for line in(root/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line)
assert cfg['DB_URL'].split('?',1)[0].endswith('/oog')
def api(path,body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers),timeout=45)as r:return json.loads(r.read())['data']
platform=api('/auth/login',{'tenantCode':'OOG','username':'admin','password':cfg['OOG_ADMIN_PASSWORD']})
code='UI_'+uuid.uuid4().hex[:10].upper()
# Public disposable fixture credential, unrelated to any production or existing account.
fixture_password='UiChecks-2026-Oog!'
tenant=api('/core/tenants',{'tenantCode':code,'tenantName':'Disposable OOG UI verification','adminUsername':'uiverifier','adminPassword':fixture_password},platform['accessToken'])
login=api('/auth/login',{'tenantCode':code,'username':'uiverifier','password':fixture_password})
roles=api('/core/roles',token=login['accessToken']);engineer=next(r['role_id']for r in roles if r['role_code']=='ENGINEER')
reviewer=api('/core/users',{'username':'uireviewer','password':fixture_password,'roleId':engineer},login['accessToken'])
runtime=root/'.runtime';runtime.mkdir(exist_ok=True)
meta={'tenantCode':code,'tenantId':tenant['tenantId'],'username':'uiverifier','reviewer':'uireviewer','platformSession':json.loads(base64.urlsafe_b64decode(platform['accessToken'].split('.')[1]+'=='))['jti'],'setupSession':json.loads(base64.urlsafe_b64decode(login['accessToken'].split('.')[1]+'=='))['jti']}
(runtime/'ui-validation.json').write_text(json.dumps(meta),encoding='utf-8')
book=openpyxl.Workbook();sheet=book.active;sheet.title='UI Packing List';sheet.append(['Packing List UI Verification']);sheet.append([])
sheet.append(['Item No','Description','Quantity','Length (mm)','Width (mm)','Height (mm)','Gross Weight per piece (kg)','Net Weight per piece (kg)','Original Length (mm)','Original Width (mm)','Original Height (mm)'])
sheet.append(['UI-A','표준 펌프',2,2500,1200,1000,1200,1000,2000,1000,800]);sheet.append(['UI-B','OOG 설비',1,5000,2800,2000,8000,7000,4500,2400,1700]);sheet.append(['UI-X','Multi-FR 검토 화물',1,30000,5000,3000,100000,90000,29000,4500,2800])
book.save(runtime/'ui-packing-list.xlsx')
print(json.dumps({'tenantCode':code,'username':'uiverifier','reviewer':'uireviewer','fixtureFile':str(runtime/'ui-packing-list.xlsx')}))
