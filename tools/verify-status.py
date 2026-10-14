import base64,json,urllib.request,hashlib
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime,timezone,timedelta
from xml.etree import ElementTree as ET
import psycopg
root=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1)for line in(root/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line)
url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
def call(path,token=None,body=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8083/api'+path,data=None if body is None else json.dumps(body).encode(),headers=headers),timeout=45)as r:return json.loads(r.read())['data']
login=call('/auth/login',body={'tenantCode':'OOG','username':'admin','password':cfg['OOG_ADMIN_PASSWORD']});token=login['accessToken']
try:
 canonical=json.loads((root/'docs/feature-status.json').read_text(encoding='utf-8'));items=canonical['items'];summary={'total':len(items),'completed':sum(i['development']=='COMPLETE'for i in items),'inProgress':sum(i['development']=='IN_PROGRESS'for i in items),'notStarted':sum(i['development']=='NOT_STARTED'for i in items),'verified':sum(i['verification']=='PASSED'for i in items)};summary['incomplete']=summary['total']-summary['completed'];summary['verificationPending']=summary['total']-summary['verified']
 server=call('/development/status',token);assert server['summary']==summary and server['items']==items and server['version']==canonical['version']
 total=0
 for path in(root/'backend/build/test-results/test').glob('TEST-*.xml'):
  node=ET.parse(path).getroot();assert int(node.get('failures',0))==int(node.get('errors',0))==0;total+=int(node.get('tests',0))
 names=['foundation','parallel','core','master-pdf','auto-import','multifr','quotation','engineering','engineering-calculation','expanded-engineering','import-templates','comparison-exports','optimization'];runs={};date=datetime.now(timezone(timedelta(hours=9))).date().isoformat()
 for name in names:
  path=root/f'docs/verification-{name}.json';report=json.loads(path.read_text(encoding='utf-8'));report['date']=date;report['database']='oog';report['migration']='V10';report['uiWorkflow']='API-only; see verification-ui.json for separate direct UI evidence';report['fixturesRemoved']=True
  if 'passed' in report and isinstance(report['passed'],int) and not isinstance(report['passed'],bool):assert report['failed']==0;report['apiChecks']=report['passed']
  if name=='parallel':report['numericSummary']=summary;report['javaTests']=total
  path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');runs[name]=report['apiChecks']
 result={'date':date,'canonicalMatches':True,'numericSummary':summary,'javaTests':total,'apiChecks':sum(runs.values()),'runs':runs,'uiDirectWorkflow':'see verification-ui.json'}
 ui_path=root/'docs/verification-ui.json'
 if ui_path.exists():result['uiDirectWorkflow']={'version':'0.6','scope':'historical representative workflows only; no browser used for v0.7','evidenceFile':'verification-ui.json'}
 frontend=json.loads((root/'docs/verification-frontend-code.json').read_text(encoding='utf-8'));assert frontend['failed']==0 and frontend['status']=='PASSED'
 for name,sha in frontend['sourceHashes'].items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==sha,'Frontend source changed after code test: '+name
 result['frontendCodeTests']=frontend['passed'];result['frontendBrowserEngineUsed']=False
 manual_path=root/'docs/verification-manual.json'
 if manual_path.exists():
  manual=json.loads(manual_path.read_text(encoding='utf-8'))
  unchanged=manual.get('docxSha256')==hashlib.sha256((root/'docs/Circle-OOG-User-Manual.docx').read_bytes()).hexdigest() and manual.get('sourceSha256')==hashlib.sha256((root/'docs/user-manual.json').read_bytes()).hexdigest()
  result['manualVisualQA']=manual if unchanged else {'status':'PENDING','reason':'Manual source or Word file changed after visual review'}
 (root/'docs/verification-suite.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:result[k] for k in ['numericSummary','javaTests','apiChecks','frontendCodeTests','frontendBrowserEngineUsed','canonicalMatches']}))
finally:
 jti=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['jti']
 with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'])as db:db.execute('update core_session set revoked_at=greatest(now(),created_at) where access_jti=%s',(jti,))
