import base64
import hashlib
import hmac
import json
import secrets
import time
import uuid
import urllib.request
import urllib.error
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET
import psycopg

ROOT=Path(__file__).resolve().parents[1]
config=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line)
url=urlparse(config['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];tenants=[];projects=[];test_sessions=[]

def check(name,condition):
    assert condition,name
    checks.append(name)

def request(path,method='GET',body=None,token=None):
    headers={'Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    try:
        data=None if body is None else json.dumps(body).encode()
        with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=data,headers=headers,method=method),timeout=45) as r:
            raw=r.read();value=json.loads(raw) if r.headers.get_content_type().endswith('json') else raw
            return r.status,value.get('data',value) if isinstance(value,dict) else value
    except urllib.error.HTTPError as e:return e.code,e.read()

def claims(token):return json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))
def remember(tokens):test_sessions.append(claims(tokens['accessToken'])['jti']);return tokens
def login(code,user,password):
    status,value=request('/auth/login','POST',{'tenantCode':code,'username':user,'password':password})
    check('DB account login '+user,status==200);return remember(value)

def forged(token,changes,remove=()):
    head,payload,_=token.split('.');data=claims(token);data.update(changes)
    for key in remove:data.pop(key,None)
    segment=base64.urlsafe_b64encode(json.dumps(data,separators=(',',':')).encode()).decode().rstrip('=')
    alg=json.loads(base64.urlsafe_b64decode(head+'=='))['alg'];digest={'HS256':hashlib.sha256,'HS384':hashlib.sha384,'HS512':hashlib.sha512}[alg]
    signature=base64.urlsafe_b64encode(hmac.new(config['JWT_SECRET_KEY'].encode(),(head+'.'+segment).encode(),digest).digest()).decode().rstrip('=')
    return head+'.'+segment+'.'+signature

for attempt in range(45):
    try:
        status,initial=request('/auth/login','POST',{'tenantCode':'OOG','username':'admin','password':config['OOG_ADMIN_PASSWORD']})
        if status==200:platform=remember(initial);break
    except urllib.error.URLError:pass
    time.sleep(1)
else:raise RuntimeError('OOG database login was not ready')

