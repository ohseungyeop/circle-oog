import base64,json,uuid,urllib.request,urllib.error,hashlib,io,zipfile,math
from datetime import date,timedelta
import pymupdf
from pathlib import Path
from urllib.parse import urlparse
import psycopg
root=Path(__file__).resolve().parents[1];cfg=dict(line.split('=',1)for line in(root/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line)
url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];projects=[];session=None;evidence_files=[]
storage=Path(cfg.get('OOG_STORAGE','../data'))
if not storage.is_absolute():storage=root/'backend'/storage
storage=storage.resolve()/'engineering-evidence';assert storage.is_relative_to(root)

def upload(path,metadata,content,filename,token):
 boundary='OOG'+uuid.uuid4().hex
 body=(f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n'+json.dumps(metadata)+f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+content+f'\r\n--{boundary}--\r\n'.encode()
 headers={'Content-Type':'multipart/form-data; boundary='+boundary,'Authorization':'Bearer '+token}
 try:
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=body,headers=headers,method='POST'),timeout=45)as r:return r.status,json.loads(r.read())['data']
 except urllib.error.HTTPError as e:return e.code,None

def original(path,token):
 try:
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,headers={'Authorization':'Bearer '+token}),timeout=45)as r:return r.status,r.read()
 except urllib.error.HTTPError as e:return e.code,None
def check(name,ok):
 assert ok,name
 checks.append(name)
def api(path,method='GET',body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 try:
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method),timeout=45)as r:return r.status,json.loads(r.read())['data']
 except urllib.error.HTTPError as e:return e.code,None
