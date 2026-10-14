"""OOG-only numerical/workflow tests; unique fixture companies, no actual approval claims."""
import base64,json,secrets,uuid,urllib.request,urllib.error,math
from pathlib import Path
from urllib.parse import urlparse
import psycopg
import pymupdf
ROOT=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line)
url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];tenants=[];jtis=[];evidence_files=[]
storage=Path(cfg.get('OOG_STORAGE','../data'))
if not storage.is_absolute():storage=ROOT/'backend'/storage
storage=storage.resolve()/'engineering-evidence';assert storage.is_relative_to(ROOT)
def upload_cog(path,token):
    with pymupdf.open()as document:
        document.new_page().insert_text((40,40),'CoG fixture - not a real survey');content=document.tobytes()
    metadata={'category':'COG_MEASURED','subject':'CALC-1','issuer':'Fixture survey','reference':'COG-FIXTURE','decision':'SUBMITTED','issuedOn':'2026-10-14','validUntil':None,'reason':'Code verification fixture only'}
    boundary='OOG'+uuid.uuid4().hex
    body=(f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n'+json.dumps(metadata)+f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="cog.pdf"\r\nContent-Type: application/pdf\r\n\r\n').encode()+content+f'\r\n--{boundary}--\r\n'.encode()
    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'multipart/form-data; boundary='+boundary},method='POST'),timeout=45)as response:return json.loads(response.read())['data']
def check(name,ok):
    assert ok,name
    checks.append(name)
def req(path,method='GET',body=None,token=None):
    headers={'Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    try:
        with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method),timeout=45) as r:return r.status,json.loads(r.read())['data']
    except urllib.error.HTTPError as e:return e.code,e.read()
def login(code,user,password):
    s,v=req('/auth/login','POST',{'tenantCode':code,'username':user,'password':password});check('login '+code+' '+user,s==200);jtis.append(json.loads(base64.urlsafe_b64decode(v['accessToken'].split('.')[1]+'=='))['jti']);return v['accessToken']
