"""Real oog API: expanded mechanics, immutable evidence, authorization and independent review."""
import base64,copy,json,math,secrets,uuid,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse
import psycopg
ROOT=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line)
dburl=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert dburl.path=='/oog'
checks=[];tenants=[];jtis=[]
def check(name,okay):
 assert okay,name
 checks.append(name)
def api(path,method='GET',body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 try:
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method),timeout=45) as r:return r.status,json.loads(r.read())['data']
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
def login(code,user,password):
 status,value=api('/auth/login','POST',{'tenantCode':code,'username':user,'password':password});check('login '+user,status==200);jtis.append(json.loads(base64.urlsafe_b64decode(value['accessToken'].split('.')[1]+'=='))['jti']);return value['accessToken']
def fixture(cargo):
 pads=[{'id':id,'xMm':x,'yMm':y,'stiffnessKnPerMm':10000,'areaMm2':100000,'allowablePressureMpa':10,'capacityKn':1000} for id,x,y in [('A',0,0),('B',10000,0),('C',0,4000),('D',10000,4000)]]
 beams=[{'id':id,'padIds':ids,'axis':'X','startMm':-1000,'endMm':11000,'elasticModulusMpa':200000,'inertiaMm4':1e10,'sectionModulusMm3':1e8,'shearAreaMm2':1e6,'allowableBendingMpa':100,'allowableShearMpa':100,'allowableDeflectionMm':10,'endReactionCapacityKn':1000,'theoryApplicable':True,'evidence':'Fixture section/test evidence; not operational'} for id,ids in [('B1',['A','B']),('B2',['C','D'])]]
 return {'cargoId':cargo,'sourceMode':'CONFIRMED','inputEvidence':'Fixture measured mass/CoG and stiffness','reason':'Independent mechanics API fixture','weightKg':1000,'cogXmm':5000,'cogYmm':2000,'cogZmm':1000,'frictionCoefficient':1,'routeCompleteConfirmed':True,'externalLoadsReviewed':True,'externalLoadsEvidence':'Fixture separate review of wind/sea/structural modes, no transport approval','footprint':{'minXmm':0,'maxXmm':10000,'minYmm':0,'maxYmm':4000,'planeZmm':0,'evidence':'Fixture actual support boundary'},'pads':pads,'legs':[{'id':'ROAD1','profile':'ROAD','evidence':'Fixture route conditions','conditionsConfirmed':True,'supportVerticalCoefficient':1,'supportEvidence':'Fixture declared compression envelope'}],'lashings':[],'beams':beams}
