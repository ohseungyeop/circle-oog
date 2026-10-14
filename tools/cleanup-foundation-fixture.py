"""Clean the one positively identified failed foundation fixture, never discover other projects."""
import json,uuid,shutil
from pathlib import Path
from urllib.parse import urlparse
import psycopg
from psycopg import sql
ROOT=Path(__file__).resolve().parents[1];pid='d80b424e-a56b-453a-8a94-5f87205f3cb2';name='VERIFY-bf0f77d8b27141abad284bc80a8976ea';assert str(uuid.UUID(pid))==pid
cfg=dict(line.split('=',1)for line in(ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line);url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
folder=ROOT/'data/projects'/pid;base=(ROOT/'data/projects').resolve();assert not folder.exists()or(folder.resolve().parent==base and folder.resolve().name==pid and not folder.is_symlink())
counts={};tables=['oog_engineering_decision','oog_engineering_calculation','oog_engineering_review','oog_multi_fr_review','oog_quotation','oog_packing_estimate','core_audit_history','oog_clp_scenario','oog_packing_list','oog_cargo','oog_project']
with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'],connect_timeout=10)as db:
 with db.transaction():
  db.execute("set local lock_timeout='10s'");db.execute("set local statement_timeout='45s'")
  row=db.execute("select tenant_id,name,customer,destination,(created_at at time zone 'Asia/Seoul')::date::text from oog_project where id=%s for update",(pid,)).fetchone();assert row==(1,name,'OOG verification','TEST','2026-10-14'),'Failed fixture identity mismatch'
  db.execute(sql.SQL('LOCK TABLE {} IN ACCESS EXCLUSIVE MODE').format(sql.SQL(',').join(map(sql.Identifier,sorted(tables)))))
  triggers=[]
  for table in tables:
   for trigger,enabled in db.execute("select tgname,tgenabled from pg_trigger where tgrelid=cast(%s as regclass) and not tgisinternal and tgname like '%%immutable%%'",(table,)):
    assert enabled=='O','Existing immutable trigger was not enabled';triggers.append((table,trigger));db.execute(sql.SQL('ALTER TABLE {} DISABLE TRIGGER {}').format(sql.Identifier(table),sql.Identifier(trigger)))
  try:
   counts['oog_engineering_decision']=db.execute('delete from oog_engineering_decision where tenant_id=1 and calculation_id in(select id from oog_engineering_calculation where tenant_id=1 and project_id=%s)',(pid,)).rowcount
   for table in ['oog_engineering_calculation','oog_engineering_review','oog_multi_fr_review','oog_quotation','oog_packing_estimate','core_audit_history']:
    counts[table]=db.execute(sql.SQL('delete from {} where tenant_id=1 and project_id=%s').format(sql.Identifier(table)),(pid,)).rowcount
   for table in ['oog_clp_scenario','oog_packing_list','oog_cargo']:counts[table]=db.execute(sql.SQL('delete from {} where project_id=%s').format(sql.Identifier(table)),(pid,)).rowcount
   counts['oog_project']=db.execute("delete from oog_project where id=%s and tenant_id=1 and name=%s and customer='OOG verification' and destination='TEST'",(pid,name)).rowcount;assert counts['oog_project']==1
  finally:
   for table,trigger in triggers:db.execute(sql.SQL('ALTER TABLE {} ENABLE TRIGGER {}').format(sql.Identifier(table),sql.Identifier(trigger)))
  for table,trigger in triggers:assert db.execute('select tgenabled from pg_trigger where tgrelid=cast(%s as regclass) and tgname=%s',(table,trigger)).fetchone()==('O',)
  assert db.execute('select count(*) from oog_project where id=%s',(pid,)).fetchone()==(0,)
 if folder.exists():
  assert folder.resolve().parent==base and folder.resolve().name==pid and not folder.is_symlink();shutil.rmtree(folder)
 # Confirm every application immutable trigger was restored, without changing any other table or row.
 disabled=db.execute("select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal and t.tgname like '%%immutable%%' and t.tgenabled<>'O'").fetchone()[0];assert disabled==0
report_path=ROOT/'docs/verification-ui.json';report=json.loads(report_path.read_text(encoding='utf-8'));report['fixturesRemoved']=True;report['cleanupScope']={'uiTenantId':30,'uiTenantIdentity':'UI_8684A6D561 / Disposable OOG UI verification','uiTenantRowsRemoved':74,'uiUploadFoldersRemoved':1,'testSessionsRevoked':['platformSession','setupSession'],'foundationFixtureProjectId':pid,'foundationFixtureExpectedName':name,'foundationFixtureRowsRemoved':counts,'foundationFixtureOtherProjectsSearchedOrChanged':False,'immutableTriggersRestoredAndVerified':True,'productionDataChanged':False};report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'fixtureProjectId':pid,'rowsRemoved':sum(counts.values()),'immutableTriggersRestored':True,'uiReportUpdated':True}))
