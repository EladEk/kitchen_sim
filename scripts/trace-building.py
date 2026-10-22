"""Rebuild R44 building traces from the owner's original PDF (PyMuPDF).

Polygons below are manually traced wall centre-lines in 1250px page previews.
Registration uses the same lift shaft on every sheet. Window/door horizontal
extents are gaps in the PDF's 1.26pt architectural wall strokes, not a grid of
invented evenly-spaced windows. Vertical dimensions remain illustrative.
Run from the repository root: python scripts/trace-building.py
"""
import fitz, json, math, hashlib, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PDF=ROOT/'public/house/building-plan.pdf'
doc=fitz.open(PDF)
OUT=ROOT/'src/building-trace.mjs'
SCALE=100*25.4/72/1000
APT_SCALE=SCALE/2
theta=math.atan2(.60,229.56)
origin=[568.20,1009.50]
world0=[(679.74-606)*APT_SCALE,0]
def ground_pdf(p):
    x,z=p[0]-origin[0],p[1]-origin[1]
    return [world0[0]+(x*math.cos(theta)-z*math.sin(theta))*SCALE,(x*math.sin(theta)+z*math.cos(theta))*SCALE]
ground_lift=ground_pdf([657.68*1531/1250,550.62*1531/1250])
# Consistent inside-left/top control of the two-lift shaft; page 11 is its head.
anchors={3:[657.68,550.62],4:[683.50,479.05],5:[672.86,478.55],6:[652.65,477.76],7:[712.16,477.59],8:[648.93,477.70],9:[648.03,479.17],10:[652.20,479.73],11:[672.07,473.31]}
def world(page,p):
    if page==3:return ground_pdf([v*1531/1250 for v in p])
    return [ground_lift[i]+(p[i]-anchors[page][i])*1332/1250*SCALE for i in range(2)]
def rect(x0,y0,x1,y1):return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]]
def mirror(poly,x):return [[2*x-a,b] for a,b in reversed(poly)]
def unit(n,p):return {'number':n,'polygon':p}

# Ground outline has four garden apartments and a wider common entrance/core.
g4=[[462,822],[653,822],[653,872],[703,872],[703,953],[670,953],[670,987],[630,987],[630,1094],[595,1094],[595,1184],[432,1184],[432,931],[462,931]]
g1=[[340,279],[594,279],[594,310],[703,310],[703,501],[653,501],[653,551],[571,551],[571,475],[432,475],[432,440],[340,440]]
gcore=[[571,551],[653,551],[653,501],[754,501],[754,551],[839,551],[839,614],[976,614],[976,774],[839,774],[839,822],[754,822],[754,872],[653,872],[653,822],[571,822],[571,758],[432,758],[432,599],[571,599]]
ground={'page':3,'units':[unit(1,g1),unit(2,mirror(g1,703)),unit(3,mirror(g4,703)),unit(4,g4)],'core':gcore,'balconies':[]}

