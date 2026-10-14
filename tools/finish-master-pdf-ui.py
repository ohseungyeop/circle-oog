from pathlib import Path
p=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx'
s=p.read_text(encoding='utf-8')
s=s.replace("'/projects/'+project.id+'/export','oog-analysis.xlsx'", "'/projects/'+project.id+'/export'+ruleQuery,'oog-analysis.xlsx'")
s=s.replace("setImportErrors([]);throw e;", "setImportErrors([]);setSelection(v=>({...v,carrier:'DEFAULT',allowDefaultFallback:true}));setEquipment([]);setRules([]);throw e;")
s=s.replace("setMapping({});setImportErrors([]);}}", "setMapping({});setImportErrors([]);setSelection(v=>({...v,carrier:'DEFAULT',allowDefaultFallback:true}));setEquipment([]);setRules([]);}}")
s=s.replace("{tab==='analysis'&&project&&<><Alert", "{tab==='analysis'&&project&&<><p>분석 규칙: {selection.carrier} · {selection.effectiveDate} · {selection.allowDefaultFallback?'미일치 장비는 DEFAULT 적용':'모든 장비의 선사 규칙 필요'} (장비·규칙 메뉴에서 선택)</p><Alert")
s=s.replace('<Alert type="warning" message="PRE-PLAN · 사전 검토용 계획"', '<p>새 계획 적용 규칙: {selection.carrier} · {selection.effectiveDate}. 저장된 계획은 당시 규칙을 유지합니다.</p><Alert type="warning" message="PRE-PLAN · 사전 검토용 계획"')
p.write_text(s,encoding='utf-8')
print('Selected analysis export, context, and tenant logout state aligned')
