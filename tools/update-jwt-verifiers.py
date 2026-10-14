from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name in ['verify-foundation.py','verify-parallel.py']:
    path=root/'tools'/name;text=path.read_text(encoding='utf-8')
    if "'Authorization']='Bearer '" in text:continue
    if name=='verify-foundation.py':
        text=text.replace("token=base64.b64encode(('admin:'+config['OOG_ADMIN_PASSWORD']).encode()).decode()","token=''")
        text=text.replace("headers['Authorization']='Basic '+token","headers['Authorization']='Bearer '+token")
        text=text.replace("if request('/me')[0]==200:break", "status,login=request('/auth/login','POST',{'tenantCode':'OOG','username':'admin','password':config['OOG_ADMIN_PASSWORD']},authorized=False)\n        if status==200:\n            token=login['accessToken'];break")
        text=text.replace("migration==('2',True)","migration==('3',True)").replace('Flyway V2 applied','Flyway V3 applied').replace('len(tables)==7','len(tables)==14').replace("'migration':'V2'","'migration':'V3'")
    else:
        text=text.replace("token=base64.b64encode(('admin:'+config['OOG_ADMIN_PASSWORD']).encode()).decode()","token=''")
        text=text.replace("headers['Authorization']='Basic '+token","headers['Authorization']='Bearer '+token")
        text=text.replace("if request('/me')[0]==200:break", "status,login=request('/auth/login','POST',{'tenantCode':'OOG','username':'admin','password':config['OOG_ADMIN_PASSWORD']},auth=False)\n        if status==200:\n            token=login['accessToken'];break")
        text=text.replace("'migration':'V2'","'migration':'V3'")
    # Revoke only the test's access session, without logging out other sessions of the same admin.
    anchor="report={'date'" if name=='verify-parallel.py' else "from xml.etree import ElementTree as ET"
    cleanup="""with psycopg.connect(host=DBHOST,port=DBPORT,dbname='oog',user=config['DB_USERNAME'],password=config['DB_PASSWORD'],connect_timeout=10) as cleanup_db:
    claims=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))
    cleanup_db.execute('update core_session set revoked_at=GREATEST(now(),created_at) where access_jti=%s',(claims['jti'],))
""".replace('DBHOST','url.hostname' if name=='verify-foundation.py' else 'db_url.hostname').replace('DBPORT','url.port' if name=='verify-foundation.py' else 'db_url.port')
    text=text.replace(anchor,cleanup+anchor,1)
    path.write_text(text,encoding='utf-8')
print('Existing API verifiers now authenticate through the OOG DB/JWT login')