with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=config['DB_USERNAME'],password=config['DB_PASSWORD'],connect_timeout=10) as db:
    try:
        check('anonymous protected API is 401',request('/me')[0]==401)
        check('database principal includes company and permissions',request('/me',token=platform['accessToken'])[1]['menus'] and platform['user']['tenantId']==1)
        with db.cursor() as cur:
            cur.execute("select count(*) filter(where tablename like 'core_%%'),count(*) filter(where tablename like 'oog_%%'),count(*) from pg_tables where schemaname='public'")
            check('eight core sixteen business and Flyway tables',cur.fetchone()==(8,16,25))
            cur.execute('select version from flyway_schema_history where success order by installed_rank desc limit 1')
            check('Flyway V10 applied',cur.fetchone()[0]=='10')
            cur.execute('select refresh_hash from core_session where access_jti=%s',(claims(platform['accessToken'])['jti'],))
            stored=cur.fetchone()[0]
            check('refresh token stored as SHA256 only',stored==hashlib.sha256(platform['refreshToken'].encode()).hexdigest() and stored!=platform['refreshToken'])
        password=secrets.token_urlsafe(24)
        for key in ['A','B']:
            code='T_'+uuid.uuid4().hex[:12].upper()
            status,value=request('/core/tenants','POST',{'tenantCode':code,'tenantName':'VERIFY-CORE-'+key,'adminUsername':'companyadmin','adminPassword':password},platform['accessToken'])
            check('company and initial administrator created '+key,status==200);tenants.append({'id':value['tenantId'],'code':code})
        a,b=tenants;admin_a=login(a['code'],'companyadmin',password);admin_b=login(b['code'],'companyadmin',password)
        check('company administrator cannot manage platform companies',request('/core/tenants',token=admin_a['accessToken'])[0]==403)
        roles=request('/core/roles',token=admin_a['accessToken'])[1];roles_b=request('/core/roles',token=admin_b['accessToken'])[1]
        role=lambda code:next(r['role_id'] for r in roles if r['role_code']==code)
        check('new company receives own roles without platform role',len(roles)==5 and not any(r['role_code']=='SUPER_ADMIN' for r in roles))
        check('foreign company role rejected',request('/core/users','POST',{'username':'foreignrole','password':password,'roleId':roles_b[0]['role_id']},admin_a['accessToken'])[0]==400)
        users={}
        for username,code in [('writer','PLANNER'),('reader','CUSTOMER'),('locktest','CUSTOMER')]:
            status,value=request('/core/users','POST',{'username':username,'password':password,'roleId':role(code)},admin_a['accessToken'])
            check('role account created '+username,status==200);users[username]=value['userId']
        writer=login(a['code'],'writer',password);reader=login(a['code'],'reader',password)
        status,list_users=request('/core/users',token=admin_a['accessToken'])
        check('user list excludes password and other company',status==200 and all('password_hash' not in u and u['tenant_id']==a['id'] for u in list_users))
        check('planner cannot manage users',request('/core/users',token=writer['accessToken'])[0]==403)
        status,project=request('/projects','POST',{'name':'VERIFY-CORE-A','customer':'Verification','tenantId':b['id']},writer['accessToken'])
        check('request company value overwritten by verified principal',status==200 and project['tenantId']==a['id']);projects.append(project['id']);pid=project['id']
        status,other=request('/projects','POST',{'name':'VERIFY-CORE-B','customer':'Verification'},admin_b['accessToken']);check('second company project created',status==200);projects.append(other['id'])
        list_a=request('/projects',token=writer['accessToken'])[1]['content'];list_b=request('/projects',token=admin_b['accessToken'])[1]['content']
        check('project lists segregate companies',all(p['tenantId']==a['id'] for p in list_a) and all(p['tenantId']==b['id'] for p in list_b))
        cargo={'projectId':pid,'itemNo':'TEST','quantity':2,'length':1000,'width':1000,'height':1000,'grossWeight':1000}
        status,value=request('/projects/'+pid+'/cargos','POST',cargo,writer['accessToken']);check('planner can create own company cargo',status==200)
        status,plan=request('/projects/'+pid+'/plans','POST',token=writer['accessToken']);check('planner can create own company CLP',status==200)
        planid=plan['id'];assignment=plan['result']['scenarios'][0]['containers'][0]['assignments'][0]
        patch={'scenarioIndex':0,'changes':[{'cargoId':assignment['cargoId'],'piece':assignment['piece'],'targetContainerNumber':1,'x':3000,'y':assignment['y']}]}
        for name,path in [('cargo','cargos'),('analysis','analysis'),('plans','plans'),('history','history'),('analysis Excel','export'),('CLP Excel','plans/'+planid+'/export'),('engineering review','plans/'+planid+'/engineering')]:
            check('foreign company denied '+name,request('/projects/'+pid+'/'+path,token=admin_b['accessToken'])[0]==404)
        check('platform admin cannot read other company business',request('/projects/'+pid+'/analysis',token=platform['accessToken'])[0]==404)
        check('foreign company cannot revise CLP',request('/projects/'+pid+'/plans/'+planid+'/revisions','POST',patch,admin_b['accessToken'])[0]==404)
        check('customer can read permitted analysis',request('/projects/'+pid+'/analysis',token=reader['accessToken'])[0]==200)
        check('planner cannot record engineering review',request('/projects/'+pid+'/plans/'+planid+'/engineering','POST',{'observations':{},'reason':'must be denied'},writer['accessToken'])[0]==403)
        check('customer cannot create project',request('/projects','POST',{'name':'DENIED','customer':'Verification'},reader['accessToken'])[0]==403)
        check('customer cannot alter cargo',request('/projects/'+pid+'/cargos','POST',{**cargo,'itemNo':'DENIED'},reader['accessToken'])[0]==403)
        check('customer cannot revise CLP',request('/projects/'+pid+'/plans/'+planid+'/revisions','POST',patch,reader['accessToken'])[0]==403)
        check('company admin cannot alter global carrier rules',request('/rules/40FR','PUT',{'equipmentCode':'40FR','usableLengthRatio':.94,'planningWeightRatio':.9,'maxOverWidth':1600,'maxOverHeight':1800,'version':0},admin_a['accessToken'])[0]==403)
        menus=request('/core/roles/'+str(role('PLANNER'))+'/menus',token=admin_a['accessToken'])[1];menu=next(m for m in menus if m['menu_key']=='PLANNING')
        flags={k:menu[k] for k in ['canView','canCreate','canEdit','canDelete','canExport']}
        check('role menu current flags loaded',flags['canEdit'])
        status,_=request('/core/roles/'+str(role('PLANNER'))+'/menus/'+str(menu['menu_id']),'PUT',{**flags,'canEdit':False},admin_a['accessToken'])
        check('role menu write persisted',status==200)
        check('current JWT respects changed menu permission',request('/projects/'+pid+'/plans/'+planid+'/revisions','POST',patch,writer['accessToken'])[0]==403)
        request('/core/roles/'+str(role('PLANNER'))+'/menus/'+str(menu['menu_id']),'PUT',flags,admin_a['accessToken'])
        check('protected admin role cannot lose permissions',request('/core/roles/'+str(role('ADMIN'))+'/menus/'+str(menu['menu_id']),'PUT',flags,admin_a['accessToken'])[0]==403)
        user=next(u for u in request('/core/users',token=admin_a['accessToken'])[1] if u['user_id']==users['reader'])
        check('user optimistic conflict rejected',request('/core/users/'+str(user['user_id']),'PATCH',{'status':'INACTIVE','version':user['version']+1},admin_a['accessToken'])[0]==409)
        check('user deactivation succeeds',request('/core/users/'+str(user['user_id']),'PATCH',{'status':'INACTIVE','version':user['version']},admin_a['accessToken'])[0]==200)
        check('deactivation revokes existing access JWT',request('/me',token=reader['accessToken'])[0]==401)
        check('deactivation revokes refresh JWT',request('/auth/refresh','POST',{'refreshToken':reader['refreshToken']})[0]==401)
        for attempt in range(5):check('bad password fails '+str(attempt+1),request('/auth/login','POST',{'tenantCode':a['code'],'username':'locktest','password':'incorrect-password'})[0]==401)
        check('correct password rejected during temporary lock',request('/auth/login','POST',{'tenantCode':a['code'],'username':'locktest','password':password})[0]==401)
        with db.cursor() as cur:
            cur.execute('select failed_attempts,locked_until>now() from core_user_account where user_id=%s',(users['locktest'],));check('failed counter and lock persist after errors',cur.fetchone()==(5,True))
        old=writer
        status,new=request('/auth/refresh','POST',{'refreshToken':old['refreshToken']});check('refresh rotates into new session',status==200);writer=remember(new)
        check('old refresh cannot be reused',request('/auth/refresh','POST',{'refreshToken':old['refreshToken']})[0]==401)
        check('old access invalidated on rotation',request('/me',token=old['accessToken'])[0]==401)
        check('rotated access is usable',request('/me',token=writer['accessToken'])[0]==200)
        check('access token cannot be used as refresh',request('/auth/refresh','POST',{'refreshToken':writer['accessToken']})[0]==401)
        check('refresh token cannot be used as access',request('/me',token=writer['refreshToken'])[0]==401)
        check('different issuer rejected even with valid signature',request('/me',token=forged(writer['accessToken'],{'iss':'circle-fms'}))[0]==401)
        check('expiration is required',request('/me',token=forged(writer['accessToken'],{},remove=['exp']))[0]==401)
        check('fractional company identity rejected',request('/me',token=forged(writer['accessToken'],{'tenantId':a['id']+.5}))[0]==401)
        check('logout succeeds',request('/auth/logout','POST',token=writer['accessToken'])[0]==200)
        check('logout revokes access',request('/me',token=writer['accessToken'])[0]==401)
        check('logout revokes refresh',request('/auth/refresh','POST',{'refreshToken':writer['refreshToken']})[0]==401)
        with db.cursor() as cur:
            cur.execute('select count(*) from core_login_history where tenant_id=%s and status=%s',(a['id'],'FAILURE'));check('login failures recorded',cur.fetchone()[0]>=5)
            cur.execute('select count(*) from core_audit_history where tenant_id=%s and actor_user_id is not null',(a['id'],));check('user company audit identity retained',cur.fetchone()[0]>=5)
    finally:
        with db.cursor() as cur:
            for tid in [t['id'] for t in tenants]:
                cur.execute('delete from core_audit_history where tenant_id=%s',(tid,))
                for table in ['oog_clp_scenario','oog_packing_list','oog_cargo']:
                    cur.execute(f'delete from {table} where project_id in(select id from oog_project where tenant_id=%s)',(tid,))
                cur.execute('delete from oog_project where tenant_id=%s',(tid,))
                cur.execute('delete from oog_carrier_rule_version where tenant_id=%s',(tid,))
                for table in ['core_login_history','core_session','core_user_account','core_role_menu','core_menu','core_role']:
                    cur.execute(f'delete from {table} where tenant_id=%s',(tid,))
                cur.execute('delete from core_tenant where tenant_id=%s',(tid,))
            for jti in test_sessions:cur.execute('update core_session set revoked_at=GREATEST(now(),created_at) where access_jti=%s',(jti,))
        db.commit()
total=failures=errors=0
for p in (ROOT/'backend/build/test-results/test').glob('TEST-*.xml'):
    node=ET.parse(p).getroot();total+=int(node.get('tests',0));failures+=int(node.get('failures',0));errors+=int(node.get('errors',0))
assert failures==errors==0
report={'date':'2026-10-13','database':'oog','migration':'V10','tables':{'core':8,'business':16,'flyway':1,'total':25},'javaTests':total,'javaFailures':failures,'apiChecks':len(checks),'checks':checks,'fixturesRemoved':True,'securityHistory':'platform login and company creation security history retained; only test sessions revoked','uiWorkflow':'not tested'}
(ROOT/'docs/verification-core.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'apiChecks':len(checks),'javaTests':total,'tables':report['tables'],'fixturesRemoved':True}))