try:
 platform=login('OOG','admin',cfg['OOG_ADMIN_PASSWORD']);password=secrets.token_urlsafe(24);tokens=[]
 for suffix in ['A','B']:
  code='EXP_'+uuid.uuid4().hex[:12].upper();status,value=api('/core/tenants','POST',{'tenantCode':code,'tenantName':'VERIFY-EXPANDED-'+suffix,'adminUsername':'author','adminPassword':password},platform);check('fixture company '+suffix,status==200);tenants.append((value['tenantId'],code));tokens.append(login(code,'author',password))
 author,foreign=tokens;roles=api('/core/roles',token=author)[1];engineer=next(r['role_id'] for r in roles if r['role_code']=='ENGINEER');planner=next(r['role_id'] for r in roles if r['role_code']=='PLANNER')
 for name,role in [('reviewer',engineer),('planner',planner)]:check('fixture '+name,api('/core/users','POST',{'username':name,'password':password,'roleId':role},author)[0]==200)
 reviewer=login(tenants[0][1],'reviewer',password);plannerToken=login(tenants[0][1],'planner',password)
 status,p=api('/projects','POST',{'name':'VERIFY-EXPANDED-MECHANICS','customer':'fixture'},author);check('project created',status==200);pid=p['id']
 status,c=api('/projects/'+pid+'/cargos','POST',{'projectId':pid,'itemNo':'EXP-1','quantity':1,'length':10000,'width':4000,'height':3000,'grossWeight':1000,'netWeight':900},author);check('saved cargo',status==200)
 status,plan=api('/projects/'+pid+'/plans','POST',{},author);check('stored preplan',status==200);planid=plan['id'];path='/projects/'+pid+'/plans/'+planid+'/engineering/calculations';request=fixture(c['id'])
 check('anonymous expanded denied',api(path+'/expanded','POST',request)[0]==401);check('planner engineering operation denied',api(path+'/expanded','POST',request,plannerToken)[0]==403);check('foreign plan profiles hidden',api(path+'/expanded/profiles',token=foreign)[0]==404)
 status,profiles=api(path+'/expanded/profiles',token=author);check('five explicit official profiles',status==200 and len(profiles)==5 and all(v['requiresConfirmation'] for v in profiles));sea=next(p for p in profiles if p['profile']=='SEA_C')['coefficients'];check('direction-specific sea coefficients',sea['verticalLongitudinal']==.2 and sea['verticalTransverse']==1)
 status,catalog=api(path+'/expanded/references',token=author);check('official source catalog available',status==200 and len(catalog['charts'])==8 and len(catalog['sources'])==3 and not catalog['autoApply'])
 check('foreign published reference plan hidden',api(path+'/expanded/references',token=foreign)[0]==404)
 load={'chartId':'HL40_54200','cargoWeightKg':36000,'restingLengthMm':6000,'actualPlatePayloadKg':54200,'mainBeamLoadPathConfirmed':True,'chartApplicabilityConfirmed':True,'evidence':'Verified test fixture geometry only'}
 status,screen=api(path+'/expanded/load-distribution','POST',load,author);check('official resting length limit used',status==200 and screen['screeningLimitKg']==36100 and not screen['carrierApproved'] and not screen['eligibleForInternalApproval'])
 check('source conflict blocked',api(path+'/expanded/load-distribution','POST',{**load,'chartId':'HL40_49000'},author)[1]['status']=='SOURCE_CONFLICT_REQUIRES_CARRIER_CONFIRMATION')
 check('no invented support length',api(path+'/expanded/load-distribution','POST',{**load,'restingLengthMm':None},author)[1]['status']=='NEEDS_INFORMATION')
 check('interpolation not invented',api(path+'/expanded/load-distribution','POST',{**load,'restingLengthMm':7000,'cargoWeightKg':37000},author)[1]['status']=='EXCEEDS_PUBLISHED_GUIDANCE')
 check('plate remains binding',api(path+'/expanded/load-distribution','POST',{**load,'actualPlatePayloadKg':35000},author)[1]['screeningLimitKg']==35000)
 check('foreign published check denied',api(path+'/expanded/load-distribution','POST',load,foreign)[0]==404)
 status,value=api(path+'/expanded','POST',request,author);check('expanded mechanics calculated',status==200 and value['result']['eligibleForInternalApproval']);record=value['id'];result=value['result'];check('all route directions evaluated',len(result['loadCases'])==4 and {c['direction'] for c in result['loadCases']}=={'FORWARD','BACKWARD','LEFT','RIGHT'})
 forward=result['loadCases'][0];check('known inertial force',math.isclose(forward['externalForceKn'],7.848,abs_tol=1e-10));check('known gravity and overturn moments',math.isclose(forward['gravityRestoringMomentKnM'],49.05,abs_tol=1e-10) and math.isclose(forward['overturningMomentKnM'],7.848,abs_tol=1e-10))
 for case in result['loadCases']:
  for support in case['supportCases']:
   contact=support['pads'];check('contact equilibrium '+case['direction'],contact['equilibriumFound'] and abs(contact['forceResidualKn'])<1e-8 and abs(contact['momentXResidualKnMm'])<1e-5 and abs(contact['momentYResidualKnMm'])<1e-5)
   friction=support['frictionAllocation'];check('per-pad friction and yaw witness '+case['direction'],friction['feasible'] and abs(friction['forceXResidualKn'])<=friction['forceToleranceKn'] and abs(friction['yawResidualKnM'])<=friction['yawToleranceKnM'] and all(r['magnitudeKn']<=r['capacityKn']+1e-8 for r in friction['pads']))
   check('beam load path '+case['direction'],len(support['beams'])==2 and all(b['withinDeclaredLimits'] for b in support['beams']))
 decision={'decision':'APPROVED_INTERNAL','expectedVersion':0,'reason':'Independent declared model review fixture','evidence':'Independent arithmetic/route/input evidence fixture'}
 check('self approval denied',api(path+'/'+record+'/decisions','POST',decision,author)[0]==403);status,d=api(path+'/'+record+'/decisions','POST',decision,reviewer);check('independent model-only review preserves preplan',status==200 and d['version']==1 and d['planStatus']=='PRE_PLAN' and not d['carrierApproved']);check('stale review version denied',api(path+'/'+record+'/decisions','POST',decision,reviewer)[0]==409)
 variants=[('estimated',{'sourceMode':'ESTIMATED'},'ESTIMATED_REQUIRES_CONFIRMATION'),('unknown stiffness',{'pads':[{**p,'stiffnessKnPerMm':None} for p in request['pads']]},'INCOMPLETE'),('route not confirmed',{'routeCompleteConfirmed':False},'INCOMPLETE'),('external review absent',{'externalLoadsReviewed':False},'INCOMPLETE'),('mass mismatch',{'weightKg':900},'MASS_MISMATCH_REQUIRES_NEW_PLAN'),('beam failure',{'beams':[{**b,'allowableBendingMpa':.000001} for b in request['beams']]},'FAILED_DECLARED_LIMITS'),('low friction',{'frictionCoefficient':0},'FAILED_DECLARED_LIMITS')]
 for name,change,expected in variants:
  status,v=api(path+'/expanded','POST',{**request,**change},author);check(name+' status',status==200 and v['result']['status']==expected and not v['result']['eligibleForInternalApproval']);check(name+' internal approval blocked',api(path+'/'+v['id']+'/decisions','POST',decision,reviewer)[0]==409)
 bad=copy.deepcopy(request);bad['beams'][1]['padIds']=['A','C','D'];check('duplicate structural load path rejected',api(path+'/expanded','POST',bad,author)[0]==400)
 bad=copy.deepcopy(request);bad['legs'][0]['supportVerticalCoefficient']=None;status,v=api(path+'/expanded','POST',bad,author);check('no guessed compression coefficient',status==200 and v['result']['status']=='INCOMPLETE')
 bad=copy.deepcopy(request);bad['beams'][0]['padIds']=['A','D'];bad['beams'][1]['padIds']=['B','C'];check('off-axis single-beam projection rejected',api(path+'/expanded','POST',bad,author)[0]==400)
 multiple=copy.deepcopy(request);multiple['legs'].append({**request['legs'][0],'id':'SEA1','profile':'SEA_C','supportVerticalCoefficient':2});status,v=api(path+'/expanded','POST',multiple,author);check('each route leg evaluated independently',status==200 and len(v['result']['loadCases'])==8);sea=next(c for c in v['result']['loadCases'] if c['legId']=='SEA1' and c['direction']=='FORWARD');check('minimum normal and maximum compression remain separate',sea['minimumVerticalCoefficient']==.2 and [c['verticalCoefficient'] for c in sea['supportCases']]==[.2,2] and not v['result']['eligibleForInternalApproval'])
 saved=api(path,token=author)[1];row=next(r for r in saved if r['id']==record);check('expanded model immutable snapshot and reviewer history',row['input_snapshot']['request']['pads']==request['pads'] and row['decisionVersion']==1)
 check('foreign list hidden',api(path,token=foreign)[0]==404)
 report={'apiChecks':len(checks),'passed':True,'checks':checks,'modelVersion':result['modelVersion'],'database':'oog','fixturesRemoved':True,'externalCertificationClaimed':False};report['fixturesRemoved']=False
