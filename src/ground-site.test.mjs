import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {groundPoint,groundInverse,groundBaseProfile,groundBaseServices,groundBaseFurniture} from './ground-apartments.mjs';
import {SITE_TRACE,SITE_CHAMBERS,COMMON_ENTRY_DOORS} from './building-site.mjs';
import {BUILDING_FLOORS,buildingCamera} from './building-layout.mjs';
import {normalizeHomeSettings,ELECTRICAL_LAYOUT,openingPoint,DOORS,SERVICE_YARD} from './home-model.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {buildingLocation,buildingBoxes,moveBuildingPlayer,buildingCanStand} from './building-navigation.mjs';
import {buildBuildingContext} from './building-scene.js';
import {createElevators} from './elevator-model.mjs';

const near=(a,b,t=.03)=>assert(Math.abs(a-b)<t,`${a} ≈ ${b}`);
test('garden replicas align real entry and room controls with their independent source footprint, including reflected units',()=>{
 const profile=groundBaseProfile();
 for(const unit of [1,2,3]){
  const entry=BUILDING_INTERIORS.floors[0].entries.find(e=>e.unit===unit),d=BUILDING_INTERIORS.floors[0].doors.find(d=>d.id===entry.doorId),base=groundPoint(unit,openingPoint(DOORS[0])),mid=d.hinge.map((n,i)=>(n+d.closed[i])/2);
  near(base[0],mid[0],.08);near(base[1],mid[1],.08);
  for(const r of profile.rooms){const p=groundPoint(unit,r.walk);assert.equal(buildingLocation(p,0).unit,unit,`${unit} / ${r.id}`);const inv=groundInverse(unit,p);inv.forEach((n,i)=>near(n,r.walk[i],.00001));}
 }
 assert.equal(profile.rooms.find(r=>r.id==='bedroom-c').kind,'bedroom');
 assert.equal(profile.furniture.some(f=>['bed','desk','wardrobe','office-cabinet','outdoor-kitchen'].includes(f.kind)),false);
 const bath=groundBaseFurniture().find(f=>f.id==='base-bath-tub');near(bath.w,1.7,.002);near(bath.d,.7,.002);
});
test('copied services revert K09 to its observed wall position and retain derived evidence instead of claiming neighbour photographs',()=>{
 const own=ELECTRICAL_LAYOUT.points.find(p=>p.label==='K09');assert(own.relocation);
 for(const unit of [1,2,3]){const points=groundBaseServices(unit),k=points.find(p=>p.baseId===own.id),original=groundPoint(unit,[own.observedPosition[0],own.observedPosition[2]]);near(k.position[0],original[0],.001);near(k.position[2],original[1],.001);near(k.position[1],1.15,.001);assert(!k.relocation);assert(points.every(p=>p.derived&&p.evidence.length===0));assert(!points.some(p=>p.baseId==='electrical-K05'||p.fixtureId==='outdoor-kitchen'));assert(points.filter(p=>p.serviceKind==='lighting').every(p=>p.simulation));}
});
test('chambers use eleven independent source centres rather than a rotated copy of the owner garden',()=>{
 assert.equal(SITE_CHAMBERS.length,11);assert.deepEqual([1,2,3,4].map(n=>SITE_CHAMBERS.filter(c=>c.unit===n).length),[2,2,1,1]);assert.equal(SITE_CHAMBERS.filter(c=>!c.unit).length,5);
 const own=SITE_CHAMBERS.find(c=>c.unit===4);own.position.forEach((n,i)=>near(n,SERVICE_YARD.manhole.position[i],.002));
 const source1=SITE_CHAMBERS.find(c=>c.unit===1);assert(Math.hypot(...source1.position.map((n,i)=>n-groundPoint(1,own.position)[i]))>1);
});
test('all source bays and sidewalks fit the building camera, while tandem pairs share their touching edge',()=>{
 assert.equal(SITE_TRACE.parking.length,46);assert.deepEqual(SITE_TRACE.parking.map(p=>p.label).filter(x=>x!=='N1').sort((a,b)=>+a-+b),Array.from({length:45},(_,i)=>String(i+1)));assert(SITE_TRACE.parking.find(p=>p.label==='N1').accessible);
 for(let n=20;n<45;n+=2){const a=SITE_TRACE.parking.find(p=>p.label===String(n)),b=SITE_TRACE.parking.find(p=>p.label===String(n+1)),touch=a.polygon.filter(p=>b.polygon.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.002));assert.equal(touch.length,2,`tandem ${n}/${n+1}`);}
 for(const aspect of [.48,1.8]){const frame=buildingCamera(aspect),camera=new THREE.PerspectiveCamera(aspect<1?52:44,aspect,.06,500);camera.position.set(...frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld(true);for(const p of [...SITE_TRACE.walkable,...SITE_TRACE.parking].flatMap(p=>p.polygon)){const q=new THREE.Vector3(p[0],0,p[1]).project(camera);assert(Math.abs(q.x)<.95&&Math.abs(q.y)<.95);}}
});
test('walking reaches the actual main entrance from the sidewalk and a closed entrance still blocks the doorway',()=>{
 const cars=createElevators(),settings=normalizeHomeSettings(),at=[25,SITE_TRACE.mainEntrance[1]],open=moveBuildingPlayer(at,[-5,0],0,buildingBoxes(0,settings,cars),cars);near(open[0],20,.03);
 const closed={...settings,closedBuildingDoors:[COMMON_ENTRY_DOORS[0].id]},blocked=moveBuildingPlayer(at,[-5,0],0,buildingBoxes(0,closed,cars),cars);assert(blocked[0]>21.95);
 for(const unit of [1,2,3]){const p=groundPoint(unit,groundBaseProfile().rooms.find(r=>r.id==='hall').walk);assert(buildingCanStand(p,0,buildingBoxes(0,settings,cars),cars));}
});
test('the native scene has exactly three base interiors, ten additional chamber covers, 46 bays and operable common entry leaves',()=>{
 const root=new THREE.Group(),resources=[],picks=[],settings=normalizeHomeSettings({buildingLevel:0,cutaway:false}),model=buildBuildingContext({group:root,resources,picks,settings,mode:'building'}),nodes=[];root.traverse(o=>nodes.push(o));try{assert.equal(nodes.filter(o=>o.userData.part==='ground-base-apartment').length,3);assert.equal(nodes.filter(o=>o.userData.part==='ground-base-kitchen').length,3);assert.equal(nodes.filter(o=>o.userData.part==='site-inspection-cover').length,10);assert.equal(nodes.filter(o=>o.userData.part==='site-parking-bay').length,46);assert(picks.some(o=>o.userData.doorId==='bd-0-1000'));assert.equal(model.floors.size,1);}finally{resources.forEach(r=>r.dispose?.());}
});
