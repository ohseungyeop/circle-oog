from pathlib import Path
p=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('Alert, Button, Card, ConfigProvider','Alert, Button, Card, Checkbox, ConfigProvider')
s=s.replace("import {CorePanel} from './CorePanel';", "import {CorePanel} from './CorePanel';\nimport {AutomationQuotePanel} from './AutomationQuotePanel';\nimport {MultiFrPanel} from './MultiFrPanel';\nimport {EngineeringReviewPanel} from './EngineeringReviewPanel';\nimport ImportDetectionSummary from './ImportDetectionSummary';\nimport type {ImportDetection,ImportCandidate} from './ImportDetectionSummary';")
s=s.replace(" const [headerRows,setHeaderRows]", " const [importMode,setImportMode]=useState('AUTO');const [detection,setDetection]=useState<ImportDetection>();const [detectedId,setDetectedId]=useState<string>();const [importConfirmed,setImportConfirmed]=useState(false);const fileGeneration=useRef(0);\n const [autoClp,setAutoClp]=useState(true);const [scenarioMode,setScenarioMode]=useState('AUTO');\n const [headerRows,setHeaderRows]")
anchor=' async function getPreview()'
functions='''
 async function applyCandidate(candidate:ImportCandidate,chosen=file,generation=fileGeneration.current){
   if(!chosen)return;setSheet(candidate.sheet);setHeader(candidate.header);setHeaderRows(candidate.headerRows);setDetectedId(candidate.id);setImportConfirmed(false);
   if(candidate.lengthUnit)setLengthUnit(candidate.lengthUnit);if(candidate.weightUnit)setWeightUnit(candidate.weightUnit);if(candidate.weightBasis)setWeightBasis(candidate.weightBasis);
   const body=new FormData();body.append('file',chosen);body.append('sheet',String(candidate.sheet));body.append('header',String(candidate.header));body.append('headerRows',String(candidate.headerRows));
   const value=await api<typeof preview>('/imports/preview',{method:'POST',body});if(generation!==fileGeneration.current)return;setPreview(value);setMapping(candidate.suggestedMapping);
 }
 async function chooseFile(chosen?:File){const generation=++fileGeneration.current;setFile(chosen);setPreview(undefined);setDetection(undefined);setDetectedId(undefined);setImportErrors([]);setImportConfirmed(false);if(!chosen||importMode!=='AUTO')return;
   await run(async()=>{const body=new FormData();body.append('file',chosen);const value=await api<ImportDetection>('/imports/detect',{method:'POST',body});if(generation!==fileGeneration.current)return;setDetection(value);if(value.autoSelectable){const candidate=value.candidates.find(c=>c.id===value.recommendedCandidateId);if(candidate)await applyCandidate(candidate,chosen,generation);}});
 }
 async function proposePlan(id:string){if(!autoClp||!can('PLANNING','canCreate'))return;try{const value=await api<Plan>('/projects/'+id+'/plans'+ruleQuery,{method:'POST'});if(currentProjectId.current===id){setPlan(value);setScenarioMode('AUTO');}msg.success('화물 검증 후 자동 CLP를 생성했습니다. 수동 선택·이동·잠금으로 조정할 수 있습니다.');}catch(e){msg.warning('화물은 저장했습니다. 자동 계획 생성은 완료하지 못했습니다: '+String(e));}}
 useEffect(()=>{if(scenarioMode!=='AUTO'||!plan?.result.scenarios.length)return;const values=plan.result.scenarios;let best=0;for(let i=1;i<values.length;i++)if(values[i].unassigned.length<values[best].unassigned.length||values[i].unassigned.length===values[best].unassigned.length&&values[i].equipmentCount<values[best].equipmentCount)best=i;setScenario(best);},[plan?.id,scenarioMode]);
 const quotePermissions={settingsView:can('MASTER'),settingsCreate:can('MASTER','canCreate'),estimateView:can('PACKING'),estimateCreate:can('PACKING','canCreate'),quoteView:can('PROJECT'),quoteCreate:can('PROJECT','canCreate')};
'''
assert anchor in s;s=s.replace(anchor,functions+anchor)
s=s.replace("async function getPreview(){if(!file)return;await run(async()=>{", "async function getPreview(){if(!file)return;const generation=fileGeneration.current;setImportConfirmed(false);await run(async()=>{")
s=s.replace('setPreview(data);setMapping(data?.suggestedMapping||{});setImportErrors([]);', 'if(generation!==fileGeneration.current)return;setPreview(data);setMapping(data?.suggestedMapping||{});setImportErrors([]);')
s=s.replace('onChange={e=>{setFile(e.target.files?.[0]);setPreview(undefined);setImportErrors([]);}}', 'onChange={e=>void chooseFile(e.target.files?.[0])}')
s=s.replace('<Space wrap><input type="file"', '<Space wrap><Select aria-label="가져오기 설정 방식" value={importMode} options={[{value:"AUTO",label:"자동 탐지 기본"},{value:"MANUAL",label:"수동 설정"}]} onChange={setImportMode}/><input type="file"')
s=s.replace('setPreview(undefined);}} addonBefore=', 'setPreview(undefined);setImportMode("MANUAL");setDetectedId(undefined);setImportConfirmed(false);}} addonBefore=')
s=s.replace('setHeaderRows(v);setPreview(undefined);', 'setHeaderRows(v);setPreview(undefined);setImportMode("MANUAL");setDetectedId(undefined);setImportConfirmed(false);')
s=s.replace('{preview&&<>', '{detection&&<ImportDetectionSummary detection={detection} selectedId={detectedId} onSelect={candidate=>void run(()=>applyCandidate(candidate))}/>} {preview&&<>')
s=s.replace('onChange={v=>setMapping({...mapping,[key]:v})}', 'onChange={v=>{setMapping({...mapping,[key]:v});setImportConfirmed(false);}}')
s=s.replace('onChange={setLengthUnit}', 'onChange={v=>{setLengthUnit(v);setImportConfirmed(false);}}').replace('onChange={setWeightUnit}', 'onChange={v=>{setWeightUnit(v);setImportConfirmed(false);}}').replace('onChange={setWeightBasis}', 'onChange={v=>{setWeightBasis(v);setImportConfirmed(false);}}')
s=s.replace('<Button type="primary" disabled={!can("PACKING","canCreate")}', '<Checkbox checked={importConfirmed} onChange={e=>setImportConfirmed(e.target.checked)}>매핑·단위·개당/행합계 중량 확인</Checkbox><Button type="primary" disabled={!can("PACKING","canCreate")||!importConfirmed}')
s=s.replace('await refresh(project.id);setPlan(undefined);', 'await refresh(project.id);setPlan(undefined);await proposePlan(project.id);')
s=s.replace('await refresh(project!.id);setNewCargo(false);', 'await refresh(project!.id);await proposePlan(project!.id);setNewCargo(false);')
s=s.replace('setPlan(revision);msg.success', 'setPlan(revision);setScenarioMode("MANUAL");msg.success')
s=s.replace("onChange={v=>setScenario(Number(v))}", "onChange={v=>{setScenario(Number(v));setScenarioMode('MANUAL');}}")
s=s.replace("setPlan(p);setScenario(0);", "setPlan(p);setScenarioMode('AUTO');setScenario(0);")
s=s.replace('<Card title="시나리오 비교"', '<Space wrap style={{marginBottom:12}}><Checkbox checked={autoClp} onChange={e=>setAutoClp(e.target.checked)}>화물 저장 후 자동 CLP 생성</Checkbox><Select aria-label="시나리오 선택 방식" value={scenarioMode} options={[{value:"AUTO",label:"자동 추천: 미배정 최소 → 장비 대수"},{value:"MANUAL",label:"수동 시나리오 선택"}]} onChange={setScenarioMode}/></Space><Card title="시나리오 비교"')
s=s.replace(" {tab==='master'&&<CarrierRulesPanel", " {tab==='packing'&&project&&<AutomationQuotePanel api={api} projectId={project.id} section='packing' permissions={quotePermissions}/>}\n {tab==='projects'&&project&&<AutomationQuotePanel api={api} projectId={project.id} section='quote' permissions={quotePermissions}/>}\n {tab==='planning'&&project&&<><MultiFrPanel key={project.id} api={api} projectId={project.id} cargos={analysis.map(a=>a.cargo)} canCreate={can('PLANNING','canCreate')} selection={selection}/>{plan&&<EngineeringReviewPanel key={plan.id} api={api} projectId={project.id} planId={plan.id} canRecord={can('PLANNING','canEdit')&&['ENGINEER','ADMIN','SUPER_ADMIN'].includes(identity?.role||'')}/>}</>}\n {tab==='master'&&<AutomationQuotePanel api={api} section='settings' permissions={quotePermissions}/>}\n {tab==='master'&&<CarrierRulesPanel")
s=s.replace('setImportErrors([]);setSelection(v=>', 'setImportErrors([]);fileGeneration.current++;setDetection(undefined);setDetectedId(undefined);setImportConfirmed(false);setSelection(v=>')
s=s.replace('OR-Tools, 견적, Multi-FR, 공학 검토, 추가 회사 설정', 'OR-Tools, 물리 공학 계산, 추가 회사 설정').replace('Multi-FR, 하중·CoG·라싱 계산과 승인 미구현.', 'Multi-FR은 자동/수동 후보 검토를 지원합니다. 하중·CoG·라싱 물리 계산과 승인은 미구현입니다.')
p.write_text(s,encoding='utf-8');print('Automatic defaults, manual overrides, quotation, Multi-FR, and review panels connected')
