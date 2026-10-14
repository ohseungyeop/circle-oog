"""Read source workbook cells and ZIP drawings without modifying original files."""
from pathlib import Path
import hashlib,json,re,zipfile,posixpath
from xml.etree import ElementTree as ET
import openpyxl
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1];SOURCE=Path(r'D:\01. 오승엽\OOG')
NS={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','x':'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'}
pattern=re.compile(r'center.?of.?gravity|\bc[.\s]?o[.\s]?g\b|무게\s?중심|중심위치|지지|받침|집중하중|단면|재질|항복|강성|라싱|lashing|dunnage|bedding|support|bearing|inertia|yield|fatigue|buckl|twist|도면|drawing|certificate|검사증|승인',re.I)
result={'readOnly':True,'files':[],'limitations':['Cell/formula labels and ZIP drawing metadata are candidates, not certified engineering measurements.','Images require separate visual review; XLS cells are not parsed by this script.']}
for path in sorted(SOURCE.glob('*.xlsx')):
 item={'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sheets':[],'matches':[],'images':[],'embeddedParts':[]}
 book=openpyxl.load_workbook(path,read_only=True,data_only=False)
 for sheet in book:
  nonempty=formulas=0
  for row in sheet.iter_rows():
   for cell in row:
    if cell.value is None:continue
    nonempty+=1;value=str(cell.value);formulas+=value.startswith('=')
    if pattern.search(value):
     context=[{'cell':c.coordinate,'value':str(c.value)[:200]}for c in row[max(0,cell.column-3):cell.column+3]if c.value is not None]
     item['matches'].append({'sheet':sheet.title,'cell':cell.coordinate,'value':value[:500],'rowContext':context})
  item['sheets'].append({'name':sheet.title,'state':sheet.sheet_state,'nonemptyCells':nonempty,'formulas':formulas})
 book.close()
 with zipfile.ZipFile(path)as z:
  item['embeddedParts']=[n for n in z.namelist()if n.startswith('xl/embeddings/')]
  item['drawingParts']=[n for n in z.namelist()if re.fullmatch(r'xl/drawings/drawing\d+\.xml',n)]
  item['drawingTextCandidates']=[]
  for part in item['drawingParts']:
   for text in ET.fromstring(z.read(part)).findall('.//a:t',NS):
    if text.text and pattern.search(text.text):item['drawingTextCandidates'].append({'part':part,'text':text.text[:500]})
  for name in z.namelist():
   if not re.fullmatch(r'xl/drawings/drawing\d+\.xml',name):continue
   relpath=posixpath.join(posixpath.dirname(name),'_rels',posixpath.basename(name)+'.rels')
   rels={v.attrib['Id']:posixpath.normpath(posixpath.join(posixpath.dirname(name),v.attrib['Target'])).lstrip('/')for v in ET.fromstring(z.read(relpath))}if relpath in z.namelist()else {}
   for anchor in ET.fromstring(z.read(name)):
    pic=anchor.find('x:pic',NS)
    if pic is None:continue
    props=pic.find('x:nvPicPr/x:cNvPr',NS);blip=pic.find('x:blipFill/a:blip',NS);start=anchor.find('x:from',NS)
    rel=blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')if blip is not None else None
    target=rels.get(rel)
    if target and target.startswith('xl/')and target in z.namelist():
     raw=z.read(target);item['images'].append({'drawing':name,'part':target,'name':props.attrib.get('name')if props is not None else None,'description':props.attrib.get('descr','')if props is not None else '', 'anchorRow':int(start.find('x:row',NS).text)+1 if start is not None else None,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
 result['files'].append(item)
class CellText(HTMLParser):
 def __init__(self):super().__init__();self.values=[];self.cell=False;self.current=[]
 def handle_starttag(self,tag,attrs):
  if tag in ('td','th'):self.cell=True;self.current=[]
 def handle_data(self,value):
  if self.cell:self.current.append(value)
 def handle_endtag(self,tag):
  if tag in ('td','th')and self.cell:
   value=' '.join(' '.join(self.current).split())
   if value:self.values.append(value)
   self.cell=False
for path in SOURCE.glob('*.xls'):
 raw=path.read_bytes();item={'file':path.name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
 if raw[:8]==bytes.fromhex('d0cf11e0a1b11ae1'):item['status']='BINARY_XLS_REVIEW_PENDING'
 else:
  encoding='utf-8'
  try:text=raw.decode(encoding)
  except UnicodeDecodeError:encoding='cp949';text=raw.decode(encoding,errors='replace')
  parser=CellText();parser.feed(text);item.update(status='HTML_DISGUISED_AS_XLS',encoding=encoding,nonemptyCellTexts=len(parser.values),matches=[{'text':v}for v in parser.values if pattern.search(v)])
 result['files'].append(item)
result['limitations']=['All nonempty XLSX cells/formula strings and drawing text candidates inspected; labels can be cargo names, not structural data.','HTML-disguised XLS table text is inspected. No source file is modified or recalculated.','The single embedded reference image was separately visually reviewed. Its equipment values are general references with unknown carrier/unit identity. Not physical certification.']
(ROOT/'docs/engineering-source-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(result['files']),'sheets':sum(len(f.get('sheets',[]))for f in result['files']),'engineeringLabelCandidates':sum(len(f.get('matches',[]))for f in result['files']),'embeddedImages':sum(len(f.get('images',[]))for f in result['files']),'embeddedParts':sum(len(f.get('embeddedParts',[]))for f in result['files'])}))
