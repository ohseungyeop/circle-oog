"""Recover only the two fixture tenants from the failed first expanded verifier cleanup."""
from pathlib import Path
from urllib.parse import urlparse
import json,re
import psycopg
root=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1)for line in(root/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line)
u=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert u.path=='/oog'
with psycopg.connect(host=u.hostname,port=u.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'])as db:
 rows=db.execute('select tenant_id,tenant_code,tenant_name from core_tenant where tenant_id in(47,48) order by tenant_id').fetchall()
 if rows:
  assert len(rows)==2 and rows[0][0]==47 and rows[1][0]==48
  assert [r[2]for r in rows]==['VERIFY-EXPANDED-A','VERIFY-EXPANDED-B'] and all(re.fullmatch('EXP_[A-F0-9]{12}',r[1])for r in rows)
  for tenant,_,_ in rows:assert db.execute("select count(*) from core_user_account where tenant_id=%s and username='author'",(tenant,)).fetchone()[0]==1
  ids=[47,48]
  for table,trigger in [('oog_engineering_decision','oog_engineering_decision_immutable'),('oog_engineering_calculation','oog_engineering_calculation_immutable')]:
   db.execute('LOCK TABLE '+table+' IN ACCESS EXCLUSIVE MODE');db.execute('ALTER TABLE '+table+' DISABLE TRIGGER '+trigger);db.execute('delete from '+table+' where tenant_id=ANY(%s)',(ids,));db.execute('ALTER TABLE '+table+' ENABLE TRIGGER '+trigger)
  db.execute('delete from core_audit_history where tenant_id=ANY(%s)',(ids,))
  for table in ['oog_clp_scenario','oog_cargo']:db.execute('delete from '+table+' where project_id in(select id from oog_project where tenant_id=ANY(%s))',(ids,))
  db.execute('delete from oog_project where tenant_id=ANY(%s)',(ids,))
  for table in ['core_session','core_login_history','core_role_menu','core_menu','core_user_account','core_role']:db.execute('delete from '+table+' where tenant_id=ANY(%s)',(ids,))
  db.execute('delete from core_tenant where tenant_id=ANY(%s)',(ids,))
 assert db.execute("select count(*) from pg_trigger where not tgisinternal and tgname like '%immutable%' and tgenabled<>'O'").fetchone()[0]==0
print(json.dumps({'verifiedFixtureTenantIds':[47,48],'removedOrAlreadyAbsent':True,'immutableTriggersRestored':True}))
