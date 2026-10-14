from pathlib import Path
import pymupdf
root=Path(__file__).resolve().parents[1]/'docs/manual-qa'
with pymupdf.open(root/'Circle-OOG-User-Manual.pdf') as document:
    for i,page in enumerate(document):
        page.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).save(root/f'page-{i+1}.png')
    print(f'Rendered {len(document)} manual pages for visual review')
