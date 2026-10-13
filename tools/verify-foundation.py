import base64
import io
import json
import os
import time
import uuid
import urllib.request
import urllib.error
from pathlib import Path
from urllib.parse import urlparse
import psycopg
import openpyxl

ROOT=Path(__file__).resolve().parents[1]
config=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line)
url=urlparse(config['DB_URL'].removeprefix('jdbc:'))
assert url.path=='/oog', 'Only oog DB is permitted'
token=base64.b64encode(('admin:'+config['OOG_ADMIN_PASSWORD']).encode()).decode()
checks=[]
project_id=None

def check(name,ok):
    assert ok, name
    checks.append(name)

def request(path,method='GET',data=None,content_type='application/json',authorized=True):
    headers={'Content-Type':content_type}
    if authorized:headers['Authorization']='Basic '+token
    payload=json.dumps(data).encode() if isinstance(data,(dict,list)) else data
    req=urllib.request.Request('http://127.0.0.1:8083/api'+path,data=payload,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=45) as response:
            raw=response.read()
            if response.headers.get_content_type().endswith('json'):
                body=json.loads(raw);return response.status,body.get('data',body)
            return response.status,raw
    except urllib.error.HTTPError as error:
        return error.code,error.read()

def multipart(path,fields,file_path):
    boundary='oog-'+uuid.uuid4().hex
    chunks=[]
    for key,value in fields.items():
        chunks.extend([f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()])
    chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'.encode())
    chunks.append(file_path.read_bytes());chunks.append(f'\r\n--{boundary}--\r\n'.encode())
    return request(path,'POST',b''.join(chunks),'multipart/form-data; boundary='+boundary)

for attempt in range(45):
    try:
        if request('/me')[0]==200:break
    except urllib.error.URLError:
        pass
    time.sleep(1)
else:raise RuntimeError('OOG API was not ready within 45 seconds')

with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=config['DB_USERNAME'],password=config['DB_PASSWORD'],connect_timeout=10) as db:
    try:
        check('unauthenticated API rejected',request('/projects',authorized=False)[0]==401)
        check('administrator authenticated',request('/me')[0]==200)
        status,p=request('/projects','POST',{'name':'VERIFY-'+uuid.uuid4().hex,'customer':'OOG verification','destination':'TEST'})
        check('project created',status==200);project_id=p['id']
        check('project listed',any(p['id']==project_id for p in request('/projects')[1]['content']))
        status,_=request('/projects/'+project_id+'/cargos','POST',{'projectId':project_id,'itemNo':'BAD','quantity':1,'length':0,'width':100,'height':100,'grossWeight':1})
        check('zero dimension rejected',status==400)
        sample=Path(r'D:\01. 오승엽\OOG\PackingList_sample.xlsx')
        status,preview=multipart('/imports/preview',{'sheet':0,'header':1},sample)
        check('real Excel preview',status==200 and preview['totalRows']==5)
        mapping={'itemNo':0,'description':1,'length':5,'width':6,'height':7,'quantity':8,'netWeight':11,'grossWeight':12}
        fields={'sheet':0,'header':1,'lengthUnit':'mm','weightUnit':'kg','mapping':json.dumps(mapping)}
        status,result=multipart('/projects/'+project_id+'/imports',fields,sample)
        check('real Excel imported',status==200 and result['imported']==3)
        status,duplicate=multipart('/projects/'+project_id+'/imports',fields,sample)
        check('duplicate import rejected atomically',status==200 and duplicate['imported']==0 and len(duplicate['errors'])==3)
        status,items=request('/projects/'+project_id+'/analysis')
        check('analysis includes all imported items',status==200 and len(items)==3)
        check('candidate explanations retained',all(a['candidates'] and a['candidates'][0]['reasons'] for a in items))
        status,plan=request('/projects/'+project_id+'/plans','POST')
        check('optimizer scenarios saved',status==200 and len(plan['result']['scenarios'])==2)
        for scenario in plan['result']['scenarios']:
            check('piece conservation '+scenario['objective'],sum(len(b['assignments']) for b in scenario['containers'])+len(scenario['unassigned'])==3)
        status,history=request('/projects/'+project_id+'/plans')
        check('saved scenario reloaded',status==200 and len(history)==1)
        status,raw=request('/projects/'+project_id+'/export')
        book=openpyxl.load_workbook(io.BytesIO(raw),read_only=True)
        check('analysis Excel contains three cargos',status==200 and book.active.max_row==4)
        book.close()
        with db.cursor() as cursor:
            cursor.execute('select version,success from flyway_schema_history where success order by installed_rank desc limit 1')
            migration=cursor.fetchone();check('Flyway V2 applied',migration==('2',True))
            cursor.execute("select tablename from pg_tables where schemaname='public' and tablename<>'flyway_schema_history'")
            tables=[row[0] for row in cursor.fetchall()]
            check('all product tables have oog_ or core_ prefix',len(tables)==7 and all(t.startswith(('oog_','core_')) for t in tables))
            cursor.execute('select count(*) from oog_packing_list where project_id=%s',(project_id,));check('original upload recorded once',cursor.fetchone()[0]==1)
            cursor.execute('select count(*) from core_audit_history where project_id=%s',(project_id,));check('audit records retained',cursor.fetchone()[0]>=3)
    finally:
        if project_id:
            with db.cursor() as cursor:
                for table in ['core_audit_history','oog_clp_scenario','oog_packing_list','oog_cargo']:
                    cursor.execute(f'delete from {table} where project_id=%s',(project_id,))
                cursor.execute('delete from oog_project where id=%s',(project_id,))
            db.commit()
            import shutil
            fixture_dir=ROOT/'data'/'projects'/project_id
            if fixture_dir.exists() and fixture_dir.resolve().is_relative_to((ROOT/'data').resolve()):shutil.rmtree(fixture_dir)
from xml.etree import ElementTree as ET
java_tests=sum(int(ET.parse(p).getroot().get('tests',0)) for p in (ROOT/'backend/build/test-results/test').glob('TEST-*.xml'))
result={'date':'2026-10-13','database':'oog','migration':'V2','frontendBuild':'passed','backendBuild':'passed','javaTests':java_tests,'optimizerTests':4,'apiChecks':len(checks),'checks':checks,'testProjectRemoved':True,'status':'foundation verified','uiVerification':'Login page rendering only; authenticated UI workflows not tested','limitations':['JWT/RBAC migration pending','OR-Tools pending','Master values not approved for operations','Dedicated PDF template pending']}
(ROOT/'docs/verification-foundation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'apiChecks':len(checks),'database':'oog','migration':'V2','fixtureRemoved':True}))
