from pathlib import Path
path=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx'
text=path.read_text(encoding='utf-8')
def replace(old,new):
    global text
    if old not in text:raise RuntimeError('Core UI anchor missing: '+old[:90])
    text=text.replace(old,new,1)
replace('useEffect, useState','useEffect, useState, useRef')
replace("import {PlanEditor} from './PlanEditor';", "import {PlanEditor} from './PlanEditor';\nimport {CorePanel} from './CorePanel';")
replace('function App(){', "type Permission={key:string;canView:boolean;canCreate:boolean;canEdit:boolean;canDelete:boolean;canExport:boolean};\n type Identity={username:string;role:string;tenantId:number;userId:number;menus:Permission[]};\n type Tokens={accessToken:string;refreshToken:string;expiresIn:number};\n function App(){")
replace("const [auth,setAuth]=useState('');", "const [username,setUsername]=useState('admin');const [tenantCode,setTenantCode]=useState('OOG');const [identity,setIdentity]=useState<Identity>();const refreshToken=useRef('');const refreshing=useRef<Promise<string>|null>(null);\n const [auth,setAuth]=useState('');")
replace("const response=await fetch('/api'+path,{...options,headers:{Authorization:'Basic '+token,", "let response=await fetch('/api'+path,{...options,headers:{...(token?{Authorization:'Bearer '+token}:{}),")
replace("   if(!response.ok){let text=", """   if(response.status===401&&token&&refreshToken.current&&!path.startsWith('/auth/')){
     if(!refreshing.current)refreshing.current=fetch('/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:refreshToken.current})}).then(async r=>{if(!r.ok)throw new Error('세션이 만료되었습니다. 다시 로그인하세요.');const body=await r.json();const next=body.data as Tokens;refreshToken.current=next.refreshToken;setAuth(next.accessToken);return next.accessToken;}).finally(()=>{refreshing.current=null;});
     try{const next=await refreshing.current;response=await fetch('/api'+path,{...options,headers:{Authorization:'Bearer '+next,...(!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}});}catch(e){refreshToken.current='';setAuth('');throw e;}
   }
   if(!response.ok){let text=""")
old="async function login(){await run(async()=>{const token=btoa('admin:'+password);await api('/me',{},token);setAuth(token);setPassword('');await loadProjects(token);const data=await api<{equipment:Equipment[];rules:Rule[]}>('/equipment',{},token);setEquipment(data.equipment);setRules(data.rules);});}"
new="""async function login(){await run(async()=>{const tokens=await api<Tokens>('/auth/login',{method:'POST',body:JSON.stringify({tenantCode,username,password})},'');const me=await api<Identity>('/me',{},tokens.accessToken);setIdentity(me);refreshToken.current=tokens.refreshToken;setAuth(tokens.accessToken);setPassword('');if(me.menus.some(m=>m.key==='PROJECT'&&m.canView))await loadProjects(tokens.accessToken);if(me.menus.some(m=>m.key==='MASTER'&&m.canView)){const data=await api<{equipment:Equipment[];rules:Rule[]}>('/equipment',{},tokens.accessToken);setEquipment(data.equipment);setRules(data.rules);}setTab('dashboard');});}
 function can(key:string,action:keyof Permission='canView'){return Boolean(identity?.menus.find(m=>m.key===key)?.[action]);}
 async function logout(){try{await api('/auth/logout',{method:'POST'});}finally{refreshToken.current='';setAuth('');setIdentity(undefined);setProject(undefined);setAnalysis([]);setProjects([]);setPlan(undefined);}}
"""
replace(old,new)
text=text.replace("Authorization:'Basic '+auth", "Authorization:'Bearer '+auth")
replace('<Form.Item label="계정"><Input value="admin" readOnly/></Form.Item>', '<Form.Item label="회사 코드"><Input value={tenantCode} onChange={e=>setTenantCode(e.target.value)} autoComplete="organization"/></Form.Item><Form.Item label="계정"><Input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username"/></Form.Item>')
replace("{key:'help',label:'업무 안내 · 개발현황'}]", "{key:'core',icon:<SettingOutlined/>,label:'회사 · 사용자 · 권한'},{key:'help',label:'업무 안내 · 개발현황'}].filter(m=>m.key==='core'?['ADMIN','SUPER_ADMIN'].includes(identity?.role||''):m.key==='dashboard'||m.key==='help'||can(({projects:'PROJECT',packing:'PACKING',analysis:'ANALYSIS',planning:'PLANNING',master:'MASTER',history:'HISTORY'} as Record<string,string>)[m.key]))")
replace('history:\'원본 · 계획 · 감사 이력\',help:', 'history:\'원본 · 계획 · 감사 이력\',core:\'회사 · 사용자 · 권한\',help:')
replace("<Button onClick={()=>{setAuth('');setProject(undefined);setAnalysis([]);}}>로그아웃</Button>", "<Tag>{identity?.username} · 회사 {identity?.tenantId} · {identity?.role}</Tag><Button onClick={()=>void run(logout)}>로그아웃</Button>")
replace('<Button icon={<PlusOutlined/>} type="primary" onClick={()=>setNewProject(true)}>', '<Button icon={<PlusOutlined/>} type="primary" disabled={!can("PROJECT","canCreate")} onClick={()=>setNewProject(true)}>')
replace('onClick={()=>setNewCargo(true)}>화물 직접 입력', 'disabled={!can("PACKING","canCreate")} onClick={()=>setNewCargo(true)}>화물 직접 입력')
replace('<Button danger size="small" onClick=', '<Button danger size="small" disabled={!can("PACKING","canDelete")} onClick=')
replace('<Button type="primary" onClick={()=>run(async()=>{const body=new FormData();', '<Button type="primary" disabled={!can("PACKING","canCreate")} onClick={()=>run(async()=>{const body=new FormData();')
replace('icon={<DownloadOutlined/>} onClick={download}', 'icon={<DownloadOutlined/>} disabled={!can("ANALYSIS","canExport")} onClick={download}')
replace('disabled={!plan} onClick=', 'disabled={!plan||!can("PLANNING","canExport")} onClick=')
replace('disabled={!analysis.length} onClick=', 'disabled={!analysis.length||!can("PLANNING","canCreate")} onClick=')
replace("render:(_:unknown,a:Assignment)=><PlanEditor", "render:(_:unknown,a:Assignment)=>can('PLANNING','canEdit')?<PlanEditor")
replace("msg.success('검증 후 새 계획 사본 저장 완료');}}/>}", "msg.success('검증 후 새 계획 사본 저장 완료');}}/>:<Tag>{a.locked?'잠금':'조회 전용'}</Tag>}")
replace(" {tab==='history'&&", " {tab==='core'&&<CorePanel api={api} roleCode={identity?.role||''}/>}\n {tab==='history'&&")
replace('FMS 인증/권한 이식, OR-Tools, 견적, 규칙 다중 버전, 회사별 권한', 'OR-Tools, 견적, 규칙 다중 버전, 추가 회사 설정')
replace('· 원본/감사 이력', '· 원본/감사 이력 · DB 사용자/JWT/회사/메뉴 권한')
path.write_text(text,encoding='utf-8')
print('Connected database identity and JWT UI contracts')
