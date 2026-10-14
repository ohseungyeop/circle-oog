"""Live CP-SAT optimizer and tenant-scoped stored plan verification, no optimizer DB access."""
import json,uuid,base64,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse
import psycopg
ROOT=Path(__file__).resolve().parents[1];cfg=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line);dburl=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert dburl.path=='/oog'
checks=[];projects=[];session=None
def check(name,ok):
 assert ok,name
 checks.append(name)
def call(path,method='GET',body=None,token=None,optimizer=False):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 url=('http://127.0.0.1:8003' if optimizer else 'http://127.0.0.1:8083/api')+path
 try:
  with urllib.request.urlopen(urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),method=method,headers=headers),timeout=40) as r:
   value=json.loads(r.read());return r.status,value if optimizer else value['data']
 except urllib.error.HTTPError as e:return e.code,e.read()
def fixture(quantity=1):return {'cargos':[{'id':str(i),'itemNo':str(i),'quantity':quantity,'length':length,'width':1,'height':1,'grossWeight':1} for i,length in enumerate([6,5,3,2,2,2])],'equipment':[{'code':'40HC','length':10,'width':2,'height':2,'payload':100,'openWidth':False,'openHeight':False}],'rules':[{'equipmentCode':'40HC','usableLengthRatio':1,'planningWeightRatio':1,'maxOverWidth':0,'maxOverHeight':0}]}
def valid(s,expected):
 assigned=[]
 for box in s['containers']:
  check('payload bounds '+str(box['number']),box['weight']<=box['payloadLimit']);check('length bounds '+str(box['number']),box['usedLength']<=box['usableLength'])
  for a,b in zip(box['assignments'],box['assignments'][1:]):check('no overlap '+a['cargoId']+' '+b['cargoId'],a['x']+a['length']<=b['x'])
  assigned.extend((a['cargoId'],a['piece']) for a in box['assignments'])
 assigned.extend((a['cargoId'],a['piece']) for a in s['unassigned']);check('piece conservation',len(assigned)==expected and len(set(assigned))==expected)
try:
 check('CP-SAT engine available',call('/health',optimizer=True)[1]['ortoolsAvailable'])
 data=fixture();status,value=call('/optimize','POST',data,optimizer=True);check('optimizer succeeds',status==200);minimum=value['scenarios'][0];check('known optimum 2',minimum['equipmentCount']==2 and minimum['optimization']['optimal'] and minimum['optimization']['bestBound']==2);valid(minimum,6)
 heuristic=call('/optimize','POST',{**data,'planningMode':'HEURISTIC'},optimizer=True)[1]['scenarios'][0];check('manual heuristic 3',heuristic['equipmentCount']==3 and heuristic['optimization']['fallbackReason']=='USER_SELECTED_HEURISTIC')
 check('large instance fallback explicit',call('/optimize','POST',fixture(22),optimizer=True)[1]['scenarios'][0]['optimization']['fallbackReason']=='PIECE_LIMIT_128')
 check('excessive timeout rejected',call('/optimize','POST',{**data,'timeLimitSeconds':11},optimizer=True)[0]==422)
 status,login=call('/auth/login','POST',{'tenantCode':'OOG','username':'admin','password':cfg['OOG_ADMIN_PASSWORD']});check('login',status==200);token=login['accessToken'];session=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['jti']
 status,p=call('/projects','POST',{'name':'VERIFY-CP-'+uuid.uuid4().hex,'customer':'Verification'},token);check('project created',status==200);pid=p['id'];projects.append(pid)
 for i,length in enumerate([6768,5640,3384,2256,2256,2256]):check('cargo '+str(i),call('/projects/'+pid+'/cargos','POST',{'projectId':pid,'itemNo':'CP'+str(i),'quantity':1,'length':length,'width':1000,'height':1000,'grossWeight':1000},token)[0]==200)
 status,plan=call('/projects/'+pid+'/plans?planningMode=AUTO&timeLimitSeconds=3','POST',{},token);check('stored AUTO plan',status==200 and plan['result']['scenarios'][0]['optimization']['method']=='CP_SAT');valid(plan['result']['scenarios'][0],6);check('stored alternatives',len(plan['result']['scenarios'])==2)
 with psycopg.connect(host=dburl.hostname,port=dburl.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD']) as db:
  row=db.execute('select input_snapshot,result from oog_clp_scenario where id=%s and project_id=%s',(plan['id'],pid)).fetchone();check('input mode and solver metadata preserved',row[0]['planningMode']=='AUTO' and row[1]['scenarios'][0]['optimization']['status'] in ['OPTIMAL','FEASIBLE'])
 report={'apiChecks':len(checks),'checks':checks,'passed':True,'knownExample':{'heuristicEquipment':3,'optimalEquipment':2},'uiWorkflow':'not performed','optimizerDatabaseAccess':False};(ROOT/'docs/verification-optimization.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'apiChecks':len(checks),'passed':True}))
finally:
 with psycopg.connect(host=dburl.hostname,port=dburl.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD']) as db:
  for pid in projects:
   for table in ['core_audit_history','oog_clp_scenario','oog_cargo']:db.execute(f'delete from {table} where project_id=%s',(pid,))
   db.execute('delete from oog_project where id=%s',(pid,))
  if session:db.execute('update core_session set revoked_at=now() where access_jti=%s',(session,))