def typical(page,cx,top_west,west_bed,balcony_x,top_y=160,bottom_y=1202,kind=2):
    # Work in the coordinates of that sheet. Its lift shaft is the fixed datum.
    cy=anchors[page][1]-479.05
    def shift(poly):return [[x,y+cy] for x,y in poly]
    a=cx
    north=[[top_west,160],[a-123,160],[a-123,238 if kind!=1 else 195],[a,238 if kind!=1 else 195],[a,416],[a-56,416],[a-56,474],[a-153,474],[a-153,436],[a-224,436],[a-224,386],[a-299,386],[a-299,294],[top_west+107,294],[top_west+107,259],[top_west,259]]
    if kind==1:
        north=[[top_west,160],[a-123,160],[a-123,195],[a,195],[a,416],[a-56,416],[a-56,474],[a-153,474],[a-153,436],[a-248,436],[a-248,386],[a-316,386],[a-316,347],[top_west,347]]
    south=[[west_bed+40,785],[a-56,785],[a-56,842],[a,842],[a,937],[a-56,937],[a-56,1024],[a-92,1024],[a-92,1098],[a-142,1098],[a-142,bottom_y],[west_bed,bottom_y],[west_bed,905],[west_bed+40,905]]
    if kind>=3:
        south=[[west_bed+78,785],[a-56,785],[a-56,842],[a,842],[a,937],[a-56,937],[a-56,1024],[a-92,1024],[a-92,1098],[west_bed+102,1098],[west_bed+102,bottom_y],[west_bed,bottom_y],[west_bed,905],[west_bed+78,905]]
    midwest=[[a-153,474],[a-56,474],[a-56,785],[a-153,785],[a-153,744],[a-205,744],[a-205,712],[a-315,712],[a-315,624],[a-275,624],[a-275,527],[a-153,527]]
    mideast=[[a+56,474],[a+153,474],[a+153,515],[a+207,515],[a+207,547],[a+315,547],[a+315,633],[a+275,633],[a+275,732],[a+153,732],[a+153,785],[a+56,785]]
    core=[[a-56,416],[a+56,416],[a+56,842],[a-56,842]]
    # Exposed balcony slabs are separate from the enclosed footprints.
    by=140 if kind!=1 else 115
    bals=[rect(a-123,by,a,238 if kind!=1 else 195),rect(a,by,a+123,238 if kind!=1 else 195),rect(a-332,527,a-275,624),rect(a+275,633,a+332,732),rect(balcony_x,785,west_bed+(78 if kind>=3 else 40),905),rect(2*a-(west_bed+(78 if kind>=3 else 40)),785,2*a-balcony_x,905)]
    if kind==2:
        bals += [rect(top_west,259,top_west+107,347),rect(2*a-top_west-107,259,2*a-top_west,347),rect(a-225,1098,a-142,bottom_y),rect(a+142,1098,a+225,bottom_y)]
    return {'page':page,'units':[unit(0,shift(north)),unit(0,shift(mirror(north,a))),unit(0,shift(midwest)),unit(0,shift(mideast)),unit(0,shift(south)),unit(0,shift(mirror(south,a)))],'core':shift(core),'balconies':[shift(p) for p in bals]}

f1=typical(4,737,318,422,379,kind=1)
f2=typical(5,726.4,307,411,395,kind=2)
f34=typical(6,706.2,287,391,375,kind=3)
f5=typical(7,765.7,346,450,435,kind=3)
f6=typical(8,702.5,283,387,371,kind=3,bottom_y=1097)
# On the 6th floor, the southern bedrooms step back, leaving roof terraces.
for idx in [4,5]:
    p=f6['units'][idx]['polygon']
    # The six-floor footprint ends at the safe-room/bedroom line, not at the
    # lower bedroom wing. Keep its actual stepped wall on both sides.
    if idx==4:p[:]=[[464,785],[646,785],[646,841],[702.5,841],[702.5,935],[664,935],[664,981],[615,981],[615,1097],[387,1097],[387,905],[464,905]]
    else:p[:]=mirror(f6['units'][4]['polygon'],702.5)
f6['balconies'] += [rect(387,1097,488,1202),rect(917,1097,1018,1202),rect(283,160,387,257),rect(1018,160,1122,257)]
# Refine the first two floors' different lower wings and the photographed
# wraparound balcony on floor 1. Grey outlines on higher sheets are roofs of
# earlier terraces, not another occupied balcony on every floor.
for f,north,south,midwest,mideast in [
 (f1,[[318,160],[616,160],[616,195],[737,195],[737,416],[680,416],[680,474],[583,474],[583,438],[494,438],[494,386],[423,386],[423,347],[318,347]],[[455,785],[680,785],[680,842],[737,842],[737,936],[697,936],[697,1025],[649,1025],[649,1098],[608,1098],[608,1202],[422,1202],[422,905],[455,905]],[[583,474],[680,474],[680,785],[583,785],[583,744],[531,744],[531,711],[422,711],[422,625],[461,625],[461,527],[583,527]],[[795,474],[889,474],[889,515],[942,515],[942,547],[1051,547],[1051,633],[1010,633],[1010,732],[889,732],[889,785],[795,785]]),
 (f2,[[307,160],[604,160],[604,238],[726.4,238],[726.4,416],[668,416],[668,474],[573,474],[573,438],[484,438],[484,386],[411,386],[411,294],[414,294],[414,259],[307,259]],[[489,785],[668,785],[668,842],[726.4,842],[726.4,937],[686,937],[686,1025],[638,1025],[638,1098],[510,1098],[510,1202],[411,1202],[411,905],[489,905]],None,None),
 (f34,[[287,160],[585,160],[585,238],[706.2,238],[706.2,416],[648,416],[648,474],[551,474],[551,438],[466,438],[466,386],[391,386],[391,294],[394,294],[394,259],[287,259]],[[464,785],[648,785],[648,842],[706.2,842],[706.2,936],[666,936],[666,1025],[615,1025],[615,1098],[490,1098],[490,1202],[391,1202],[391,905],[464,905]],None,None)
]:
 a={4:737,5:726.4,6:706.2}[f['page']]
 f['units'][0]['polygon']=north;f['units'][1]['polygon']=mirror(north,a)
 f['units'][4]['polygon']=south;f['units'][5]['polygon']=mirror(south,a)
 if midwest:f['units'][2]['polygon']=midwest
 if mideast:f['units'][3]['polygon']=mideast
