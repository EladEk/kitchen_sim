"""Extract architectural wall faces from the attached building PDF.

Only black 1.26pt wall strokes are paired. Furniture, dimensions, grey roof
projections and door leaves are excluded. Horizontal coordinates keep the
R44 registration; the separate ground audit supplies corrected ground units.
"""
import json, math, fitz
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
trace=json.loads((ROOT/'src/building-trace.mjs').read_text().split('export const BUILDING_TRACE=')[1].rstrip(';\n'))
DOC=fitz.open(ROOT/'public/house/building-plan.pdf')
REG=trace['registration'];S=REG['pdfMetresPerPoint'];T=REG['deskewRadians']
def world(page,p):
    if page==3:
        x,z=p[0]-REG['groundControlPdf'][0],p[1]-REG['groundControlPdf'][1]
        return [REG['groundControlWorld'][0]+(x*math.cos(T)-z*math.sin(T))*S,(x*math.sin(T)+z*math.cos(T))*S]
    anchor=REG['sheetLiftPixels'][str(page)]
    return [REG['liftWorld'][i]+(p[i]-anchor[i]*1332/1250)*S for i in range(2)]
def inside(p,poly):
    x,y=p;yes=False
    for i,a in enumerate(poly):
        b=poly[i-1]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:yes=not yes
    return yes
def distance(p,a,b):
    dx,dz=b[0]-a[0],b[1]-a[1];l=dx*dx+dz*dz
    t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)) if l else 0
    return math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t)
def contained(p,polys,tolerance=.24):
    return any(inside(p,poly) or min(distance(p,a,poly[(i+1)%len(poly)]) for i,a in enumerate(poly))<tolerance for poly in polys)
def walls(page,polys):
    lines={}
    for d in DOC[page-1].get_drawings():
        if d.get('color')!=(0.,0.,0.) or abs((d.get('width') or 0)-1.26)>.02:continue
        edges=[]
        for item in d['items']:
            if item[0]=='l':edges.append((item[1],item[2]))
            elif item[0]=='qu':
                q=item[1];vertices=[q.ul,q.ur,q.lr,q.ll]
                edges.extend(zip(vertices,vertices[1:]+vertices[:1]))
        for aa,bb in edges:
            a,b=world(page,aa),world(page,bb)
            vertical=abs(a[0]-b[0])<.012;horizontal=abs(a[1]-b[1])<.012
            if not vertical and not horizontal:continue
            v=0 if vertical else 1;c=(a[v]+b[v])/2;lo,hi=sorted([a[1-v],b[1-v]])
            if hi-lo<.07:continue
            key=(v,round(c,3),round(lo,3),round(hi,3));lines[key]=(v,c,lo,hi)
    lines=list(lines.values());pairs=[]
    for i,(v,c,lo,hi) in enumerate(lines):
        # Pair each face with its nearest overlapping opposite face. The width
        # range covers the actual 10/12/20/25/30/35cm partitions and safe rooms.
        candidates=[]
        for j,(vv,cc,ll,hh) in enumerate(lines):
            separation=abs(c-cc);a,b=max(lo,ll),min(hi,hh)
            if i==j or vv!=v or separation<.072 or separation>.425 or b-a<.065:continue
            candidates.append((separation,j,a,b))
        if not candidates:continue
        # Split at overlaps so a long outside face can match several jambs.
        cuts=sorted({lo,hi,*[x for _,_,a,b in candidates for x in [a,b]]})
        for a,b in zip(cuts,cuts[1:]):
            if b-a<.025:continue
            mid=(a+b)/2;matches=[x for x in candidates if x[2]<=mid<=x[3]]
            if not matches:continue
            width,j,_,_=min(matches);cc=lines[j][1];center=(c+cc)/2
            p=[center,mid] if v==0 else [mid,center]
            if not contained(p,polys):continue
            pairs.append((v,round(center,3),round(width,3),round(a,3),round(b,3)))
    # Merge both directions and split-face duplicates, retaining real gaps.
    groups={}
    for v,c,w,a,b in set(pairs):groups.setdefault((v,c,w),[]).append([a,b])
    result=[]
    for (v,c,w),intervals in groups.items():
        merged=[]
        for a,b in sorted(intervals):
            if merged and a<=merged[-1][1]+.012:merged[-1][1]=max(merged[-1][1],b)
            else:merged.append([a,b])
        for a,b in merged:
            if b-a<.06:continue
            aa=[c,a] if v==0 else [a,c];bb=[c,b] if v==0 else [b,c]
            result.append({'a':aa,'b':bb,'width':w,'basis':'paired-pdf-wall-faces'})
    return sorted(result,key=lambda q:(q['a'],q['b']))

