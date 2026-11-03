import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {DISTRICT,buildingTransform,districtLocation} from '../public-view/district.mjs';
import {mapForLocation,localMapPose,polygonBounds,mapIsVisible} from '../public-view/tour-map.mjs';
import {locationAt} from '../public-view/navigation.mjs';
import {inside} from '../public-view/navigation.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';

test('all 43 actual apartment destinations in eight buildings produce the matching interior plan and registered live marker',async()=>{
 const nav=JSON.parse(await readFile('dist/client/baseline/navigation.json','utf8'));assert.equal(nav.revision,110);let poses=0;
 assert.equal(nav.floors.reduce((n,f)=>n+f.map.doors.length,0),400,'the map includes every standard moving door');
 assert(Buffer.byteLength(JSON.stringify(nav))<700000,'maps stay compact and shared across all eight buildings');
 for(const b of DISTRICT)for(const d of nav.destinations.filter(d=>d.unit)){
  const matrix=buildingTransform(b),point=new THREE.Vector3(d.position[0],d.floor*nav.storey+1.62,d.position[1]).applyMatrix4(matrix),loc=districtLocation(point,nav),where={...locationAt(loc.position,nav),building:loc.building},plan=mapForLocation(nav,where),pose=localMapPose(point,new THREE.Vector3(0,0,-1).transformDirection(matrix),matrix.clone().invert());
  assert.equal(where.building,b.id);assert.equal(where.unit,d.unit);assert.equal(plan.unit,d.unit);assert.equal(plan.units.length,1);assert(mapIsVisible(null,where));assert(plan.walls.length>100);assert(plan.furniture.length>=3);assert(Math.hypot(pose.position[0]-d.position[0],pose.position[1]-d.position[1])<1e-8);assert(Math.abs(pose.heading)<1e-8);
  const [x,z,w,h]=plan.viewBox.split(' ').map(Number);assert(pose.position[0]>x&&pose.position[0]<x+w&&pose.position[1]>z&&pose.position[1]<z+h);poses++;
 }
 assert.equal(poses,344);
 for(const b of DISTRICT){const point=new THREE.Vector3(8,nav.storey+1.62,-24).applyMatrix4(buildingTransform(b)),loc=districtLocation(point,nav);assert.equal(loc.building,b.id,'the projecting balcony stays attached to its building');assert.equal(locationAt(loc.position,nav).unit,5);}
 for(const f of nav.floors){const map=mapForLocation(nav,{building:'4102',floor:f.level});assert.equal(map.unit,undefined);assert.equal(map.units.length,f.units.length);for(const p of f.map.walls){assert(p.length>=3);assert(Object.values(polygonBounds([p])).every(Number.isFinite));}}
});

test('the compiled public master-bed footprint follows the annotated lower-left map location',async()=>{
 const nav=JSON.parse(await readFile('dist/client/baseline/navigation.json','utf8')),floor=nav.floors[0],room=floor.map.rooms.find(r=>r.unit===4&&r.id==='4:master'),beds=floor.map.furniture.filter(f=>f.kind==='bed').map(f=>({polygon:f.polygon,centre:[f.polygon.reduce((n,p)=>n+p[0],0)/f.polygon.length,f.polygon.reduce((n,p)=>n+p[1],0)/f.polygon.length]})).filter(f=>room.polygons.some(p=>inside(f.centre,p)));
 assert.equal(beds.length,1);assert(Math.hypot(beds[0].centre[0]-1.7,beds[0].centre[1]-14.38)<.003);const bounds=polygonBounds([beds[0].polygon]);assert(bounds.maxZ<15.45);assert(bounds.minX>0);assert(bounds.maxZ-bounds.minZ>bounds.maxX-bounds.minX,'the bed length runs toward the lower edge shown in the annotation');
 const model=await new THREE.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),size=new THREE.Vector3();let headboard=false;
 try{model.traverse(o=>{if(!o.isInstancedMesh||o.userData.variantSlot!==4)return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,size);if(Math.abs(p.x-1.7)<.01&&Math.abs(size.y-.86)<.01&&Math.abs(size.z-.05)<.01&&p.z>15.3){assert(new THREE.Vector3(0,0,1).applyQuaternion(q).z<-.99);headboard=true;}}});assert(headboard,'the actual serialized headboard, rather than only the 2D footprint, is against the lower wall');}finally{disposeObjectResources(model);}
});
