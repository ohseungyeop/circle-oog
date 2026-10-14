from pathlib import Path
path=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx'
text=path.read_text(encoding='utf-8')
def replace(old,new):
    global text
    if old not in text:raise RuntimeError('Session UI anchor missing '+old[:80])
    text=text.replace(old,new,1)
replace("const [project,setProject]=useState<Project>();", "const [project,setProject]=useState<Project>();const currentProjectId=useRef<string|undefined>(undefined);currentProjectId.current=project?.id;")
clear="refreshToken.current='';accessToken.current='';setAuth('');setIdentity(undefined);setProject(undefined);setAnalysis([]);setProjects([]);setPlan(undefined);setDetail(undefined);setFile(undefined);setPreview(undefined);setMapping({});setImportErrors([]);"
replace("refreshToken.current='';setAuth('');throw e;", clear+"throw e;")
replace("finally{refreshToken.current='';accessToken.current='';setAuth('');setIdentity(undefined);setProject(undefined);setAnalysis([]);setProjects([]);setPlan(undefined);}", "finally{"+clear+"}")
replace("async function refresh(id:string){const data=await api<Analysis[]>('/projects/'+id+'/analysis');setAnalysis(data);}", "async function refresh(id:string){const session=accessToken.current;const data=await api<Analysis[]>('/projects/'+id+'/analysis');if(session===accessToken.current&&currentProjectId.current===id)setAnalysis(data);}")
old="useEffect(()=>{if(project&&auth)void run(async()=>{await refresh(project.id);const history=await api<{id:string;result:{value?:string}|string}[]>('/projects/'+project.id+'/plans');if(history.length){const result=typeof history[0].result==='string'?JSON.parse(history[0].result):JSON.parse(history[0].result.value||'{}');setPlan({id:history[0].id,result});}else setPlan(undefined);});},[project?.id,auth]);"
new="""useEffect(()=>{if(!project||!auth)return;const abort=new AbortController();setBusy(true);setError('');void(async()=>{const items=await api<Analysis[]>('/projects/'+project.id+'/analysis',{signal:abort.signal});if(abort.signal.aborted)return;setAnalysis(items);const history=await api<{id:string;result:{value?:string}|string}[]>('/projects/'+project.id+'/plans',{signal:abort.signal});if(abort.signal.aborted)return;if(history.length){const result=typeof history[0].result==='string'?JSON.parse(history[0].result):JSON.parse(history[0].result.value||'{}');setPlan({id:history[0].id,result});}else setPlan(undefined);})().catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'조회 실패');}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});return()=>abort.abort();},[project?.id,auth]);"""
replace(old,new)
path.write_text(text,encoding='utf-8')
print('Cleared tenant data at session end and cancelled stale project reads')