controls=json.loads((ROOT/'scripts/building-source-controls.json').read_text())
source_doors=json.loads((ROOT/'scripts/building-source-doors.json').read_text())
def px_world(page,p):return world(page,[v*DOC[page-1].rect.width/1250 for v in p])
def rounded(p):return [round(v,5) for v in p]
floors=[]
for f in trace['floors']:
    polys=[p['polygon'] for p in f['envelope']]
    ws=walls(f['page'],polys)
    page=f['page'];level=f['level'];doors=[];seen=set()
    for door in source_doors[str(page)]['doors']:
        leaf=door.get('leaf')
        if not leaf or not .43<leaf['widthMetres']<1.8:continue
        hinge=rounded(px_world(page,leaf['hinge']));closed=rounded(px_world(page,leaf['closedTip']));opened=rounded(px_world(page,leaf['tip']))
        mid=[(a+b)/2 for a,b in zip(hinge,closed)]
        if not contained(mid,polys):continue
        key=tuple(round(v,2) for p in [hinge,closed] for v in p)
        if key in seen:continue
        seen.add(key)
        entry=next((e for e in controls['entries'] if e['level']==level and math.dist(e['hingePx'],leaf['hinge'])<.3),None)
        doors.append({'id':f'bd-{level}-{len(doors)}','hinge':hinge,'closed':closed,'opened':opened,'unit':entry['unit'] if entry else None,'sourcePath':door['id'],'basis':'pdf-door-leaf-and-jamb'})
    entries=[]
    for e in controls['entries']:
        if e['level']!=level:continue
        door=next(d for d in doors if d['unit']==e['unit'])
        entries.append({'unit':e['unit'],'doorId':door['id'],'threshold':[rounded(px_world(page,p)) for p in e['thresholdPx']]})
    control=next(c for c in controls['corePages'] if c['page']==page)
    liftDoors=control['liftHallDoors']
    # In the exceptional top sheet the same shafts continue; use the actual
    # source shaft and the registered adjacent-sheet leaf offset if omitted.
    if len(liftDoors)!=2:
        fallback=next(c for c in controls['corePages'] if c['page']==6)
        delta=[REG['sheetLiftPixels'][str(page)][i]-REG['sheetLiftPixels']['6'][i] for i in range(2)]
        liftDoors=[{'centerPx':[d['centerPx'][i]+delta[i] for i in range(2)]} for d in fallback['liftHallDoors']]
    lifts=[]
    for i,d in enumerate(liftDoors):
        center=px_world(page,d['centerPx'])
        # Car symbol is 1.4 x 1.1m; threshold bridges it to the shaft east face.
        lifts.append({'id':i,'doorCenter':rounded(center),'minX':round(center[0]-1.66,5),'maxX':round(center[0]+.15,5),'minZ':round(center[1]-.65,5),'maxZ':round(center[1]+.65,5),'width':.90,'doorSide':'east'})
    stairrect=[rounded(px_world(page,p)) for p in control['stair']['clearRectPx']]
    stairs={'rect':stairrect,'westSouth':True,'turnLanding':'south','source':'pdf-stair-enclosure-and-direction-arrows'}
    duplex=next((d for d in controls.get('duplex32InternalStair',{}).get('levelsData',[]) if d['level']==level),None)
    duplexWorld={k:[rounded(px_world(page,p)) for p in duplex[k+'Px']] for k in ['longFlightRect','shortFlightRect','cornerLandingRect']} if duplex else None
    floors.append({'level':level,'page':page,'walls':ws,'doors':doors,'entries':entries,'lifts':lifts,'stairs':stairs,'duplexStair':duplexWorld})
result={'sourceSha256':REG['buildingPdfSha256'],'floors':floors}
(ROOT/'src/building-interiors.mjs').write_text('// Generated from black architectural faces in building-plan.pdf.\nexport const BUILDING_INTERIORS='+json.dumps(result,separators=(',',':'))+';\n')
print(json.dumps({'wallsPerFloor':[len(f['walls']) for f in floors]}))
