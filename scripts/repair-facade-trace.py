"""Retain the registered units and rebuild their penthouse envelope union.

The R58 safe-room unit corrections had not propagated into the enclosing slab
and extraction mask. Keep all other storeys and original opening records.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];path=ROOT/'src/building-trace.mjs'
trace=json.loads(path.read_text().split('export const BUILDING_TRACE=')[1].rstrip(';\n'))
def inside(p,poly):
 x,y=p;yes=False
 for i,a in enumerate(poly):
  b=poly[i-1]
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:yes=not yes
 return yes
def outlines(polys):
 xs=sorted({p[0] for poly in polys for p in poly});ys=sorted({p[1] for poly in polys for p in poly})
 cells={(i,j) for i in range(len(xs)-1) for j in range(len(ys)-1) if any(inside([(xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2],p) for p in polys)};edges=set()
 for i,j in cells:
  if (i,j-1) not in cells:edges.add(((xs[i],ys[j]),(xs[i+1],ys[j])))
  if (i+1,j) not in cells:edges.add(((xs[i+1],ys[j]),(xs[i+1],ys[j+1])))
  if (i,j+1) not in cells:edges.add(((xs[i+1],ys[j+1]),(xs[i],ys[j+1])))
  if (i-1,j) not in cells:edges.add(((xs[i],ys[j+1]),(xs[i],ys[j])))
 result=[]
 while edges:
  a,b=next(iter(edges));edges.remove((a,b));poly=[a];start=a
  while b!=start:
   poly.append(b);edge=next(e for e in edges if e[0]==b);edges.remove(edge);a,b=edge
  result.append([list(p) for i,p in enumerate(poly) if not (poly[i-1][0]==p[0]==poly[(i+1)%len(poly)][0] or poly[i-1][1]==p[1]==poly[(i+1)%len(poly)][1])])
 return result
def dist(p,a,b):
 v=[b[i]-a[i] for i in range(2)];length=sum(x*x for x in v);t=max(0,min(1,sum((p[i]-a[i])*v[i] for i in range(2))/length));return sum((p[i]-a[i]-t*v[i])**2 for i in range(2))**.5
for f in trace['floors'][7:9]:
 if f['level']==8:
  # Page 10 concrete/plaster face pair, -10.40267 / -10.70324 m.
  for p in f['units'][0]['polygon']:
   if abs(p[1]+9.8634)<.001:p[1]=-10.55296
  for poly in f['balconies']:
   for p in poly:
    if abs(p[1]+9.8634)<.001:p[1]=-10.55296
 old=[o for p in f['envelope'] for o in p['openings']];envelope=[]
 for poly in outlines([u['polygon'] for u in f['units']]+[f['core']]):
  openings=[]
  for o in old:
   for edge,a in enumerate(poly):
    b=poly[(edge+1)%len(poly)]
    if max(dist(p,a,b) for p in [o['a'],o['b']])<.012:openings.append({**o,'edge':edge});break
  envelope.append({'polygon':poly,'openings':openings})
 f['envelope']=envelope
path.write_text('// Registered building traces; penthouse envelope union repaired by scripts/repair-facade-trace.py.\nexport const BUILDING_TRACE='+json.dumps(trace,separators=(',',':'))+';\n')
print(json.dumps({'penthouseEnvelopeLoops':[len(f['envelope']) for f in trace['floors'][7:9]]}))
