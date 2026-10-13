from pathlib import Path

path=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx'
text=path.read_text(encoding='utf-8')
def replace(old,new):
    global text
    if old not in text:raise RuntimeError('UI integration anchor not found: '+old[:100])
    text=text.replace(old,new,1)

replace("import './style.css';", "import './style.css';\nimport {PlanEditor} from './PlanEditor';\nimport {ProjectHistory} from './ProjectHistory';\nimport type {Plan,Assignment,Box} from './planTypes';")
start=text.index('type Assignment=')
end=text.index('const fields=',start)
text=text[:start]+text[end:]
replace("['netWeight','개당 N/W']];", "['netWeight','N/W'],['originalLength','원 길이'],['originalWidth','원 폭'],['originalHeight','원 높이']];")
replace("['grossWeight','개당 G/W']", "['grossWeight','G/W']")
replace("rotationAllowed:boolean;estimated:boolean", "rotationAllowed:boolean;estimated:boolean;originalLength:number;originalWidth:number;originalHeight:number")
replace("const [sheet,setSheet]=useState(0);", "const [headerRows,setHeaderRows]=useState(1);const [weightBasis,setWeightBasis]=useState('PER_PIECE');\n const [sheet,setSheet]=useState(0);")
replace("rows:string[][];totalRows:number", "rows:string[][];totalRows:number;combinedHeaders?:string[];suggestedMapping?:Record<string,number>;suggestionsWarnings?:string[]")
replace("body.append('header',''+header);const data=await", "body.append('header',''+header);body.append('headerRows',''+headerRows);const data=await")
replace("setPreview(data);setMapping({});", "setPreview(data);setMapping(data?.suggestedMapping||{});")
anchor=" const active=plan?.result.scenarios?.[scenario];"
insert=""" async function downloadFile(path:string,name:string){const response=await fetch('/api'+path,{headers:{Authorization:'Basic '+auth}});if(!response.ok)throw new Error('다운로드 실패 ('+response.status+')');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
"""
replace(anchor,insert+anchor)
replace("{key:'help',label:'업무 안내 · 개발현황'}", "{key:'history',icon:<FolderOpenOutlined/>,label:'원본 · 계획 · 감사 이력'},{key:'help',label:'업무 안내 · 개발현황'}")
replace("master:'장비 제원 · 계획 규칙',help:", "master:'장비 제원 · 계획 규칙',history:'원본 · 계획 · 감사 이력',help:")
replace("['packing','analysis','planning'].includes(tab)", "['packing','analysis','planning','history'].includes(tab)")
replace('addonBefore="헤더 행 (0부터)"/><Button onClick={getPreview}', 'addonBefore="헤더 행 (0부터)"/><Select value={headerRows} onChange={v=>{setHeaderRows(v);setPreview(undefined);}} options={[{value:1,label:"헤더 1행"},{value:2,label:"헤더 2행"}]}/><Button onClick={getPreview}')
replace('<div className="mapping">{fields.map', '<Alert type="info" message="자동 매핑은 제안입니다. 원치수/포장치수·단위·중량 의미를 확인한 뒤 가져오세요." description={preview.suggestionsWarnings?.join(" / ")} showIcon/><div className="mapping">{fields.map')
replace("...preview.rows[0].map", "...(preview.combinedHeaders||preview.rows[0]).map")
replace("<Button type=\"primary\" onClick={()=>run(async()=>{const body=new FormData();", "<Select value={weightBasis} onChange={setWeightBasis} options={[{value:'PER_PIECE',label:'중량: 개당'},{value:'ROW_TOTAL',label:'중량: 행 합계 ÷ 수량'}]} style={{width:200}}/><Button type=\"primary\" onClick={()=>run(async()=>{const body=new FormData();")
replace("body.append('weightUnit',weightUnit);", "body.append('weightUnit',weightUnit);body.append('weightBasis',weightBasis);body.append('headerRows',''+headerRows);")
replace("preview.rows.slice(1).map", "preview.rows.slice(headerRows).map")
replace("columns={preview.rows[0].map", "columns={(preview.combinedHeaders||preview.rows[0]).map")
replace("<Button onClick={()=>window.print()}>계획 인쇄 / PDF</Button>", "<Button disabled={!plan} onClick={()=>run(async()=>{await downloadFile('/projects/'+project.id+'/plans/'+plan!.id+'/export','oog-clp.xlsx');})}>CLP Excel</Button><Button onClick={()=>window.print()}>계획 인쇄 / PDF</Button>")
replace("<div className=\"print-title\">{project.name}", "<p className=\"secondary\">계획 사본 {plan!.id}{plan!.sourcePlanId?' · 원본 '+plan!.sourcePlanId:''}. 현재 화물·규칙과 다를 수 있습니다.</p><div className=\"print-title\">{project.name}")
replace("`${a.length} × ${a.width} × ${a.height}`}]} />", "`${a.length} × ${a.width} × ${a.height}`},{title:'수동 개정',render:(_:unknown,a:Assignment)=><PlanEditor key={plan!.id+'-'+a.cargoId+'-'+a.piece} assignment={a} containerNumber={box.number} containers={active.containers} save={async change=>{const revision=await api<Plan>('/projects/'+project.id+'/plans/'+plan!.id+'/revisions',{method:'POST',body:JSON.stringify({scenarioIndex:scenario,changes:[change]})});setPlan(revision);msg.success('검증 후 새 계획 사본 저장 완료');}}/>}]} />")
replace(" {tab==='help'&&", " {tab==='history'&&project&&<ProjectHistory key={project.id} projectId={project.id} api={api} download={downloadFile} openPlan={saved=>{setPlan(saved);setScenario(0);setTab('planning');}}/>}\n {tab==='help'&&")
replace('FMS 인증/권한 이식, 수동 Move/Lock, OR-Tools, CLP Excel, 견적, 규칙 다중 버전, 회사별 권한', 'FMS 인증/권한 이식, OR-Tools, 견적, 규칙 다중 버전, 회사별 권한')
replace('보수적 자동배치 · 2D · Excel 출력', '보수적 자동배치 · 수동 이동/잠금 · 2D · CLP Excel · 원본/감사 이력')
replace("['netWeight','개당 N/W']].map", "['netWeight','개당 N/W'],['originalLength','원 길이 (선택)'],['originalWidth','원 폭 (선택)'],['originalHeight','원 높이 (선택)']].map")
replace("rules={[{required:true}]}><InputNumber min={k==='netWeight'?0:1}", "rules={[{required:!k.startsWith('original')}]}><InputNumber min={k==='netWeight'||k.startsWith('original')?0:1}")
replace("<p>총 CBM {detail.cbm.toFixed(4)}", "<p>원치수 {detail.cargo.originalLength||'미입력'} × {detail.cargo.originalWidth||'미입력'} × {detail.cargo.originalHeight||'미입력'} mm</p><p>총 CBM {detail.cbm.toFixed(4)}")
path.write_text(text,encoding='utf-8')
print('Parallel UI contracts connected')
