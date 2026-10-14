"""Reduce Vitest's machine output and fingerprint the exact reviewed frontend sources."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
raw=json.loads((root/'docs/verification-frontend-code-raw.json').read_text(encoding='utf-8'))
assert raw['success'] and raw['numFailedTests']==0 and raw.get('numFailedTestSuites',0)==0
files=sorted([*Path(root/'frontend/src').rglob('*.ts'),*Path(root/'frontend/src').rglob('*.tsx'),*Path(root/'frontend/tests').rglob('*.ts'),*Path(root/'frontend/tests').rglob('*.tsx'),root/'frontend/vitest.config.ts',root/'frontend/package-lock.json'])
hashes={str(p.relative_to(root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
report={'status':'PASSED','passed':raw['numPassedTests'],'failed':raw['numFailedTests'],'browserEngineUsed':False,'environment':'Vitest + jsdom + React Testing Library; actual React/AntD components, API mocked','checks':[a['fullName'] for s in raw['testResults'] for a in s['assertionResults']],'sourceHashes':hashes,'limitations':['No browser rendering, pixel layout or real DOM engine claim','Live backend/API tested separately by verify-expanded-engineering.py and other API suites']}
(root/'docs/verification-frontend-code.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'frontendCodeTests':report['passed'],'failed':0,'browserEngineUsed':False}))
