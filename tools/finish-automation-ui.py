from pathlib import Path
p=Path(__file__).resolve().parents[1]/'frontend/src/main.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('<Card title="Excel 원본 확인"', '<p><Checkbox checked={autoClp} onChange={e=>setAutoClp(e.target.checked)}>화물 검증·저장 후 자동 분석과 CLP 생성</Checkbox> · 매핑과 단위 확인 후 저장합니다. 설정을 끄면 CLP에서 수동 생성할 수 있습니다.</p><Card title="Excel 원본 확인"')
s=s.replace('<AutomationQuotePanel api={api} projectId={project.id}', '<AutomationQuotePanel key={project.id+tab} api={api} projectId={project.id}')
s=s.replace("프로젝트 · Excel 매핑 · 검증 · OOG 판정", "프로젝트 · Excel 자동 탐지/수동 매핑 · 검증 · 포장 추정/견적 · Multi-FR 후보 · 공학 검토 기록 · OOG 판정")
p.write_text(s,encoding='utf-8')
p=Path(__file__).resolve().parents[1]/'tools/verify-foundation.py';s=p.read_text(encoding='utf-8').replace('all fifteen product tables','all twenty-one product tables');p.write_text(s,encoding='utf-8')
print('Automatic CLP option visible before import; project panels reset on context changes')
