from pathlib import Path
p=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('{detail.candidates.map(c=>', '{detail.ruleSelection&&<RuleSelectionDetails selection={detail.ruleSelection}/>} {detail.candidates.map(c=>')
s=s.replace('<div className="print-title">', '{plan!.result.ruleSelection&&<RuleSelectionDetails selection={plan!.result.ruleSelection}/>}<div className="print-title">')
s=s.replace("function RuleEditor(", "function RuleSelectionDetails({selection}:{selection:RuleSelection}){return <details style={{margin:'12px 0'}}><summary>적용 규칙: {selection.carrier} · {selection.effectiveDate} · 장비별 버전과 대체 여부</summary><Space wrap>{selection.versions.map(v=><Tag key={v.equipmentCode} color={v.usedFallback?'orange':'blue'}>{v.equipmentCode} · {v.carrier} v{v.version} {v.usedFallback?'DEFAULT 대체':''}</Tag>)}</Space></details>}\nfunction RuleEditor(")
p.write_text(s,encoding='utf-8');print('Analysis and saved plan show actual selected rule versions and fallback')
