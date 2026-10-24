"""Keep exact OPENING/PORCH CAD edges for independent facade classification."""
import json,math,fitz
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
trace=json.loads((ROOT/'src/building-trace.mjs').read_text().split('export const BUILDING_TRACE=')[1].rstrip(';\n'));r=trace['registration'];S=r['pdfMetresPerPoint'];doc=fitz.open(ROOT/'public/house/building-plan.pdf');out=[]
for f in trace['floors'][1:]:
 page=f['page'];anchor=r['sheetLiftPixels'][str(page)];edges=[]
 def world(p):return [r['liftWorld'][i]+(p[i]-anchor[i]*1332/1250)*S for i in range(2)]
 for k,d in enumerate(doc[page-1].get_drawings()):
  layer=d.get('layer') or ''
  if not layer.upper().endswith('|OPENING') and not layer.upper().endswith('|PORCH'):continue
  for item in d['items']:
   pairs=[item[1:]] if item[0]=='l' else list(zip([item[1].ul,item[1].ur,item[1].lr,item[1].ll],[item[1].ur,item[1].lr,item[1].ll,item[1].ul])) if item[0]=='qu' else []
   for aa,bb in pairs:
    a,b=world(aa),world(bb)
    if math.dist(a,b)<.15 or min(abs(a[i]-b[i]) for i in range(2))>.012:continue
    edges.append({'a':[round(v,5) for v in a],'b':[round(v,5) for v in b],'path':k,'layer':layer,'kind':'screen' if layer.upper().endswith('|PORCH') else 'opening'})
 out.append({'level':f['level'],'page':page,'edges':edges})
(ROOT/'scripts/facade-source-edges.json').write_text(json.dumps({'sourceSha256':r['buildingPdfSha256'],'floors':out},separators=(',',':'))+'\n')
print(json.dumps({'floors':len(out),'edges':sum(len(f['edges']) for f in out)}))