with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'])as db:
 try:
  status,login=api('/auth/login','POST',{'tenantCode':'OOG','username':'admin','password':cfg['OOG_ADMIN_PASSWORD']});check('login',status==200);token=login['accessToken'];session=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['jti']
  for suffix in ['MAIN','OTHER']:
   status,project=api('/projects','POST',{'name':'VERIFY-ENGINEERING-'+suffix+'-'+uuid.uuid4().hex,'customer':'Verification'},token);check('project '+suffix,status==200);projects.append(project['id'])
  pid=projects[0];status,_=api('/projects/'+pid+'/cargos','POST',{'projectId':pid,'itemNo':'PRE-PLAN','quantity':1,'length':1000,'width':1000,'height':1000,'grossWeight':100,'estimated':True},token);check('estimated cargo created',status==200)
  status,plan=api('/projects/'+pid+'/plans','POST',token=token);check('plan created',status==200);planid=plan['id'];path='/projects/'+pid+'/plans/'+planid+'/engineering'
  before=db.execute('select input_snapshot,result from oog_clp_scenario where id=%s',(planid,)).fetchone()
  check('anonymous review denied',api(path)[0]==401)
  status,review=api(path,token=token);auto=review['automatic'];check('automatic screen retains preplan',status==200 and not auto['approved'] and auto['engineeringRequired'] and auto['status']=='PRE_PLAN')
  check('numerical calculations use separate workflow',auto['physicalCalculation']=='SEPARATE_CALCULATION_WORKFLOW' and len(auto['requiredChecks'])==8)
  check('estimated dimensions flagged',bool(auto['warnings']))
  check('plan under wrong project rejected',api('/projects/'+projects[1]+'/plans/'+planid+'/engineering',token=token)[0]==404)
  check('unknown check rejected',api(path,'POST',{'observations':{'APPROVED':'yes'},'reason':'test'},token)[0]==400)
  check('blank evidence rejected',api(path,'POST',{'observations':{'COG_MEASURED':' '},'reason':'test'},token)[0]==400)
  status,note=api(path,'POST',{'observations':{'PACKED_DIMENSIONS':'Verification packing record'},'reason':'Partial review'},token);check('partial review remains needs review',status==200 and note['status']=='NEEDS_REVIEW' and not note['approved'])
  status,note=api(path,'POST',{'observations':{key:'Verification fixture - not physical certification'for key in auto['requiredChecks']},'reason':'Complete notes fixture'},token);check('all notes do not grant approval',status==200 and note['status']=='REVIEW_RECORDED_NOT_APPROVED' and not note['approved'])
  status,history=api(path,token=token);check('review history structured and append only',status==200 and len(history['history'])==2 and history['history'][0]['detail']['approved']==False)
  check('engineering records preserve saved CLP',db.execute('select input_snapshot,result from oog_clp_scenario where id=%s',(planid,)).fetchone()==before)
  check('review audit records saved',db.execute("select count(*) from core_audit_history where project_id=%s and action='ENGINEERING_REVIEW_RECORDED'",(pid,)).fetchone()[0]==2)
  counts=db.execute("select count(*) filter(where tablename like 'core_%%'),count(*) filter(where tablename like 'oog_%%'),count(*) from pg_tables where schemaname='public'").fetchone();check('core8 business16 total25 tables',counts==(8,16,25))
  check('Flyway V10',db.execute('select version from flyway_schema_history where success order by installed_rank desc limit 1').fetchone()[0]=='10')
  ep=path+'/evidence';metadata={'category':'CARRIER_APPROVAL','subject':'VERIFY UNIT ONLY','issuer':'Fixture issuer','reference':'VERIFY-NOT-REAL-APPROVAL','decision':'ACCEPTED','issuedOn':str(date.today()-timedelta(days=1)),'validUntil':None,'reason':'API fixture, not physical certification'}
  with pymupdf.open()as document:
   document.new_page().insert_text((50,50),'Verification fixture only');content=document.tobytes()
  check('evidence list requires authentication',api(ep)[0]==401)
  check('blank document issuer rejected',upload(ep,{**metadata,'issuer':''},content,'evidence.pdf',token)[0]==400)
  check('evidence file signature checked',upload(ep,metadata,b'fake','evidence.pdf',token)[0]==400)
  check('non-carrier acceptance rejected',upload(ep,{**metadata,'category':'COG_MEASURED'},content,'evidence.pdf',token)[0]==400)
  check('wrong-plan evidence upload rejected',upload('/projects/'+projects[1]+'/plans/'+planid+'/engineering/evidence',metadata,content,'evidence.pdf',token)[0]==404)
  status,saved=upload(ep,metadata,content,'evidence.pdf',token);check('evidence stored with actual SHA256',status==200 and saved['sha256']==hashlib.sha256(content).hexdigest() and not saved['carrierApproved']);eid=saved['id'];evidence_files.append(storage/eid)
  status,downloaded=original(ep+'/'+eid+'/file',token);check('original evidence bytes preserved',status==200 and downloaded==content)
  check('wrong project cannot download evidence',original('/projects/'+projects[1]+'/plans/'+planid+'/engineering/evidence/'+eid+'/file',token)[0]==404)
  (storage/eid).write_bytes(content+b'tampered')
  check('tampered evidence download blocked',original(ep+'/'+eid+'/file',token)[0]==409)
  check('tampered original also blocks review package',original(ep+'/package',token)[0]==409)
  (storage/eid).write_bytes(content)
  status,listing=api(ep,token=token);check('recorded acceptance never grants carrier approval',status==200 and not listing['carrierApproved'] and listing['items'][0]['recordedDecision']=='ACCEPTED' and 'CARRIER_APPROVAL'not in listing['missingCategories'])
  status,rejected=upload(ep,{**metadata,'decision':'REJECTED'},content,'reject.pdf',token);check('append external rejection',status==200);evidence_files.append(storage/rejected['id'])
  listing=api(ep,token=token)[1];check('new rejection supersedes old acceptance for same subject','CARRIER_APPROVAL'in listing['missingCategories'] and len(listing['items'])==2)
  expired={**metadata,'subject':'EXPIRED UNIT','issuedOn':'2020-01-01','validUntil':'2020-12-31'}
  status,saved=upload(ep,expired,content,'expired.pdf',token);check('expired evidence remains historical',status==200);evidence_files.append(storage/saved['id'])
  listing=api(ep,token=token)[1];check('expired document does not satisfy current category',any(i['expired']for i in listing['items']) and 'CARRIER_APPROVAL'in listing['missingCategories'])
  check('evidence preserves saved plan',db.execute('select input_snapshot,result from oog_clp_scenario where id=%s',(planid,)).fetchone()==before)
  check('evidence audit references hash and plan',db.execute("select count(*) from core_audit_history where project_id=%s and action='ENGINEERING_EVIDENCE_ADDED' and detail->>'sha256'=%s",(pid,hashlib.sha256(content).hexdigest())).fetchone()[0]==3)
  cp=path+'/checks'
  def calculate(kind,input):return api(cp+'/'+kind,'POST',{'input':input,'reason':'Verification only - declared model case'},token)
  check('special checks need authentication',api(cp)[0]==401)
  check('unknown special model rejected',calculate('UNKNOWN',{})[0]==400)
  check('refrigerated operation excluded from OOG core',calculate('REEFER',{})[0]==400)
  check('tank operation excluded from OOG core',calculate('TANK',{})[0]==400)
  beam={'lengthMm':1000,'elasticModulusMpa':200000,'inertiaMm4':1e8,'sectionModulusMm3':1e6,'shearAreaMm2':1000,'allowableBendingMpa':200,'allowableShearMpa':100,'allowableDeflectionMm':1,'theoryApplicable':True,'evidence':'known closed form','supports':[{'id':name,'xMm':x,'stiffnessKnPerMm':100,'capacityKn':100,'areaMm2':1000,'allowablePressureMpa':100}for name,x in [('A',0),('B',1000)]],'loads':[{'id':'P','xMm':500,'forceKn':10}]}
  status,r=calculate('COUPLED_BEAM',beam);br=r['result'];check('coupled beam matches closed form',status==200 and br['status']=='DECLARED_MODEL_LIMITS_PASSED' and math.isclose(br['maximumDeflectionMm'],.05+10000*1000**3/(48*200000*1e8),abs_tol=1e-8) and math.isclose(br['maximumMomentKnMm'],2500,abs_tol=1e-6))
  check('beam equilibrium and reactions independently verified',math.isclose(sum(s['reactionKn']for s in br['supports']),10,abs_tol=1e-7) and abs(br['momentResidualKnMm'])<1e-5 and not br['eligibleForTransportApproval'])
  status,r=calculate('COUPLED_BEAM',{**beam,'supports':[{**s,'xMm':200 if s['id']=='A'else 1000}for s in beam['supports']],'loads':[{'id':'P','xMm':0,'forceKn':10}]});check('unproven contact equilibrium not false pass',status==200 and r['result']['status']=='CONTACT_EQUILIBRIUM_NOT_PROVEN')
  check('invalid beam geometry rejected',calculate('COUPLED_BEAM',{**beam,'lengthMm':0})[0]==400)
  check('wrong project model check denied',api('/projects/'+projects[1]+'/plans/'+planid+'/engineering/checks/COUPLED_BEAM','POST',{'input':beam,'reason':'fixture'},token)[0]==404)
  status,models=api(cp,token=token);check('model records append inputs with saved plan',status==200 and len(models)==2 and all(m['detail']['savedPlanInput']['cargos'][0]['estimated']for m in models) and any(m['detail']['input'].get('lengthMm')==1000 for m in models))
  check('calculation audit count',db.execute("select count(*) from core_audit_history where project_id=%s and action='ENGINEERING_MODEL_CHECK'",(pid,)).fetchone()[0]==2)
  cid=before[0]['cargos'][0]['id'];mp=path+'/reconciliations';packed={**metadata,'category':'PACKED_DIMENSIONS','decision':'SUBMITTED','subject':cid,'reference':'PACKED-FIXTURE'}
  status,doc=upload(ep,packed,content,'packed.pdf',token);check('packed measurement source uploaded',status==200);packed_id=doc['id'];evidence_files.append(storage/packed_id)
  measured={'length':1000,'width':1000,'height':1000,'grossWeight':100};measurement={'targetType':'CARGO','targetId':cid,'evidenceId':packed_id,'measured':measured,'subjectConfirmed':True,'reason':'Fixture measured source page 1'}
  check('measurement anonymous denied',api(mp,'POST',measurement)[0]==401)
  status,reconciled=api(mp,'POST',measurement,token);check('estimated saved plan never becomes verified by numeric equality',status==200 and reconciled['result']['status']=='ESTIMATED_SOURCE_REQUIRES_NEW_RECORD' and not reconciled['result']['documentAuthenticityVerified'])
  check('independent subject declaration required',api(mp,'POST',{**measurement,'subjectConfirmed':False},token)[1]['result']['status']=='DOCUMENT_SUBJECT_REVIEW_REQUIRED')
  check('wrong evidence category rejected',api(mp,'POST',{**measurement,'evidenceId':eid},token)[0]==400)
  check('wrong saved cargo rejected',api(mp,'POST',{**measurement,'targetId':str(uuid.uuid4())},token)[0]==404)
  check('wrong plan evidence rejected',api('/projects/'+projects[1]+'/plans/'+planid+'/engineering/reconciliations','POST',measurement,token)[0]==404)
  (storage/packed_id).write_bytes(content+b'tampered');check('measurement source tampering blocked',api(mp,'POST',measurement,token)[0]==409);(storage/packed_id).write_bytes(content)
  status,latest=upload(ep,packed,content,'packed-v2.pdf',token);check('measurement source revision recorded',status==200);evidence_files.append(storage/latest['id'])
  check('superseded measurement source rejected',api(mp,'POST',measurement,token)[0]==409)
  other=projects[1];status,cargo=api('/projects/'+other+'/cargos','POST',{'projectId':other,'itemNo':'MEASURED','quantity':1,**measured,'estimated':False},token);check('confirmed fixture cargo created',status==200)
  status,p2=api('/projects/'+other+'/plans','POST',token=token);check('confirmed measurement plan created',status==200);p2id=p2['id'];c2=db.execute('select input_snapshot from oog_clp_scenario where id=%s',(p2id,)).fetchone()[0]['cargos'][0]['id'];base2='/projects/'+other+'/plans/'+p2id+'/engineering'
  status,d2=upload(base2+'/evidence',{**packed,'subject':c2},content,'confirmed-packed.pdf',token);check('confirmed fixture source uploaded',status==200);evidence_files.append(storage/d2['id']);m2={**measurement,'targetId':c2,'evidenceId':d2['id']}
  status,r2=api(base2+'/reconciliations','POST',m2,token);check('confirmed saved numeric values reconcile without approval',status==200 and r2['result']['status']=='MATCHES_DECLARED_MEASUREMENTS' and not r2['result']['carrierApproved'])
  status,r2=api(base2+'/reconciliations','POST',{**m2,'measured':{**measured,'length':1001}},token);check('one mm discrepancy requires new immutable record',status==200 and r2['result']['status']=='MISMATCH_REQUIRES_NEW_RECORD')
  check('measurement history keeps source and actual file hash',len(api(mp,token=token)[1])==2 and all(row['detail']['evidenceSha256']==hashlib.sha256(content).hexdigest()for row in api(mp,token=token)[1]))
  status,package=original(ep+'/package',token);check('review package download',status==200)
  with zipfile.ZipFile(io.BytesIO(package))as archive:
   manifest=json.loads(archive.read('manifest.json'));files=[name for name in archive.namelist()if name.startswith('evidence/')]
   check('package scope and approval boundary',manifest['planId']==planid and not manifest['carrierApproved'] and manifest['planStatus']=='PRE_PLAN')
   check('package includes model snapshots and actual originals',len(files)==5 and sum(v['detail'].get('kind')=='MODEL_CHECK'for v in manifest['reviews'])==2 and all(archive.read(name)==content for name in files))
   check('review package includes measurement source bindings',sum(v['detail'].get('kind')=='MEASUREMENT_CHECK'for v in manifest['reviews'])==2)
   check('package excludes private storage paths','storageKey'not in json.dumps(manifest))
  check('wrong project cannot export package',original('/projects/'+projects[1]+'/plans/'+planid+'/engineering/evidence/package',token)[0]==404)
  check('special checks preserve original CLP',db.execute('select input_snapshot,result from oog_clp_scenario where id=%s',(planid,)).fetchone()==before)
 finally:
  for pid in projects:
   for table in ['oog_engineering_review','core_audit_history','oog_clp_scenario','oog_cargo']:db.execute(f'delete from {table} where project_id=%s',(pid,))
   db.execute('delete from oog_project where id=%s',(pid,))
  if session:db.execute('update core_session set revoked_at=greatest(now(),created_at) where access_jti=%s',(session,))
  db.commit()
  for file in evidence_files:
   assert file.parent==storage and file.name.count('-')==4
   file.unlink(missing_ok=True)
report={'date':'2026-10-14','database':'oog','migration':'V10','apiChecks':len(checks),'checks':checks,'fixturesRemoved':True,'uiWorkflow':'code tests separate','scope':'Review notes plus scoped evidence originals, SHA integrity, expiry and latest external-document decisions; no actual carrier approval'}
(root/'docs/verification-engineering.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'apiChecks':len(checks),'fixturesRemoved':True}))
