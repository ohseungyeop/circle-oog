"""Live OOG-only quotation tests; all created records belong to unique fixture companies."""
import base64,json,secrets,uuid,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse
from decimal import Decimal
import psycopg
ROOT=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line)
url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];tenants=[];jtis=[]
def check(name,ok):
    assert ok,name
    checks.append(name)
def req(path,method='GET',body=None,token=None):
    headers={'Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    try:
        with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method),timeout=45) as r:
            return r.status,json.loads(r.read())['data']
    except urllib.error.HTTPError as e:return e.code,e.read()
def login(code,user,password):
    status,v=req('/auth/login','POST',{'tenantCode':code,'username':user,'password':password});check('login '+code,status==200)
    jtis.append(json.loads(base64.urlsafe_b64decode(v['accessToken'].split('.')[1]+'=='))['jti']);return v['accessToken']
with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'],connect_timeout=10) as db:
    try:
        platform=login('OOG','admin',cfg['OOG_ADMIN_PASSWORD']);password=secrets.token_urlsafe(24)
        tokens=[]
        for suffix in ['A','B']:
            code='Q_'+uuid.uuid4().hex[:12].upper();s,v=req('/core/tenants','POST',{'tenantCode':code,'tenantName':'VERIFY-QUOTATION-'+suffix,'adminUsername':'qa','adminPassword':password},platform)
            check('fixture tenant '+suffix,s==200);tenants.append((v['tenantId'],code));tokens.append(login(code,'qa',password))
        a,b=tokens
        s,p=req('/projects','POST',{'name':'VERIFY-QUOTATION','customer':'fixture'},a);check('project',s==200);pid=p['id']
        s,c=req('/projects/'+pid+'/cargos','POST',{'projectId':pid,'itemNo':'Q01-CARGO','quantity':2,'length':1100,'width':520,'height':430,'grossWeight':110,'netWeight':100,'originalLength':1000,'originalWidth':500,'originalHeight':400},a);check('cargo',s==200);cid=c['id']
        estimate={'cargoId':cid,'packingType':'CRATE'}
        s,v=req('/projects/'+pid+'/packing-estimates','POST',estimate,a);check('automatic missing packing rule explicit',s==200 and v['result']['status']=='MISSING_PACKING_RULE' and v['result']['mode']=='AUTO')
        rule={'packingType':'CRATE','allowanceLengthMm':100,'allowanceWidthMm':20,'allowanceHeightMm':30,'tareWeightKg':10,'weightBasis':'NET_WEIGHT','reason':'verified fixture'}
        check('packing rule numeric required',req('/packing/rules','POST',{k:v for k,v in rule.items() if k!='tareWeightKg'},a)[0]==400)
        s,r=req('/packing/rules','POST',rule,a);check('company packing rule created',s==200 and r['version']==1)
        s,v=req('/projects/'+pid+'/packing-estimates','POST',estimate,a);check('automatic packing formula per piece',s==200 and v['result']['length']==1100 and v['result']['grossWeight']==110 and v['result']['totalGrossWeight']==220)
        manual={**estimate,'mode':'MANUAL','manual':{'length':1200,'width':600,'height':500,'grossWeight':120},'reason':'operator confirmed dimensions'}
        s,v=req('/projects/'+pid+'/packing-estimates','POST',manual,a);check('manual packing source tracked',s==200 and v['result']['source']=='MANUAL_OVERRIDE' and v['result']['grossWeight']==120)
        check('manual packing requires reason',req('/projects/'+pid+'/packing-estimates','POST',{**manual,'reason':None},a)[0]==400)
        current=req('/projects/'+pid+'/cargos',token=a)[1][0];check('estimates do not overwrite cargo',current['length']==1100 and current['grossWeight']==110)
        check('packing rules tenant isolated',req('/packing/rules',token=b)[1]==[])
        check('estimate foreign company denied',req('/projects/'+pid+'/packing-estimates',token=b)[0]==404)
        s,plan=req('/projects/'+pid+'/plans','POST',{},a);check('saved plan fixture',s==200);planid=plan['id'];scenarios=plan['result'].get('scenarios',[plan['result']])
        codes=sorted({box['equipment'] for sc in scenarios for box in sc['containers']});check('actual saved equipment exists',bool(codes))
        quote={'planId':planid,'currency':'USD','rateDate':'2026-10-14'}
        s,v=req('/projects/'+pid+'/quotations','POST',quote,a);check('missing rate leaves total null',s==200 and all(sc['status']=='MISSING_RATE' and sc['total'] is None for sc in v['result']['alternatives']))
        for code in codes:
            rate={'equipmentCode':code,'currency':'USD','unitRate':'0.10','validFrom':'2026-01-01','validUntil':'2026-12-31','reason':'verified fixture rate'}
            s,r=req('/quotation/rates','POST',rate,a);check('company rate '+code,s==200 and r['version']==1)
            check('overlapping rate denied '+code,req('/quotation/rates','POST',rate,a)[0]==409)
        fees={**quote,'packingFee':'1.10','lashingFee':'2.20','reason':'operator confirmed fees'}
        s,v=req('/projects/'+pid+'/quotations','POST',fees,a);check('prequote created with no engineering approval',s==200 and v['result']['status']=='PRE_QUOTE' and not v['result']['engineeringApproved']);qid=v['id']
        for i,sc in enumerate(v['result']['alternatives']):
            n=len(scenarios[i]['containers']);check('alternative separate counts '+str(i),sc['equipmentQuantity']==n and Decimal(str(sc['total']))==Decimal(n)*Decimal('.10')+Decimal('3.30'))
        check('mixed currency rejected',req('/projects/'+pid+'/quotations','POST',{**quote,'currency':'KRW'},a)[0]==400)
        check('auto override rejected',req('/projects/'+pid+'/quotations','POST',{**quote,'equipmentOverrides':{codes[0]:20},'reason':'manual'},a)[0]==400)
        s,v=req('/projects/'+pid+'/quotations','POST',{**fees,'mode':'MANUAL','equipmentOverrides':{code:'2.50' for code in codes}},a);check('manual unit override source persisted',s==200 and all(line['source']=='MANUAL_OVERRIDE' for sc in v['result']['alternatives'] for line in sc['lines']))
        check('rates tenant isolated',req('/quotation/rates',token=b)[1]==[]);check('quotes tenant isolated',req('/projects/'+pid+'/quotations',token=b)[0]==404)
        stored=req('/projects/'+pid+'/quotations',token=a)[1];check('saved plan and rates snapshot preserved',all(row['input_snapshot']['plan'] and 'rates' in row['input_snapshot'] for row in stored))
        db.execute('savepoint immutable_check');denied=False
        try:db.execute('update oog_quotation set result=result where id=%s',(qid,))
        except psycopg.Error:denied=True
        db.execute('rollback to savepoint immutable_check');check('quotation SQL immutable',denied);db.commit()
        output={'passed':len(checks),'failed':0,'checks':checks};(ROOT/'docs/verification-quotation.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'passed':len(checks),'failed':0}))
    finally:
        db.rollback()
        ids=[t[0] for t in tenants]
        if ids:
            immutable={'oog_quotation':'oog_quotation_immutable','oog_packing_estimate':'oog_packing_estimate_immutable','oog_equipment_rate':'oog_equipment_rate_immutable','oog_packing_rule':'oog_packing_rule_immutable'}
            db.execute("SET LOCAL lock_timeout='10s'")
            for table,trigger in immutable.items():
                db.execute('LOCK TABLE '+table+' IN ACCESS EXCLUSIVE MODE');db.execute('ALTER TABLE '+table+' DISABLE TRIGGER '+trigger)
                db.execute('DELETE FROM '+table+' WHERE tenant_id=ANY(%s)',(ids,));db.execute('ALTER TABLE '+table+' ENABLE TRIGGER '+trigger)
            db.execute('delete from core_audit_history where tenant_id=ANY(%s)',(ids,))
            db.execute('delete from oog_clp_scenario where project_id in(select id from oog_project where tenant_id=ANY(%s))',(ids,));db.execute('delete from oog_cargo where project_id in(select id from oog_project where tenant_id=ANY(%s))',(ids,));db.execute('delete from oog_project where tenant_id=ANY(%s)',(ids,))
            for table in ['core_session','core_login_history','core_role_menu','core_menu','core_user_account','core_role']:
                db.execute('delete from '+table+' where tenant_id=ANY(%s)',(ids,))
            db.execute('delete from core_tenant where tenant_id=ANY(%s)',(ids,))
        if jtis:db.execute('delete from core_session where access_jti=ANY(%s)',([uuid.UUID(j) for j in jtis],))
        db.commit()
