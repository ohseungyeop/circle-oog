"""Header detection API fixtures; no project/upload or business rows are created."""
import base64,io,json,uuid,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse
import openpyxl,psycopg
ROOT=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line)
url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];session=None
def check(name,ok):
    assert ok,name
    checks.append(name)
def request(path,data,token=None,content='application/json'):
    headers={'Content-Type':content}
    if token:headers['Authorization']='Bearer '+token
    try:
        with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=data,headers=headers),timeout=30) as r:return r.status,json.loads(r.read())['data']
    except urllib.error.HTTPError as e:return e.code,e.read()
def fixture(names,units=True):
    wb=openpyxl.Workbook();wb.remove(wb.active)
    for name in names:
        s=wb.create_sheet(name);s.append(['Packing List']);s.append([])
        s.append(['Item No','Length (mm)' if units else 'Length','Width (mm)' if units else 'Width','Height (mm)' if units else 'Height','Gross Weight per piece (kg)' if units else 'Gross Weight'])
        s.append(['CASE1',2000,1000,1200,600])
    out=io.BytesIO();wb.save(out);return out.getvalue()
def detect(raw,token):
    boundary='oog-'+uuid.uuid4().hex
    data=('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="fixture.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n').encode()+raw+('\r\n--'+boundary+'--\r\n').encode()
    return request('/imports/detect',data,token,'multipart/form-data; boundary='+boundary)
try:
    status,login=request('/auth/login',json.dumps({'tenantCode':'OOG','username':'admin','password':cfg['OOG_ADMIN_PASSWORD']}).encode());check('login',status==200)
    token=login['accessToken'];session=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['jti']
    check('anonymous denied',detect(fixture(['Cargo']),None)[0]==401)
    status,result=detect(fixture(['Cargo']),token);check('detect succeeds',status==200)
    check('unique header selected',result['autoSelectable'] and result['recommendedCandidateId']=='0:2:1')
    c=result['candidates'][0];check('explicit units and basis',c['lengthUnit']=='mm' and c['weightUnit']=='kg' and c['weightBasis']=='PER_PIECE')
    check('confirmation always required',c['requiresConfirmation'])
    result=detect(fixture(['A','B']),token)[1];check('ambiguous sheets require selection',not result['autoSelectable'] and result['recommendedCandidateId'] is None)
    c=detect(fixture(['Unknown'],False),token)[1]['candidates'][0];check('numbers do not establish units or basis',all(c[k] is None for k in ['lengthUnit','weightUnit','weightBasis']))
    check('invalid workbook rejected',detect(b'not an Excel workbook',token)[0]==400)
    (ROOT/'docs/verification-auto-import.json').write_text(json.dumps({'apiChecks':len(checks),'checks':checks,'passed':True,'uiDirectWorkflow':'not performed','businessFixturesCreated':False},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'apiChecks':len(checks),'passed':True}))
finally:
    if session:
        with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD']) as db:db.execute('update core_session set revoked_at=now() where access_jti=%s',(session,))
