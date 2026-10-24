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
def annotation_frames(page):
    """Ignore outlined callout digits, which use the same pen as wall faces.

    Closed triangle/hexagon frames have oblique sides; architectural wall
    rectangles and free-standing structural columns are deliberately retained.
    """
    result=[]
    for d in DOC[page-1].get_drawings():
        items=d['items'];polygons=[]
        if len(items) in (3,6) and all(i[0]=='l' for i in items):
            edges=[(world(page,i[1]),world(page,i[2])) for i in items]
            if all(math.dist(edges[i][1],edges[(i+1)%len(edges)][0])<.005 for i in range(len(edges))):polygons.append([a for a,b in edges])
        for item in items:
            if item[0]=='qu':
                q=item[1];poly=[]
                for p in [q.ul,q.ur,q.lr,q.ll]:
                    p=world(page,p)
                    if not any(math.dist(p,a)<.005 for a in poly):poly.append(p)
                polygons.append(poly)
        for poly in polygons:
            # PyMuPDF sometimes represents a triangle as a quad with one
            # additional point on its straight base.
            changed=True
            while changed and len(poly)>3:
                changed=False
                for i,p in enumerate(poly):
                    a,b=poly[i-1],poly[(i+1)%len(poly)]
                    if distance(p,a,b)<.005:
                        poly.pop(i);changed=True;break
            if len(poly) not in (3,6):continue
            xs=[p[0] for p in poly];zs=[p[1] for p in poly];edges=list(zip(poly,poly[1:]+poly[:1]))
            if not (.3<max(xs)-min(xs)<1.6 and .3<max(zs)-min(zs)<1.6):continue
            if sum(abs(a[0]-b[0])>.02 and abs(a[1]-b[1])>.02 for a,b in edges)<2:continue
            result.append(poly)
    return result
def walls(page,polys):
    lines={};annotations=annotation_frames(page);opening_edges=[]
    # Window jamb caps are also black architectural faces. Pairing opposite
    # caps across a 50cm window produced a false solid block through its glass.
    # Independently drawn OPENING members spanning that void disprove the pair.
    for index,d in enumerate(DOC[page-1].get_drawings()):
        if not (d.get('layer') or '').upper().endswith('|OPENING'):continue
        for item in d['items']:
            pairs=[item[1:]] if item[0]=='l' else list(zip([item[1].ul,item[1].ur,item[1].lr,item[1].ll],[item[1].ur,item[1].lr,item[1].ll,item[1].ul])) if item[0]=='qu' else []
            for a,b in pairs:
                a,b=world(page,a),world(page,b)
                if min(abs(a[i]-b[i]) for i in range(2))>.012:continue
                v=0 if abs(a[0]-b[0])<.012 else 1
                opening_edges.append((v,(a[v]+b[v])/2,*sorted([a[1-v],b[1-v]]),index))
    for d in DOC[page-1].get_drawings():
        if d.get('color')!=(0.,0.,0.) or abs((d.get('width') or 0)-1.26)>.02:continue
        # CAD apartment-number glyphs can share the 1.26pt architectural pen.
        # They are annotations even when their outlines are rectangular.
        if any(token in (d.get('layer') or '').upper() for token in ['FLAT-NUM','SALETXT','NOTIS','FRMTEXT']):continue
        edges=[]
        for item in d['items']:
            if item[0]=='l':edges.append((item[1],item[2]))
            elif item[0]=='qu':
                q=item[1];vertices=[q.ul,q.ur,q.lr,q.ll]
                edges.extend(zip(vertices,vertices[1:]+vertices[:1]))
        for aa,bb in edges:
            a,b=world(page,aa),world(page,bb)
            midpoint=[(x+y)/2 for x,y in zip(a,b)]
            if any(inside(midpoint,p) or min(distance(midpoint,c,p[(i+1)%len(p)]) for i,c in enumerate(p))<.008 for p in annotations):continue
            vertical=abs(a[0]-b[0])<.012;horizontal=abs(a[1]-b[1])<.012
            if not vertical and not horizontal:continue
            v=0 if vertical else 1;c=(a[v]+b[v])/2;lo,hi=sorted([a[1-v],b[1-v]])
            if hi-lo<.07:continue
            key=(v,round(c,3),round(lo,3),round(hi,3));lines[key]=(v,c,lo,hi)
    lines=list(lines.values());pairs=[]
    for i,(v,c,lo,hi) in enumerate(lines):
        # Pair each face with its nearest overlapping opposite face. The width
        # range also includes the 45/50cm concrete safe-room face pairs. The
        # former 42.5cm limit silently omitted those thick facade sections.
        candidates=[]
        for j,(vv,cc,ll,hh) in enumerate(lines):
            separation=abs(c-cc);a,b=max(lo,ll),min(hi,hh)
            if i==j or vv!=v or separation<.072 or separation>.50 or b-a<.065:continue
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
            matches=[e for e in opening_edges if e[0]==1-v and a-.008<=e[1]<=b+.008
                     and min(e[3],c+w/2)-max(e[2],c-w/2)>w*.8]
            if w>=.45 and len({e[4] for e in matches})>=2 and max(e[1] for e in matches)-min(e[1] for e in matches)>(b-a)*.6:
                rejected_window_caps.append({'page':page,'a':aa,'b':bb,'width':w,'sourceOpeningPaths':sorted({e[4] for e in matches})})
                continue
            result.append({'a':aa,'b':bb,'width':w,'basis':'paired-pdf-wall-faces'})
    return sorted(result,key=lambda q:(q['a'],q['b'])),[[v,round(c,5),round(a,5),round(b,5)] for v,c,a,b in lines],annotations

