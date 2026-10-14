from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'frontend/src/main.tsx';s=p.read_text(encoding='utf-8').replace("quoteCreate:can('PROJECT','canCreate')", "quoteCreate:can('PROJECT','canCreate'),planView:can('PLANNING')");p.write_text(s,encoding='utf-8')
p=root/'tools/verify-core.py';s=p.read_text(encoding='utf-8');s=s.replace("('CLP Excel','plans/'+planid+'/export')", "('CLP Excel','plans/'+planid+'/export'),('engineering review','plans/'+planid+'/engineering')");anchor="        check('customer cannot create project'";idx=s.index(anchor);s=s[:idx]+"        check('planner cannot record engineering review',request('/projects/'+pid+'/plans/'+planid+'/engineering','POST',{'observations':{},'reason':'must be denied'},writer['accessToken'])[0]==403)\n"+s[idx:];p.write_text(s,encoding='utf-8')
print('Engineering tenant and role denial included; plan query permission propagated')
