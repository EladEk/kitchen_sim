"""Propagate the floor 2/6 outdoor and service-bay boundaries into envelopes."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];path=ROOT/'src/building-trace.mjs';trace=json.loads(path.read_text().split('export const BUILDING_TRACE=')[1].rstrip(';\n'))
def inside(p,poly):
 x,y=p;yes=False
 for i,a in enumerate(poly):
  b=poly[i-1]
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:yes=not yes
 return yes
def dist(p,a,b):
 v=[b[i]-a[i] for i in range(2)];t=max(0,min(1,sum((p[i]-a[i])*v[i] for i in range(2))/sum(n*n for n in v)));return sum((p[i]-a[i]-t*v[i])**2 for i in range(2))**.5
def outlines(polys):
 xs=sorted({p[0] for poly in polys for p in poly});ys=sorted({p[1] for poly in polys for p in poly});cells={(i,j) for i in range(len(xs)-1) for j in range(len(ys)-1) if any(inside([(xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2],p) for p in polys)};edges=set()
 for i,j in cells:
  if (i,j-1) not in cells:edges.add(((xs[i],ys[j]),(xs[i+1],ys[j])))
  if (i+1,j) not in cells:edges.add(((xs[i+1],ys[j]),(xs[i+1],ys[j+1])))
  if (i,j+1) not in cells:edges.add(((xs[i+1],ys[j+1]),(xs[i],ys[j+1])))
  if (i-1,j) not in cells:edges.add(((xs[i],ys[j+1]),(xs[i],ys[j])))
 result=[]
 while edges:
  a,b=next(iter(edges));edges.remove((a,b));poly=[a];start=a
  while b!=start:
   poly.append(b);e=next(e for e in edges if e[0]==b);edges.remove(e);a,b=e
  result.append([list(p) for i,p in enumerate(poly) if not(poly[i-1][0]==p[0]==poly[(i+1)%len(poly)][0] or poly[i-1][1]==p[1]==poly[(i+1)%len(poly)][1])])
 return result
f=trace['floors'][2]
for p in f['balconies'][4]:
 if p[0]>1:p[0]=f['units'][4]['polygon'][0][0]
for p in f['balconies'][5]:
 if p[0]<23:p[0]=f['units'][5]['polygon'][-1][0]
f=trace['floors'][6]
# The corner outdoor rectangles on page 8 are terraces, not enclosed bedrooms.
for unit,balcony,left in [(f['units'][0],f['balconies'][8],True),(f['units'][1],f['balconies'][9],False)]:
 edge=max(p[0] for p in balcony) if left else min(p[0] for p in balcony)
 for p in unit['polygon']:
  if (p[0]<edge-.05 if left else p[0]>edge+.05):p[0]=edge
# The southern AC platforms extend to the actual PORCH mouth at z≈9.045.
# Their source concrete face pair continues beyond the former z=7.317 mask.
for u in f['units'][4:6]:
 for p in u['polygon']:
  if abs(p[1]-7.3171)<.01:p[1]=8.996
for f in [trace['floors'][2],trace['floors'][6]]:
 old=[o for p in f['envelope'] for o in p['openings']];envelope=[]
 for poly in outlines([u['polygon'] for u in f['units']]+[f['core']]):
  ops=[]
  for o in old:
   for edge,a in enumerate(poly):
    if max(dist(p,a,poly[(edge+1)%len(poly)]) for p in [o['a'],o['b']])<.015:ops.append({**o,'edge':edge});break
  envelope.append({'polygon':poly,'openings':ops})
 f['envelope']=envelope
path.write_text('// Registered building trace; source balcony/service boundaries corrected through R60.\nexport const BUILDING_TRACE='+json.dumps(trace,separators=(',',':'))+';\n');print(json.dumps({'repairedFloors':[2,6]}))
