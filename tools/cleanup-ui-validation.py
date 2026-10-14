"""Remove only the explicitly identified disposable UI company; list foundation candidates read-only."""
import json,shutil,uuid
from pathlib import Path
from urllib.parse import urlparse
import psycopg
from psycopg import sql
ROOT=Path(__file__).resolve().parents[1];META=ROOT/'.runtime/ui-validation.json'
meta=json.loads(META.read_text(encoding='utf-8'));EXPECTED=(30,'UI_8684A6D561','Disposable OOG UI verification')
assert meta['tenantId']==EXPECTED[0] and meta['tenantCode']==EXPECTED[1],'UI fixture metadata identity mismatch'
cfg=dict(line.split('=',1) for line in(ROOT/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line);url=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert url.path=='/oog'
counts={};targets=[]
with psycopg.connect(host=url.hostname,port=url.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'],connect_timeout=10)as db:
 with db.transaction():
  db.execute("set local lock_timeout='10s'");db.execute("set local statement_timeout='45s'")
  tenant=db.execute('select tenant_id,tenant_code,tenant_name from core_tenant where tenant_id=%s for update',(EXPECTED[0],)).fetchone()
  if tenant is None:
   assert meta.get('cleanedup') is True,'UI company missing before confirmed cleanup'
  else:
   assert tuple(tenant)==EXPECTED,'UI company identity mismatch'
   project_ids=[str(r[0])for r in db.execute('select id from oog_project where tenant_id=%s for update',(EXPECTED[0],))]
   base=(ROOT/'data/projects').resolve()
   for pid in project_ids:
    assert str(uuid.UUID(pid))==pid
    folder=ROOT/'data/projects'/pid
    if folder.exists():
     resolved=folder.resolve();assert resolved.parent==base and resolved.name==pid and not folder.is_symlink(),'Upload folder scope mismatch'
     targets.append(folder)
   for key,tenant_id in [('platformSession',1),('setupSession',EXPECTED[0])]:
    jti=str(uuid.UUID(meta[key]));row=db.execute('select tenant_id from core_session where access_jti=%s',(jti,)).fetchone()
    assert row is None or row[0]==tenant_id,'Test session identity mismatch'
    db.execute('update core_session set revoked_at=GREATEST(now(),created_at) where access_jti=%s and tenant_id=%s',(jti,tenant_id))
   tenant_tables=['oog_engineering_decision','oog_engineering_calculation','oog_engineering_review','oog_multi_fr_review','oog_quotation','oog_packing_estimate','oog_import_template','oog_carrier_rule_version','oog_equipment_rate','oog_packing_rule','core_audit_history']
   project_tables=['oog_clp_scenario','oog_packing_list','oog_cargo']
   core_tables=['core_login_history','core_session','core_user_account','core_role_menu','core_menu','core_role']
   all_tables=tenant_tables+project_tables+['oog_project']+core_tables+['core_tenant']
   # Lock before disabling immutable triggers. Transaction rollback restores their enabled state on failure.
   db.execute(sql.SQL('LOCK TABLE {} IN ACCESS EXCLUSIVE MODE').format(sql.SQL(',').join(map(sql.Identifier,sorted(all_tables)))))
   triggers=[]
   for table in tenant_tables:
    for name, in db.execute("select tgname from pg_trigger where tgrelid=cast(%s as regclass) and not tgisinternal and tgname like '%%immutable%%'",(table,)):
     triggers.append((table,name));db.execute(sql.SQL('ALTER TABLE {} DISABLE TRIGGER {}').format(sql.Identifier(table),sql.Identifier(name)))
   try:
    for table in tenant_tables:counts[table]=db.execute(sql.SQL('DELETE FROM {} WHERE tenant_id=%s').format(sql.Identifier(table)),(EXPECTED[0],)).rowcount
    for table in project_tables:counts[table]=db.execute(sql.SQL('DELETE FROM {} WHERE project_id IN(SELECT id FROM oog_project WHERE tenant_id=%s)').format(sql.Identifier(table)),(EXPECTED[0],)).rowcount
    counts['oog_project']=db.execute('delete from oog_project where tenant_id=%s',(EXPECTED[0],)).rowcount
    for table in core_tables:counts[table]=db.execute(sql.SQL('DELETE FROM {} WHERE tenant_id=%s').format(sql.Identifier(table)),(EXPECTED[0],)).rowcount
    counts['core_tenant']=db.execute('delete from core_tenant where tenant_id=%s and tenant_code=%s and tenant_name=%s',EXPECTED).rowcount
    assert counts['core_tenant']==1
   finally:
    for table,name in triggers:db.execute(sql.SQL('ALTER TABLE {} ENABLE TRIGGER {}').format(sql.Identifier(table),sql.Identifier(name)))
  orphans=db.execute("""select id,name,created_at from oog_project where tenant_id=1 and customer='OOG verification' and destination='TEST' and name ~ '^VERIFY-[0-9a-f]{32}$' and (created_at at time zone 'Asia/Seoul')::date=date '2026-10-14' order by created_at""").fetchall()
for folder in targets:
 base=(ROOT/'data/projects').resolve();assert folder.resolve().parent==base and folder.resolve().name==folder.name and not folder.is_symlink()
 shutil.rmtree(folder)
meta['cleanedup']=True;meta['cleanupCounts']=counts;meta['uploadFoldersRemoved']=len(targets);meta['foundationOrphansReadOnly']=[{'id':str(r[0]),'name':r[1],'createdAt':r[2].isoformat()}for r in orphans];META.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cleanedup':True,'tenantId':EXPECTED[0],'rowsRemoved':sum(counts.values()),'uploadFoldersRemoved':len(targets),'foundationCandidatesReadOnly':meta['foundationOrphansReadOnly']},ensure_ascii=False))