f1['balconies']=[[[543,115],[737,115],[737,195],[616,195],[616,160],[543,160]],mirror([[543,115],[737,115],[737,195],[616,195],[616,160],[543,160]],737),rect(405,527,461,625),rect(1010,633,1067,732),[[379,785],[455,785],[455,905],[422,905],[422,979],[379,979]],mirror([[379,785],[455,785],[455,905],[422,905],[422,979],[379,979]],737)]
for f in [f5,f6]:
 a=765.7 if f is f5 else 702.5;dx=a-706.2;dy=anchors[f['page']][1]-anchors[6][1]
 for index in [0,1]:f['units'][index]['polygon']=[[x+dx,y+dy] for x,y in f34['units'][index]['polygon']]
 if f is f5:
  for index in [4,5]:f['units'][index]['polygon']=[[x+dx,y+dy] for x,y in f34['units'][index]['polygon']]
# The lower part of duplex 32 changes its wet-room/stair arrangement in f5;
# no invented internal partitions are furnished in these context shells.

n7=[[505,254],[896,254],[896,437],[850,437],[850,477],[757,477],[757,419],[644,419],[644,645],[547,645],[547,529],[505,529]]
s7=[[547,689],[644,689],[644,842],[757,842],[757,567],[850,567],[850,737],[896,737],[896,1005],[505,1005],[505,822],[547,822]]
core7=[[644,419],[757,419],[757,842],[644,842]]
t7n=[[386,160],[579,160],[579,144],[822,144],[822,160],[1017,160],[1017,386],[942,386],[942,437],[896,437],[896,254],[505,254],[505,437],[460,437],[460,386],[386,386]]
t7s=[[371,527],[505,527],[505,529],[547,529],[547,645],[644,645],[644,689],[547,689],[547,822],[505,822],[505,1005],[896,1005],[896,737],[1032,737],[1032,637],[1017,637],[1017,548],[907,548],[907,515],[850,515],[850,567],[757,567],[757,842],[644,842],[644,782],[371,782],[371,907],[386,907],[386,1098],[1017,1098],[1017,907],[1032,907],[1032,782],[896,782],[896,737],[850,737],[850,615],[805,615],[805,570],[760,570],[760,645],[644,645],[547,645],[547,742],[496,742],[496,713],[386,713],[386,625],[371,625]]
# Separate terrace wings prevent a spurious slab crossing the apartment/core.
b7=[t7n,rect(371,527,547,625),rect(386,625,547,713),rect(496,713,547,742),rect(850,515,907,548),rect(850,548,1017,637),rect(850,637,1032,737),[[371,782],[547,782],[547,822],[505,822],[505,1005],[896,1005],[896,782],[1032,782],[1032,907],[1017,907],[1017,1098],[386,1098],[386,907],[371,907]]]
f7={'page':9,'units':[unit(40,n7),unit(41,s7)],'core':core7,'balconies':b7}

n8=[[510,287],[589,287],[589,254],[707,254],[707,297],[859,297],[859,477],[707,477],[707,423],[647,423],[647,646],[550,646],[550,526],[510,526]]
s8=[[550,690],[647,690],[647,784],[700,784],[700,843],[765,843],[765,572],[859,572],[859,749],[900,749],[900,973],[818,973],[818,1005],[704,1005],[704,964],[550,964]]
f8={'page':10,'units':[unit(42,n8),unit(43,s8)],'core':[[647,423],[707,423],[707,477],[765,477],[765,843],[700,843],[700,784],[647,784]] ,'balconies':[rect(510,254,589,287),[[707,204],[928,204],[928,438],[859,438],[859,297],[707,297]],rect(510,526,550,625),rect(859,635,900,749),[[484,824],[550,824],[550,964],[704,964],[704,1056],[484,1056]],rect(818,973,900,1005)]}
roof={'page':11,'units':[],'core':[],'balconies':[], 'roof':[[529,285],[608,285],[608,254],[727,254],[727,296],[879,296],[879,752],[920,752],[920,973],[842,973],[842,1005],[722,1005],[722,964],[569,964],[569,510],[529,510]], 'heads':[rect(670,471,725,576),[[670,643],[740,643],[740,780],[670,780]] ]}

