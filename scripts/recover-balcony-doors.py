"""Recover the exterior door leaves drawn as three separate U-shaped lines.

The earlier leaf extractor accepted closed quads only. A real CAD swing arc,
two parallel leaf faces and a threshold parallel to a balcony edge are all
required; a narrow window alone is never converted into a door.
"""
import fitz,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
trace=json.loads((ROOT/'src/building-trace.mjs').read_text().split('export const BUILDING_TRACE=')[1].rstrip(';\n'));reg=trace['registration'];S=reg['pdfMetresPerPoint'];doc=fitz.open(ROOT/'public/house/building-plan.pdf')
path=ROOT/'scripts/building-source-doors.json';source=json.loads(path.read_text());recovered=[]
def distance(p,a,b):
 v=[b[i]-a[i] for i in range(2)];l=sum(x*x for x in v);t=max(0,min(1,sum((p[i]-a[i])*v[i] for i in range(2))/l));return math.dist(p,[a[i]+t*v[i] for i in range(2)])
for floor in trace['floors'][1:]:
 page=floor['page'];pg=doc[page-1];drawings=pg.get_drawings();anchor=reg['sheetLiftPixels'][str(page)];factor=1250/pg.rect.width
 def world(p):return [reg['liftWorld'][i]+(p[i]-anchor[i]*1332/1250)*S for i in range(2)]
 leaves=[]
 for index,d in enumerate(drawings):
  if d.get('color')!=(0.,0.,0.) or not (d.get('layer') or '').upper().endswith('|OPENING') or len(d['items'])!=3 or not all(it[0]=='l' for it in d['items']):continue
  long=[it for it in d['items'] if .55<math.dist(it[1],it[2])*S<1.4]
  if len(long)!=2:continue
  normal=0 if abs(long[0][1][0]-long[0][2][0])<.1 else 1;axis=1-normal
  if any(abs(it[1][normal]-it[2][normal])>.1 for it in long):continue
  if abs(long[0][1][normal]-long[1][1][normal])*S>.06:continue
  c=sum(it[1][normal] for it in long)/2;lo=sum(min(it[1][axis],it[2][axis]) for it in long)/2;hi=sum(max(it[1][axis],it[2][axis]) for it in long)/2
  leaves.append((index,normal,[c,lo] if normal==0 else [lo,c],[c,hi] if normal==0 else [hi,c]))
 for door in source[str(page)]['doors']:
  if door.get('leaf'):continue
  arc=drawings[door['id']];curves=[it for it in arc['items'] if it[0]=='c']
  if not curves:continue
  ends=[list(curves[0][1]),list(curves[-1][-1])];best=None
  for index,normal,a,b in leaves:
   width=math.dist(a,b)
   for hinge,tip in [(a,b),(b,a)]:
    near=min(range(2),key=lambda i:math.dist(ends[i],tip));other=ends[1-near];v=[tip[i]-hinge[i] for i in range(2)];turn=[-v[1],v[0]]
    if sum((other[i]-hinge[i])*turn[i] for i in range(2))<0:turn=[-n for n in turn]
    closed=[hinge[i]+turn[i] for i in range(2)];score=math.dist(ends[near],tip)+math.dist(other,closed)
    if score>3:continue
    h,c=world(hinge),world(closed);balconies=[]
    for j,poly in enumerate(floor['balconies']):
     for k,p in enumerate(poly):
      q=poly[(k+1)%len(poly)]
      if abs((c[0]-h[0])*(q[1]-p[1])-(c[1]-h[1])*(q[0]-p[0]))>.05*math.dist(p,q):continue
      if max(distance(h,p,q),distance(c,p,q))<.35:balconies.append(j);break
    if not balconies:continue
    if best is None or score<best[0]:best=(score,index,hinge,tip,closed,balconies)
  if best:
   score,index,hinge,tip,closed,balconies=best
   door['leaf']={'hinge':[v*factor for v in hinge],'tip':[v*factor for v in tip],'closedTip':[v*factor for v in closed],'widthPx':math.dist(hinge,tip)*factor,'widthMetres':math.dist(hinge,tip)*S,'source':index,'recoveredBalconyDoor':True,'basis':'pdf-swing-arc-and-three-line-leaf','balconies':balconies,'fitErrorMetres':score*S}
 for door in source[str(page)]['doors']:
  if door.get('leaf',{} ) and door['leaf'].get('recoveredBalconyDoor'):recovered.append({'floor':floor['level'],'page':page,'arc':door['id'],'leafPath':door['leaf']['source'],'balconies':door['leaf']['balconies'],'width':door['leaf']['widthMetres']})
path.write_text(json.dumps(source,separators=(',',':'))+'\n')
(ROOT/'qa/balcony-door-recovery-r60.json').write_text(json.dumps(recovered,indent=2)+'\n');print(json.dumps({'recovered':len(recovered),'perFloor':[sum(d['floor']==level for d in recovered) for level in range(9)]}))