finally:
 with psycopg.connect(host=dburl.hostname,port=dburl.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD']) as db:
  ids=[t[0] for t in tenants]
  if ids:
   for table,trigger in [('oog_engineering_decision','oog_engineering_decision_immutable'),('oog_engineering_calculation','oog_engineering_calculation_immutable')]:
    db.execute('LOCK TABLE '+table+' IN ACCESS EXCLUSIVE MODE');db.execute('ALTER TABLE '+table+' DISABLE TRIGGER '+trigger);db.execute('DELETE FROM '+table+' WHERE tenant_id=ANY(%s)',(ids,));db.execute('ALTER TABLE '+table+' ENABLE TRIGGER '+trigger)
   db.execute('delete from core_audit_history where tenant_id=ANY(%s)',(ids,))
   for table in ['oog_clp_scenario','oog_cargo']:db.execute('delete from '+table+' where project_id in(select id from oog_project where tenant_id=ANY(%s))',(ids,))
   db.execute('delete from oog_project where tenant_id=ANY(%s)',(ids,))
   for table in ['core_session','core_login_history','core_role_menu','core_menu','core_user_account','core_role']:db.execute('delete from '+table+' where tenant_id=ANY(%s)',(ids,))
   db.execute('delete from core_tenant where tenant_id=ANY(%s)',(ids,))
  if jtis:db.execute('delete from core_session where access_jti=ANY(%s)',([uuid.UUID(j) for j in jtis],))

report['fixturesRemoved']=True
(ROOT/'docs/verification-expanded-engineering.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'apiChecks':len(checks),'passed':True,'fixturesRemoved':True}))
