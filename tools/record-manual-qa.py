"""Record completed human/agent visual inspection, not an automatic layout assertion."""
from pathlib import Path
import argparse,hashlib,json
import pymupdf
root=Path(__file__).resolve().parents[1]
source=root/'docs/user-manual.json';word=root/'docs/Circle-OOG-User-Manual.docx'
parser=argparse.ArgumentParser();parser.add_argument('--inspected-pages',type=int,required=True);parser.add_argument('--reviewed-docx-sha256',required=True);parser.add_argument('--expected-version',default='0.7');args=parser.parse_args()
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
manual=json.loads(source.read_text(encoding='utf-8'));assert manual['version']==args.expected_version;assert sha(word)==args.reviewed_docx_sha256,'Word changed after inspection'
pdf=root/'docs/manual-qa/Circle-OOG-User-Manual.pdf'
with pymupdf.open(pdf)as document:pages=len(document)
assert pages==args.inspected_pages
pngs=[root/f'docs/manual-qa/page-{i}.png'for i in range(1,pages+1)];assert all(p.is_file()for p in pngs)
report={'date':'2026-10-14','version':manual['version'],'status':'PASSED','render':'Microsoft Word PDF and page PNGs; packaged render_docx.py unavailable because LibreOffice is missing','pages':pages,'pagesInspected':pages,'checks':['all rendered pages directly inspected','Korean glyphs native Word equations and tables readable','no clipped or overlapping text','headers and page footers readable','expanded route normal-load and maximum compression inputs stiffness actual tension Coulomb yaw witness beam and model exclusions match source','v0.6 direct UI evidence is separate from v0.7 code/API-only validation','feature and verification totals refer to canonical source'],'docxSha256':sha(word),'sourceSha256':sha(source),'pdfSha256':sha(pdf),'pageSha256':{p.name:sha(p)for p in pngs}}
(root/'docs/verification-manual.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Recorded completed visual review: v{manual["version"]} {pages}/{pages} pages')
