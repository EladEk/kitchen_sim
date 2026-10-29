import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {publicSiteData} from '../scripts/public-site.mjs';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {SITE_TRACE} from '../src/building-site-trace.mjs';
import {DISTRICT,districtPoint} from './district-layout.mjs';
import {buildingTransform} from './district.mjs';
import {createSiteLayout,bounds,intersects,inside,contains} from './site-layout.mjs';
import {createDistrictSite} from './site-scene.mjs';
const source=publicSiteData(),layout=createSiteLayout(source);
const adjacent=(a,b)=>a.minX<=b.maxX+.025&&a.maxX>=b.minX-.025&&a.minZ<=b.maxZ+.025&&a.maxZ>=b.minZ-.025;

test('development transforms follow each building rotation/reflection, with all 32 gardens fenced',()=>{
 assert.equal(layout.gardens.length,32);
 for(const b of DISTRICT){for(const g of source.gardens){assert(layout.fences.some(f=>f.building===b.id&&f.units.includes(g.unit)));for(const p of g.plot){const v=new THREE.Vector3(p[0],0,p[1]).applyMatrix4(buildingTransform(b)),q=districtPoint(p,b);assert(Math.hypot(v.x-q[0],v.z-q[1])<1e-9);}}}
});
test('shared garden boundaries terminate at the facade and never cross apartment interiors',()=>{
 const units=BUILDING_FLOORS[0].units;
 for(const f of source.fences)for(const t of [.1,.25,.5,.75,.9]){const p=f.a.map((v,k)=>v+(f.b[k]-v)*t);assert(!units.some(u=>inside(p,u.polygon)),JSON.stringify(f));}
 assert(source.fences.filter(f=>f.units.length===2).length>=2);
});
test('4102 keeps every source bay, number and all 13 tandem pairs without a separating aisle',()=>{
 const actual=layout.parking.filter(b=>b.traced);assert.equal(actual.length,209);assert.deepEqual(new Set(actual.map(b=>b.label)),new Set([...Array.from({length:204},(_,i)=>String(i+1)),'N1','N2','N3','N4','N5']));assert.equal(actual.filter(b=>b.accessible).length,5);
 for(const b of SITE_TRACE.parking){const p=actual.find(v=>v.label===b.label);assert(p);assert.deepEqual(p.polygon,b.polygon.map(v=>districtPoint(v,DISTRICT[0])));}
 for(let label=20;label<=44;label+=2){const a=bounds(actual.find(b=>b.label===String(label)).polygon),b=bounds(actual.find(b=>b.label===String(label+1)).polygon);assert(adjacent(a,b));assert(Math.abs(a.minX-b.maxX)<.0001);}
 assert(layout.parking.filter(b=>!b.traced).every(b=>b.label===undefined),'do not invent official numbers for reconstructed courts');
});
test('drives and bays avoid every private garden, and bays do not overlap a drive or each other',()=>{
 const gardens=layout.gardens.map(g=>bounds(g.plot));
 for(const island of layout.islands){assert(!layout.parking.some(b=>intersects(island,bounds(b.polygon))));assert(!layout.roads.some(r=>intersects(island,r)));}
 for(const road of layout.roads)assert(!gardens.some(g=>intersects(road,g)),road.id);
 for(const [i,bay] of layout.parking.entries()){const r=bounds(bay.polygon);assert(!gardens.some(g=>intersects(r,g)),bay.id);assert(!layout.roads.some(l=>intersects(r,l)),bay.id);assert(!layout.parking.slice(i+1).some(b=>intersects(r,bounds(b.polygon))),bay.id);}
});
test('every parking bay can reach the connected road network, including tandem rear bays',()=>{
 const reachable=new Set([0]);let changed=true;
 while(changed){changed=false;for(let i=0;i<layout.roads.length;i++)if(!reachable.has(i)&&[...reachable].some(j=>adjacent(layout.roads[i],layout.roads[j]))){reachable.add(i);changed=true;}}
 assert.equal(reachable.size,layout.roads.length,'all drives connect to a perimeter street');
 const bays=layout.parking.map(b=>bounds(b.polygon)),served=new Set(bays.flatMap((b,i)=>layout.roads.some(r=>adjacent(b,r))?[i]:[]));changed=true;
 while(changed){changed=false;for(let i=0;i<bays.length;i++)if(!served.has(i)&&[...served].some(j=>adjacent(bays[i],bays[j]))){served.add(i);changed=true;}}
 assert.equal(served.size,bays.length,layout.parking.filter((b,i)=>!served.has(i)).map(b=>b.id).join(','));
});
test('kerbs leave parking mouths and drive junctions open; scene stays batched and disposable',()=>{
 const paved=p=>layout.roads.some(r=>contains(r,p))||layout.parking.some(b=>inside(p,b.polygon));
 for(const c of layout.curbs){const dx=c.b[0]-c.a[0],dz=c.b[1]-c.a[1],l=Math.hypot(dx,dz),mid=c.a.map((v,i)=>(v+c.b[i])/2);assert.notEqual(paved([mid[0]-dz/l*.11,mid[1]+dx/l*.11]),paved([mid[0]+dz/l*.11,mid[1]-dx/l*.11]));}
 const site=createDistrictSite(source);assert(site.group.children.length<30,'landscape must be batched for mobile');site.group.traverse(o=>{if(o.isInstancedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);assert(m.elements.every(Number.isFinite));assert(m.determinant()>0);}}});site.dispose();
});
