from pathlib import Path
path=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx'
text=path.read_text(encoding='utf-8')
def replace(old,new):
    global text
    if old not in text:raise RuntimeError('UI anchor missing '+old[:70])
    text=text.replace(old,new,1)
replace("const refreshToken=useRef('');", "const accessToken=useRef('');const refreshToken=useRef('');")
replace("refreshToken.current=next.refreshToken;setAuth(next.accessToken);", "refreshToken.current=next.refreshToken;accessToken.current=next.accessToken;setAuth(next.accessToken);")
replace("refreshToken.current=tokens.refreshToken;setAuth(tokens.accessToken);", "refreshToken.current=tokens.refreshToken;accessToken.current=tokens.accessToken;setAuth(tokens.accessToken);")
replace("finally{refreshToken.current='';setAuth('');", "finally{refreshToken.current='';accessToken.current='';setAuth('');")
old="async function download(){if(!project)return;await run(async()=>{const response=await fetch('/api/projects/'+project.id+'/export',{headers:{Authorization:'Bearer '+auth}});if(!response.ok)throw new Error('Excel 출력 실패');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download='oog-analysis.xlsx';a.click();URL.revokeObjectURL(url);});}"
replace(old,"async function download(){if(!project)return;await run(async()=>{await downloadFile('/projects/'+project.id+'/export','oog-analysis.xlsx');});}")
replace("async function downloadFile(path:string,name:string){const response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+auth}});", "async function downloadFile(path:string,name:string){let response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+accessToken.current}});if(response.status===401){await api('/me');response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+accessToken.current}});}")
replace("<DevelopmentStatusPanel api={api} compact/>", "{can('DEVELOPMENT')&&<DevelopmentStatusPanel api={api} compact/>}")
replace("{tab==='help'&&<DevelopmentStatusPanel api={api}/>}" , "{tab==='help'&&can('DEVELOPMENT')&&<DevelopmentStatusPanel api={api}/>}")
replace('<RuleEditor key=', '<RuleEditor disabled={identity?.role!=="SUPER_ADMIN"||identity?.tenantId!==1||!can("MASTER","canEdit")} key=')
replace("function RuleEditor({rule,save}:{rule:Rule;save:", "function RuleEditor({rule,save,disabled=false}:{rule:Rule;disabled?:boolean;save:")
replace('<Button onClick={()=>save(value)}>저장</Button>', '<Button disabled={disabled} onClick={()=>save(value)}>저장</Button>')
path.write_text(text,encoding='utf-8')
print('Connected permission controls and token renewal for exports')
