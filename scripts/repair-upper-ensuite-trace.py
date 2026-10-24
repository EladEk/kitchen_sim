"""Restore the west penthouse en suites omitted from the enclosing polygons.

The entry-door recess was mistaken for the apartment's outside boundary.
The actual paired common wall against the next apartment's safe room is
already in the independently extracted PDF wall runs. Keep the real internal
door and include the entire bathroom, its floor and its ceiling.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'src/building-trace.mjs'
trace = json.loads(path.read_text().split('export const BUILDING_TRACE=')[1].rstrip(';\n'))
source = json.loads((ROOT / 'src/building-interiors.mjs').read_text().split('export const BUILDING_INTERIORS=')[1].rstrip(';\n'))
assert source['sourceSha256'] == trace['registration']['buildingPdfSha256']

def inside(p, poly):
    x, y = p
    yes = False
    for i, a in enumerate(poly):
        b = poly[i-1]
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            yes = not yes
    return yes

def distance(p, a, b):
    v = [b[i]-a[i] for i in range(2)]
    t = max(0, min(1, sum((p[i]-a[i])*v[i] for i in range(2))/sum(n*n for n in v)))
    return sum((p[i]-a[i]-t*v[i])**2 for i in range(2))**.5

def outlines(polys):
    xs = sorted({p[0] for poly in polys for p in poly})
    ys = sorted({p[1] for poly in polys for p in poly})
    cells = {(i, j) for i in range(len(xs)-1) for j in range(len(ys)-1)
             if any(inside([(xs[i]+xs[i+1])/2, (ys[j]+ys[j+1])/2], p) for p in polys)}
    edges = set()
    for i, j in cells:
        if (i, j-1) not in cells: edges.add(((xs[i],ys[j]), (xs[i+1],ys[j])))
        if (i+1, j) not in cells: edges.add(((xs[i+1],ys[j]), (xs[i+1],ys[j+1])))
        if (i, j+1) not in cells: edges.add(((xs[i+1],ys[j+1]), (xs[i],ys[j+1])))
        if (i-1, j) not in cells: edges.add(((xs[i],ys[j+1]), (xs[i],ys[j])))
    result = []
    while edges:
        a, b = next(iter(edges)); edges.remove((a,b)); poly = [a]; start = a
        while b != start:
            poly.append(b); e = next(e for e in edges if e[0] == b)
            edges.remove(e); a, b = e
        result.append([list(p) for i,p in enumerate(poly) if not (
            poly[i-1][0] == p[0] == poly[(i+1)%len(poly)][0] or
            poly[i-1][1] == p[1] == poly[(i+1)%len(poly)][1])])
    return result

repairs = []
for level in [7, 8]:
    floor = trace['floors'][level]
    unit, neighbour = floor['units']
    west, east = neighbour['polygon'][0][0], neighbour['polygon'][1][0]
    old_neighbour_edge = neighbour['polygon'][0][1]
    candidates = [w for w in source['floors'][level]['walls']
                  if abs(w['a'][1]-w['b'][1]) < .001
                  and abs(w['a'][1]-old_neighbour_edge) < .15
                  and .2 < w['width'] < .36
                  and w['a'][0] >= west-.06 and w['b'][0] <= east+.06
                  and w['b'][0]-w['a'][0] > 1.3]
    assert len(candidates) >= 2, f'No paired source common wall on floor {level}'
    shared = round(sum(w['a'][1] for w in candidates)/len(candidates), 4)
    assert max(abs(w['a'][1]-shared) for w in candidates) < .002
    old = max(p[1] for p in unit['polygon'])
    for p in unit['polygon']:
        if abs(p[1]-old) < .001: p[1] = shared
    for p in neighbour['polygon']:
        if abs(p[1]-old_neighbour_edge) < .001: p[1] = shared
    openings = [o for e in floor['envelope'] for o in e['openings']]
    # Discard only the split west bedroom glazing. Re-extract its full gap
    # against the real wall and OPENING strokes, instead of retaining two
    # spurious window sills through the balcony exit.
    openings = [o for o in openings if not (
        abs(o['a'][0]-west) < .06 and abs(o['b'][0]-west) < .06
        and min(o['a'][1],o['b'][1]) > -9.3
        and max(o['a'][1],o['b'][1]) < -7.2)]
    paths = []
    for poly in outlines([u['polygon'] for u in floor['units']]+[floor['core']]):
        retained = []
        for o in openings:
            for edge, a in enumerate(poly):
                if max(distance(p,a,poly[(edge+1)%len(poly)]) for p in [o['a'],o['b']]) < .015:
                    retained.append({**o,'edge':edge}); break
        paths.append({'polygon':poly,'openings':retained})
    floor['envelope'] = paths
    repairs.append({'floor':level,'unit':unit['number'],'sharedWallZ':shared,
                    'basis':'paired-pdf-common-wall','sourceWalls':candidates})

path.write_text('// Registered building traces; upper en suites enclosed through R61.\nexport const BUILDING_TRACE='+json.dumps(trace,separators=(',',':'))+';\n')
(ROOT/'qa/upper-ensuite-trace-r61.json').write_text(json.dumps(repairs,indent=2)+'\n')
print(json.dumps({'restoredEnSuites':len(repairs),'sharedWalls':[r['sharedWallZ'] for r in repairs]}))