with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'],connect_timeout=10) as db:
    try:
        platform=login('OOG','admin',cfg['OOG_ADMIN_PASSWORD']);password=secrets.token_urlsafe(24);tokens=[]
        for suffix in ['A','B']:
            code='EC_'+uuid.uuid4().hex[:12].upper();s,v=req('/core/tenants','POST',{'tenantCode':code,'tenantName':'VERIFY-CALCULATION-'+suffix,'adminUsername':'author','adminPassword':password},platform);check('fixture tenant '+suffix,s==200);tenants.append((v['tenantId'],code));tokens.append(login(code,'author',password))
        author,foreign=tokens;roles=req('/core/roles',token=author)[1];engineer=next(r['role_id'] for r in roles if r['role_code']=='ENGINEER');planner=next(r['role_id'] for r in roles if r['role_code']=='PLANNER')
        s,_=req('/core/users','POST',{'username':'reviewer','password':password,'roleId':engineer},author);check('independent reviewer created',s==200);reviewer=login(tenants[0][1],'reviewer',password)
        s,_=req('/core/users','POST',{'username':'planner','password':password,'roleId':planner},author);check('planner fixture created',s==200);plannerToken=login(tenants[0][1],'planner',password)
        s,p=req('/projects','POST',{'name':'VERIFY-ENGINEERING-CALC','customer':'fixture'},author);check('project',s==200);pid=p['id']
        s,c=req('/projects/'+pid+'/cargos','POST',{'projectId':pid,'itemNo':'CALC-1','quantity':1,'length':10000,'width':2000,'height':3000,'grossWeight':5000,'netWeight':4500},author);check('cargo fixture',s==200);cid=c['id']
        s,plan=req('/projects/'+pid+'/plans','POST',{},author);check('plan fixture',s==200);planid=plan['id'];path='/projects/'+pid+'/plans/'+planid+'/engineering/calculations'
        request={'cargoId':cid,'sourceMode':'CONFIRMED','inputEvidence':'Fixture weighing and CoG survey; declared pad/limits','weightKg':5000,'cogXmm':2000,'cogYmm':1000,'cogZmm':1000,'supportA':{'xMm':0,'areaMm2':100000,'allowablePressureMpa':1,'capacityKn':100},'supportB':{'xMm':10000,'areaMm2':100000,'allowablePressureMpa':1,'capacityKn':100},'lashing':{'axis':'LONGITUDINAL','horizontalAccelerationCoefficient':.8,'normalForceCoefficient':1,'frictionCoefficient':.3,'effectiveCapacityKnPerLashing':10,'verticalAngleDeg':30,'planAngleDeg':0,'count':4,'evidence':'Fixture declared weakest-point derated capacity, route coefficients and geometry'},'reason':'Verify constrained numerical model only'}
        check('anonymous calculation denied',req(path,'POST',request)[0]==401);check('planner cannot perform engineering role operation',req(path,'POST',request,plannerToken)[0]==403)
        check('foreign calculation context not disclosed',req(path+'/context',token=foreign)[0]==404);context=req(path+'/context',token=author)[1];check('context is saved plan cargo',context['cargos'][0]['id']==cid)
        check('CoG outside saved cargo rejected',req(path,'POST',{**request,'cogXmm':11000},author)[0]==400)
        check('support B must be after A',req(path,'POST',{**request,'supportB':{**request['supportB'],'xMm':0}},author)[0]==400)
        s,v=req(path,'POST',request,author);check('confirmed model calculated',s==200 and v['result']['status']=='CALCULATED_REQUIRES_REVIEW');calc=v['id'];r=v['result'];supports=r['supports'];lash=r['lashing']
        doc=upload_cog(path.removesuffix('/calculations')+'/evidence',author);evidence_files.append(storage/doc['id']);measurement={'targetType':'CALCULATION','targetId':calc,'evidenceId':doc['id'],'measured':{key:request[key]for key in ['weightKg','cogXmm','cogYmm','cogZmm']},'subjectConfirmed':True,'reason':'Fixture CoG survey page 1'};reconcile=path.removesuffix('/calculations')+'/reconciliations'
        s,v=req(reconcile,'POST',measurement,author);check('CoG source linked to confirmed calculation without approval',s==200 and v['result']['status']=='MATCHES_DECLARED_MEASUREMENTS' and not v['result']['carrierApproved'])
        check('CoG discrepancy requires new calculation',req(reconcile,'POST',{**measurement,'measured':{**measurement['measured'],'cogXmm':2001}},author)[1]['result']['status']=='MISMATCH_REQUIRES_NEW_RECORD')
        check('foreign tenant reconciliation denied',req(reconcile,'POST',measurement,foreign)[0]==404)
        check('planner cannot record CoG reconciliation',req(reconcile,'POST',measurement,plannerToken)[0]==403)
        check('known lever 4 to 1 reactions',math.isclose(supports['A']['reactionKn'],39.24,abs_tol=1e-9) and math.isclose(supports['B']['reactionKn'],9.81,abs_tol=1e-9));check('correct MPa pressure conversion',math.isclose(supports['A']['pressureMpa'],.3924,abs_tol=1e-9));check('force moment conservation',abs(supports['forceResidualKn'])<1e-9 and abs(supports['momentResidualKnMm'])<1e-7)
        check('known directional sliding demand',math.isclose(lash['requiredDirectResistanceKn'],24.525,abs_tol=1e-9));check('separate model no carrier approval',r['eligibleForInternalApproval'] and not r['approved'] and not r['carrierApproved'] and r['planStatus']=='PRE_PLAN')
        decision={'decision':'APPROVED_INTERNAL','expectedVersion':0,'reason':'Independent constrained model check','evidence':'Fixture independent arithmetic and input reference review'}
        check('self calculation cannot approve',req(path+'/'+calc+'/decisions','POST',decision,author)[0]==403);check('decision evidence required',req(path+'/'+calc+'/decisions','POST',{**decision,'evidence':''},reviewer)[0]==400)
        s,d=req(path+'/'+calc+'/decisions','POST',decision,reviewer);check('independent internal approval recorded without carrier approval',s==200 and d['version']==1 and d['planStatus']=='PRE_PLAN' and not d['carrierApproved'])
        check('stale decision version rejected',req(path+'/'+calc+'/decisions','POST',decision,reviewer)[0]==409)
        s,d=req(path+'/'+calc+'/decisions','POST',{**decision,'decision':'REQUEST_REVIEW','expectedVersion':1},reviewer);check('append review request preserves previous decision',s==200 and d['version']==2)
        for name,change,expected in [('estimated',{'sourceMode':'ESTIMATED'},'ESTIMATED_REQUIRES_CONFIRMATION'),('mass mismatch',{'weightKg':1000},'MASS_MISMATCH_REQUIRES_NEW_PLAN'),('missing',{'supportA':{'xMm':0},'lashing':None},'INCOMPLETE'),('uplift',{'supportA':{**request['supportA'],'xMm':3000}},'FAILED_DECLARED_LIMITS'),('lashing insufficient',{'lashing':{**request['lashing'],'verticalAngleDeg':90}},'FAILED_DECLARED_LIMITS')]:
            s,v=req(path,'POST',{**request,**change},author);check(name+' classified',s==200 and v['result']['status']==expected and not v['result']['eligibleForInternalApproval']);check(name+' cannot internally approve',req(path+'/'+v['id']+'/decisions','POST',decision,reviewer)[0]==409)
        rows=req(path,token=author)[1];saved=next(row for row in rows if row['id']==calc);check('immutable inputs and decision history preserved',saved['input_snapshot']['request']['weightKg']==5000 and saved['decisionVersion']==2 and len(saved['decisions'])==2)
        check('foreign calculations not listed',req(path,token=foreign)[0]==404)
        for table in ['oog_engineering_calculation','oog_engineering_decision']:
            db.execute('savepoint immutable_check');denied=False
            try:db.execute('delete from '+table+' where tenant_id=%s',(tenants[0][0],))
            except psycopg.Error:denied=True
            db.execute('rollback to savepoint immutable_check');check(table+' SQL immutable',denied)
        db.commit();output={'passed':len(checks),'failed':0,'checks':checks};(ROOT/'docs/verification-engineering-calculation.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'passed':len(checks),'failed':0}))
    finally:
        db.rollback();ids=[t[0] for t in tenants]
        if ids:
            db.execute("SET LOCAL lock_timeout='10s'")
            for table,trigger in [('oog_engineering_decision','oog_engineering_decision_immutable'),('oog_engineering_calculation','oog_engineering_calculation_immutable')]:
                db.execute('LOCK TABLE '+table+' IN ACCESS EXCLUSIVE MODE');db.execute('ALTER TABLE '+table+' DISABLE TRIGGER '+trigger);db.execute('DELETE FROM '+table+' WHERE tenant_id=ANY(%s)',(ids,));db.execute('ALTER TABLE '+table+' ENABLE TRIGGER '+trigger)
            db.execute('delete from oog_engineering_review where tenant_id=ANY(%s)',(ids,));db.execute('delete from core_audit_history where tenant_id=ANY(%s)',(ids,));db.execute('delete from oog_clp_scenario where project_id in(select id from oog_project where tenant_id=ANY(%s))',(ids,));db.execute('delete from oog_cargo where project_id in(select id from oog_project where tenant_id=ANY(%s))',(ids,));db.execute('delete from oog_project where tenant_id=ANY(%s)',(ids,))
            for table in ['core_session','core_login_history','core_role_menu','core_menu','core_user_account','core_role']:db.execute('delete from '+table+' where tenant_id=ANY(%s)',(ids,))
            db.execute('delete from core_tenant where tenant_id=ANY(%s)',(ids,))
        if jtis:db.execute('delete from core_session where access_jti=ANY(%s)',([uuid.UUID(j) for j in jtis],))
        db.commit()
        for file in evidence_files:file.unlink(missing_ok=True)