raw=[ground,f1,f2,f34,f34,f5,f6,f7,f8]
numbers=[[1,2,3,4],[5,6,8,7,10,9],[11,12,14,13,16,15],[17,18,20,19,22,21],[23,24,26,25,28,27],[29,30,32,31,34,33],[35,36,32,37,39,38],[40,41],[42,43]]

# R45 audit: register the same INSIDE top-left shaft corner on every sheet.
# R44 used a nearby jamb on upper sheets, displacing their plans by 20cm.
controls=json.loads((ROOT/'scripts/building-source-controls.json').read_text())
for c in controls['corePages']:
    top=c['shaft']['top']['px']
    anchors[c['page']]=[min(p[0] for p in top),min(p[1] for p in top)]
ground_lift=ground_pdf([v*1531/1250 for v in anchors[3]])
ground_audit=json.loads((ROOT/'scripts/building-ground-audit.json').read_text())
def deskew_preview(poly):return [[v*1250/1531 for v in p] for p in poly]
ground['units']=[unit(u['number'],deskew_preview(u['enclosedWallCentreline']['polygonDeskewPdf'])) for u in ground_audit['units']]
ground['core']=deskew_preview(ground_audit['commonCoreEnclosedWallCentreline']['polygonDeskewPdf'])
def ground_trace_world(p):
    control=ground_audit['coordinateSystem']['groundControlDeskewPdf']
    return [world0[i]+(p[i]*1531/1250-control[i])*SCALE for i in range(2)]

def inside(p,poly):
    x,y=p;yes=False
    for i,a in enumerate(poly):
        b=poly[i-1]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:yes=not yes
    return yes

