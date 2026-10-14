"""Fixture-scoped OOG comparison and quotation export API checks."""
import base64,json,uuid,urllib.request,urllib.error,zipfile,io
from pathlib import Path
from urllib.parse import urlparse
import psycopg
import pymupdf
ROOT=Path(__file__).resolve().parents[1];cfg=dict(x.split('=',1)for x in(ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in x);url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];projects=[];quoteids=[];jti=None
def check(name,ok):
 assert ok,name
 checks.append(name)
def api(path,method='GET',body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 try:
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method),timeout=45)as r:
   data=r.read();return r.status,json.loads(data)['data']if r.headers.get_content_type().endswith('json')else data
 except urllib.error.HTTPError as e:return e.code,None
with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'])as db:
 try:
  s,login=api('/auth/login','POST',{'username':'admin','password':cfg['OOG_ADMIN_PASSWORD']});check('login',s==200);token=login['accessToken'];jti=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['jti']
  s,p=api('/projects','POST',{'name':'VERIFY-COMPARE-'+uuid.uuid4().hex,'customer':'fixture'},token);check('project',s==200);pid=p['id'];projects.append(pid)
  s,c=api('/projects/'+pid+'/cargos','POST',{'projectId':pid,'itemNo':'한국어 비교','length':1000,'width':500,'height':500,'grossWeight':100,'quantity':1},token);check('cargo',s==200)
  s,left=api('/projects/'+pid+'/plans','POST',{},token);check('first saved plan',s==200);s,right=api('/projects/'+pid+'/plans','POST',{},token);check('second saved plan',s==200)
  path=f'/projects/{pid}/plans/compare?left={left["id"]}&right={right["id"]}'
  check('comparison unauthenticated401',api(path)[0]==401);s,v=api(path,token=token);check('same snapshots no pieces changed',s==200 and all(not a['changes']for a in v['scenarios']))
  check('unknown plan404',api(f'/projects/{pid}/plans/compare?left={left["id"]}&right={uuid.uuid4()}',token=token)[0]==404)
  codes={b['equipment']for a in left['result']['scenarios']for b in a['containers']};s,q=api('/projects/'+pid+'/quotations','POST',{'planId':left['id'],'currency':'USD','mode':'MANUAL','equipmentOverrides':{code:'0.10'for code in codes},'reason':'verified output fixture'},token);check('quote saved',s==200);quoteids.append(q['id'])
  ep=f'/projects/{pid}/quotations/{q["id"]}/export';check('quote export unauthenticated401',api(ep)[0]==401);s,xlsx=api(ep,token=token);check('xlsx workbook',s==200 and zipfile.is_zipfile(io.BytesIO(xlsx)))
  s,pdf=api(ep+'/pdf',token=token);check('pdf binary',s==200 and pdf.startswith(b'%PDF'))
  output=ROOT/'docs/comparison-export-qa';output.mkdir(exist_ok=True);(output/'verified-quotation.pdf').write_bytes(pdf)
  with pymupdf.open(stream=pdf,filetype='pdf')as doc:
   text=''.join(page.get_text()for page in doc);check('prequote Korean text', 'PRE_QUOTE'in text and '사전 견적서'in text);check('fees unconfirmed warnings preserved','PACKING_FEE_NOT_PROVIDED'in text and 'LASHING_FEE_NOT_PROVIDED'in text);check('alternatives separate','대안 1'in text and '대안 2'in text)
   for i,page in enumerate(doc):page.get_pixmap(matrix=pymupdf.Matrix(1.2,1.2)).save(str(output/f'quotation-page-{i+1}.png'))
  check('unknown quote404',api(f'/projects/{pid}/quotations/{uuid.uuid4()}/export',token=token)[0]==404)
 finally:
  db.rollback()
  if quoteids:
   db.execute('LOCK TABLE oog_quotation IN ACCESS EXCLUSIVE MODE');db.execute('ALTER TABLE oog_quotation DISABLE TRIGGER oog_quotation_immutable');db.execute('DELETE FROM oog_quotation WHERE id=ANY(%s)',([uuid.UUID(x)for x in quoteids],));db.execute('ALTER TABLE oog_quotation ENABLE TRIGGER oog_quotation_immutable')
  for pid in projects:
   for table in ['core_audit_history','oog_clp_scenario','oog_cargo']:db.execute(f'delete from {table} where project_id=%s',(pid,))
   db.execute('delete from oog_project where id=%s',(pid,))
  if jti:db.execute('delete from core_session where access_jti=%s',(jti,))
  db.commit()
report={'passed':len(checks),'failed':0,'checks':checks,'fixturesRemoved':True};(ROOT/'docs/verification-comparison-exports.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'passed':len(checks),'failed':0}))