controls=json.loads((ROOT/'scripts/building-source-controls.json').read_text())
source_doors=json.loads((ROOT/'scripts/building-source-doors.json').read_text())
door_ids_path=ROOT/'scripts/building-door-ids.json'
door_ids=json.loads(door_ids_path.read_text()) if door_ids_path.exists() else {}
def px_world(page,p):return world(page,[v*DOC[page-1].rect.width/1250 for v in p])
def rounded(p):return [round(v,5) for v in p]
floors=[];rejected_window_caps=[]
for f in trace['floors']:
    polys=[p['polygon'] for p in f['envelope']]
    ws,faces,annotations=walls(f['page'],polys)
    page=f['page'];level=f['level'];doors=[];seen=set();stable_ids=door_ids.setdefault(str(level),{})
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
        key=str(door['id'])
        if key not in stable_ids:stable_ids[key]=f'bd-{level}-{max([int(v.rsplit("-",1)[1]) for v in stable_ids.values()],default=-1)+1}'
        balcony_ids=[]
        for index,poly in enumerate(f['balconies']):
            for i,a in enumerate(poly):
                b=poly[(i+1)%len(poly)];dx,dz=b[0]-a[0],b[1]-a[1]
                if abs((closed[0]-hinge[0])*dz-(closed[1]-hinge[1])*dx)>.05*math.dist(a,b):continue
                if max(distance(p,a,b) for p in [hinge,closed])<.35:balcony_ids.append(index);break
        doors.append({'id':stable_ids[key],'hinge':hinge,'closed':closed,'opened':opened,'unit':entry['unit'] if entry else None,'sourcePath':door['id'],'basis':'pdf-door-leaf-and-jamb',**({'balconyDoor':True,'balconies':balcony_ids} if balcony_ids else {})})
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
    floors.append({'level':level,'page':page,'walls':ws,'wallFaces':faces,'annotationFrames':annotations,'doors':doors,'entries':entries,'lifts':lifts,'stairs':stairs,'duplexStair':duplexWorld})
result={'sourceSha256':REG['buildingPdfSha256'],'floors':floors}
(ROOT/'qa/window-cap-rejections-r61.json').write_text(json.dumps({'sourceSha256':REG['buildingPdfSha256'],'rejected':rejected_window_caps},indent=2)+'\n')
(ROOT/'src/building-interiors.mjs').write_text('// Generated from black architectural faces in building-plan.pdf.\nexport const BUILDING_INTERIORS='+json.dumps(result,separators=(',',':'))+';\n')
door_ids_path.write_text(json.dumps(door_ids,indent=2)+'\n')
print(json.dumps({'wallsPerFloor':[len(f['walls']) for f in floors]}))