def outlines(polys):
    # Exact rectilinear union on the finite grid of trace coordinates.
    xs=sorted({p[0] for poly in polys for p in poly});ys=sorted({p[1] for poly in polys for p in poly})
    cells={(i,j) for i in range(len(xs)-1) for j in range(len(ys)-1) if any(inside([(xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2],p) for p in polys)}
    edges=set()
    for i,j in cells:
        if (i,j-1) not in cells:edges.add(((xs[i],ys[j]),(xs[i+1],ys[j])))
        if (i+1,j) not in cells:edges.add(((xs[i+1],ys[j]),(xs[i+1],ys[j+1])))
        if (i,j+1) not in cells:edges.add(((xs[i+1],ys[j+1]),(xs[i],ys[j+1])))
        if (i-1,j) not in cells:edges.add(((xs[i],ys[j+1]),(xs[i],ys[j])))
    loops=[]
    while edges:
        a,b=next(iter(edges));edges.remove((a,b));loop=[a];start=a
        while b!=start:
            loop.append(b);n=next((e for e in edges if e[0]==b),None)
            if not n:raise ValueError('Unclosed trace')
            edges.remove(n);a,b=n
        keep=[]
        for i,p in enumerate(loop):
            a,b=loop[i-1],loop[(i+1)%len(loop)]
            if not (a[0]==p[0]==b[0] or a[1]==p[1]==b[1]):keep.append(list(p))
        loops.append(keep)
    return loops

def strokes(page):
    p=doc[page-1];f=1250/p.rect.width;res=[]
    for d in p.get_drawings():
        if d.get('color')!=(0.,0.,0.) or (d.get('width') or 0)<1.2:continue
        for item in d['items']:
            if item[0]!='l':continue
            a,b=item[1],item[2]
            def xy(p):return [(p.x*math.cos(theta)-p.y*math.sin(theta))*f,(p.x*math.sin(theta)+p.y*math.cos(theta))*f] if page==3 else [p.x*f,p.y*f]
            a,b=xy(a),xy(b)
            if abs(a[0]-b[0])<.4 and abs(a[1]-b[1])>1:res.append((True,(a[0]+b[0])/2,sorted([a[1],b[1]])))
            if abs(a[1]-b[1])<.4 and abs(a[0]-b[0])>1:res.append((False,(a[1]+b[1])/2,sorted([a[0],b[0]])))
    return res

def openings(page,poly,ss):
    result=[]
    for i,a in enumerate(poly):
        b=poly[(i+1)%len(poly)];v=abs(a[0]-b[0])<.01
        if not v and abs(a[1]-b[1])>.01:continue
        axis=a[0] if v else a[1];lo,hi=sorted([a[1] if v else a[0],b[1] if v else b[0]])
        length=hi-lo
        intervals=sorted([max(lo,p),min(hi,q)] for vv,c,(p,q) in ss if vv==v and abs(c-axis)<5.1 and q>lo and p<hi)
        if not intervals:continue  # no evidence => plain shell, never invent a window
        merged=[]
        for p,q in intervals:
            if merged and p<=merged[-1][1]+1:merged[-1][1]=max(merged[-1][1],q)
            else:merged.append([p,q])
        cursor=lo
        for p,q in merged+[[hi,hi]]:
            w=(p-cursor)*doc[page-1].rect.width/1250*SCALE
            # 0.4–3.7m covers observed narrow bathroom windows to patio sliders.
            # Unstroked exposed courtyards/party junctions are not giant windows.
            if .4<w<3.7 and cursor>lo+1.5 and p<hi-1.5:
                aa=[axis,cursor] if v else [cursor,axis];bb=[axis,p] if v else [p,axis]
                result.append({'edge':i,'a':aa,'b':bb,'kind':'slider' if w>1.85 else 'window','basis':'pdf-wall-gap'})
            cursor=max(cursor,q)
    return result

def rnd(p):return [round(x,4) for x in p]
floors=[]
for level,f in enumerate(raw):
    page=f['page'];ss=strokes(page);toWorld=ground_trace_world if level==0 else lambda p:world(page,p)
    units=[dict(u,number=n) for u,n in zip(f['units'],numbers[level])]
    contours=outlines([u['polygon'] for u in units]+[f['core']])
    paths=[]
    for poly in contours:
        paths.append({'polygon':[rnd(toWorld(p)) for p in poly], 'openings':[{**o,'a':rnd(toWorld(o['a'])),'b':rnd(toWorld(o['b']))} for o in openings(page,poly,ss)]})
    floors.append({'level':level,'page':page,'units':[{'number':u['number'],'polygon':[rnd(toWorld(p)) for p in u['polygon']]} for u in units], 'envelope':paths,'core':[rnd(toWorld(p)) for p in f['core']], 'balconies':[[rnd(toWorld(p)) for p in poly] for poly in f['balconies']],**({'gardens':[{'unit':u['number'],'polygon':u['gardenSurfaceBoundaryWallCentreline']['polygonWorld'],'plot':u['grossPlotBoundaryWallCentreline']['polygonWorld']} for u in ground_audit['units']]} if level==0 else {})})
result={'floors':floors,'roof':{'page':11,'polygon':[rnd(world(11,p)) for p in roof['roof']],'heads':[[rnd(world(11,p)) for p in poly] for poly in roof['heads']]},'site':[[rnd(x) for x in [world(3,p) for p in [[293,89],[965,89],[1050,115],[1114,184],[1143,275],[1143,1230],[293,1230]]]]], 'registration':{'pdfMetresPerPoint':SCALE,'groundControlPdf':origin,'groundControlWorld':world0,'deskewRadians':theta,'liftWorld':ground_lift,'sheetLiftPixels':anchors,'pixelPreviewWidth':1250,'buildingPdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest()}}
OUT.write_text('// Generated by scripts/trace-building.py from the attached original PDF.\nexport const BUILDING_TRACE='+json.dumps(result,separators=(',',':'))+';\n')
# All floor sheets become available in the existing source gallery.
for page in ([] if '--skip-previews' in sys.argv else range(4,12)):
    p=doc[page-1];p.get_pixmap(matrix=fitz.Matrix(1600/p.rect.width,1600/p.rect.width),alpha=False).pil_save(str(ROOT/f'public/house/building-plan-{page}.jpg'),quality=86)
print(json.dumps({'floors':len(floors),'unitsPerFloor':[len(f['units']) for f in floors],'windowsPerFloor':[sum(len(p['openings']) for p in f['envelope']) for f in floors],'output':str(OUT)},indent=2))
