"""OOG-only Multi-FR fixtures, removed by this run's exact project IDs."""
import base64,json,uuid,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse
import psycopg
ROOT=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1)for line in(ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line)
url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];projects=[];jti=None
def check(name,value):
 assert value,name
 checks.append(name)
def api(path,method='GET',body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 try:
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method),timeout=30)as response:return response.status,json.loads(response.read())['data']
 except urllib.error.HTTPError as error:return error.code,None
with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'])as db:
 try:
  status,login=api('/auth/login','POST',{'username':'admin','password':cfg['OOG_ADMIN_PASSWORD']});check('login',status==200);token=login['accessToken'];jti=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['jti']
  status,project=api('/projects','POST',{'name':'VERIFY-MULTIFR-'+uuid.uuid4().hex,'customer':'verification'},token);check('project',status==200);pid=project['id'];projects.append(pid)
  status,cargo=api('/projects/'+pid+'/cargos','POST',{'projectId':pid,'itemNo':'MULTI','length':25000,'width':5000,'height':3000,'grossWeight':100000,'quantity':2},token);check('cargo',status==200)
  status,other=api('/projects','POST',{'name':'VERIFY-MULTIFR-OTHER-'+uuid.uuid4().hex,'customer':'verification'},token);check('other project',status==200);projects.append(other['id'])
  check('foreign project cargo rejected',api('/projects/'+other['id']+'/multifr/preview','POST',{'cargoId':cargo['id']},token)[0]==404)
  check('foreign cargo cannot save review',api('/projects/'+other['id']+'/multifr/reviews','POST',{'cargoId':cargo['id'],'reason':'verification'},token)[0]==404)
  path='/projects/'+pid+'/multifr';body={'cargoId':cargo['id']}
  check('anonymous denied',api(path+'/preview','POST',body)[0]==401)
  status,result=api(path+'/preview','POST',body,token);check('automatic candidates',status==200 and len(result['automaticCandidates'])>=1)
  check('engineering required',result['status']=='PRE_PLAN' and result['engineeringRequired'] and result['supportReaction']=='NOT_CALCULABLE')
  check('gap not confirmed',not result['gapConfirmed']);check('per piece scope',result['scope']=='PER_PIECE_PRELIMINARY_ARRAY_SCREEN')
  status,result=api(path+'/preview','POST',{**body,'manual':{'equipmentCode':'40FR','rows':2,'columns':1}},token);check('insufficient manual',status==200 and result['manualSelection']['status']=='SCREEN_INSUFFICIENT')
  check('excessive count rejected',api(path+'/preview','POST',{**body,'manual':{'equipmentCode':'40FR','rows':32,'columns':32}},token)[0]==400)
  check('gap range rejected',api(path+'/preview','POST',{**body,'gapMm':-1},token)[0]==400)
  check('unknown cargo404',api(path+'/preview','POST',{'cargoId':str(uuid.uuid4())},token)[0]==404)
  status,saved=api(path+'/reviews','POST',{**body,'reason':'verification review'},token);check('review saved',status==200)
  status,history=api(path+'/reviews',token=token);check('review history structured',status==200 and history[0]['id']==saved['id'] and history[0]['result']['engineeringRequired'])
  check('audit saved',db.execute("select count(*) from core_audit_history where project_id=%s and action='MULTIFR_REVIEW_SAVED'",(pid,)).fetchone()[0]==1)
 finally:
  for pid in projects:
   for table in ['oog_multi_fr_review','core_audit_history','oog_cargo']:db.execute(f'delete from {table} where project_id=%s',(pid,))
   db.execute('delete from oog_project where id=%s',(pid,))
  if jti:db.execute('update core_session set revoked_at=greatest(now(),created_at) where access_jti=%s',(jti,))
  db.commit()
report={'apiChecks':len(checks),'checks':checks,'database':'oog','fixturesRemoved':True,'uiWorkflow':'not tested'}
(ROOT/'docs/verification-multifr.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'apiChecks':len(checks),'fixturesRemoved':True}))
