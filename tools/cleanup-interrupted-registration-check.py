"""Clean only the exactly identified empty fixture from the interrupted DB connection."""
from pathlib import Path
from urllib.parse import urlparse
import psycopg
root=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1)for line in(root/'backend/.env').read_text(encoding='utf-8-sig').splitlines()if'='in line)
u=urlparse(cfg['DB_URL'].removeprefix('jdbc:'));assert u.path=='/oog'
with psycopg.connect(host=u.hostname,port=u.port,dbname='oog',user=cfg['DB_USERNAME'],password=cfg['DB_PASSWORD'])as db:
 rows=db.execute("select tenant_id,tenant_name from core_tenant where tenant_code='EC_789618B7DA11'").fetchall()
 for tid,name in rows:
  assert name in ('VERIFY-CALCULATION-A','VERIFY-CALCULATION-B')
  assert db.execute('select count(*) from oog_project where tenant_id=%s',(tid,)).fetchone()[0]==0
  assert db.execute("select count(*) from core_user_account where tenant_id=%s and username='author'",(tid,)).fetchone()[0]==1
  db.execute('delete from core_audit_history where tenant_id=%s',(tid,))
  for table in ['core_session','core_login_history','core_role_menu','core_menu','core_user_account','core_role']:
   db.execute('delete from '+table+' where tenant_id=%s',(tid,))
  db.execute('delete from core_tenant where tenant_id=%s',(tid,))
print('Interrupted empty fixture removed or already absent')
