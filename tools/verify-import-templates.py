"""Tenant-scoped template tests, real HSSF xls/cm import, boundary and source-file detection."""
import base64,io,json,uuid,urllib.request,urllib.error,shutil
from pathlib import Path
from urllib.parse import urlparse
import openpyxl,psycopg
ROOT=Path(__file__).resolve().parents[1];SOURCE=Path('D:/01. 오승엽/OOG')
cfg=dict(line.split('=',1) for line in (ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines() if '=' in line);url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
checks=[];ids=[];projects=[];session=None;customer='VERIFY_TEMPLATE_'+uuid.uuid4().hex
def check(name,ok):
 assert ok,name
 checks.append(name)
def call(path,method='GET',value=None,token=None,content='application/json'):
 headers={'Content-Type':content}
 if token:headers['Authorization']='Bearer '+token
 data=value if isinstance(value,bytes) else None if value is None else json.dumps(value).encode()
 try:
  with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=data,headers=headers,method=method),timeout=45) as r:return r.status,json.loads(r.read())['data']
 except urllib.error.HTTPError as e:return e.code,e.read()
def multipart(path,file,name,fields,token):
 b='oog'+uuid.uuid4().hex;parts=[]
 for k,v in fields.items():parts.append((f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n').encode())
 parts.append((f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+file+b'\r\n');parts.append((f'--{b}--\r\n').encode());return call(path,'POST',b''.join(parts),token,'multipart/form-data; boundary='+b)
try:
 status,login=call('/auth/login','POST',{'tenantCode':'OOG','username':'admin','password':cfg['OOG_ADMIN_PASSWORD']});check('login',status==200);token=login['accessToken'];session=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['jti']
 raw=(ROOT/'.runtime/import-fixture.xls').read_bytes();check('genuine HSSF OLE fixture',raw[:8]==bytes.fromhex('d0cf11e0a1b11ae1'))
 status,result=multipart('/imports/detect',raw,'fixture.xls',{'customer':customer},token);check('legacy xls detection',status==200 and result['autoSelectable']);candidate=result['candidates'][0]
 mapping=candidate['suggestedMapping'];template={'customer':customer,'name':'CM legacy','combinedHeaders':candidate['combinedHeaders'],'mapping':mapping,'lengthUnit':'cm','weightUnit':'kg','weightBasis':'PER_PIECE','reason':'Fixture confirmed'}
 status,value=call('/import-templates','POST',template,token);check('template saved v1',status==200 and value['version']==1);ids.append(value['id'])
 status,value=call('/import-templates','POST',{**template,'reason':'Second immutable version'},token);check('new version appended',status==200 and value['version']==2);ids.append(value['id'])
 check('anonymous templates denied',call('/import-templates')[0]==401)
 duplicate={**mapping,'width':mapping['length']};check('duplicate mapping rejected',call('/import-templates','POST',{**template,'mapping':duplicate},token)[0]==400)
 check('row total requires quantity',call('/import-templates','POST',{**template,'weightBasis':'ROW_TOTAL'},token)[0]==400)
 matched=multipart('/imports/detect',raw,'fixture.xls',{'customer':customer},token)[1]['candidates'][0]['templateSuggestions'];check('only latest exact customer version suggested',len(matched)==1 and matched[0]['version']==2 and matched[0]['requiresConfirmation'])
 check('different customer no template',not multipart('/imports/detect',raw,'fixture.xls',{'customer':customer+'OTHER'},token)[1]['candidates'][0]['templateSuggestions'])
 status,p=call('/projects','POST',{'name':customer,'customer':customer},token);check('project created',status==200);pid=p['id'];projects.append(pid)
 fields={'mapping':json.dumps(mapping),'sheet':0,'header':0,'headerRows':1,'lengthUnit':'cm','weightUnit':'kg','weightBasis':'PER_PIECE'}
 status,result=multipart('/projects/'+pid+'/imports',raw,'fixture.xls',fields,token);check('legacy xls imported',status==200 and result['imported']==1)
 rows=call('/projects/'+pid+'/cargos',token=token)[1];check('cm normalized mm',rows[0]['length']==2000 and rows[0]['width']==1000 and rows[0]['height']==1200)
 for field,value in [('quantity',0),('quantity',10001),('length',0),('length',100001),('netWeight',601)]:
  cargo={'itemNo':'BOUNDARY','quantity':1,'length':2000,'width':1000,'height':1000,'grossWeight':600,'netWeight':0,field:value};check('cargo boundary '+field+' '+str(value),call('/projects/'+pid+'/cargos','POST',cargo,token)[0]==400)
 check('rejected cargos never persisted',len(call('/projects/'+pid+'/cargos',token=token)[1])==1)
 source_results=[]
 for path in sorted(SOURCE.rglob('*')):
  if path.suffix.lower() not in ('.xls','.xlsx') or path.name.startswith('~$'):continue
  status,result=multipart('/imports/detect',path.read_bytes(),path.name,{},token);check('source detection '+path.name+' '+str(status)+' '+(str(result)[:350] if status!=200 else ''),status==200);source_results.append({'file':path.name,'candidates':len(result['candidates']),'autoSelectable':result['autoSelectable'],'requiresManual':not result['autoSelectable'] or any(c['lengthUnit'] is None or c['weightUnit'] is None or c['weightBasis'] is None for c in result['candidates'])})
 with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD']) as db:
  for operation in ['update oog_import_template set reason=reason where id=%s','delete from oog_import_template where id=%s']:
   db.execute('savepoint immutable');rejected=False
   try:db.execute(operation,(ids[0],))
   except psycopg.Error:rejected=True
   db.execute('rollback to savepoint immutable');check('immutable SQL '+operation.split()[0],rejected)
 report={'apiChecks':len(checks),'checks':checks,'passed':True,'sourceFiles':source_results,'sourceFilesModified':False,'uiDirectWorkflow':'not performed'};(ROOT/'docs/verification-import-templates.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'apiChecks':len(checks),'sources':len(source_results),'passed':True}))
finally:
 with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD']) as db:
  if ids:
   db.execute('alter table oog_import_template disable trigger oog_import_template_immutable_trigger')
   try:
    for ident in ids:db.execute('delete from oog_import_template where id=%s and customer=%s',(ident,customer))
   finally:db.execute('alter table oog_import_template enable trigger oog_import_template_immutable_trigger')
  for pid in projects:
   for table in ['core_audit_history','oog_packing_list','oog_cargo']:db.execute(f'delete from {table} where project_id=%s',(pid,))
   db.execute('delete from oog_project where id=%s',(pid,))
  if session:db.execute('update core_session set revoked_at=now() where access_jti=%s',(session,))
 for pid in projects:
  folder=ROOT/'data/projects'/pid
  if folder.exists() and folder.resolve().is_relative_to((ROOT/'data').resolve()):shutil.rmtree(folder)
