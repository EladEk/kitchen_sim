import {APP_REVISION,BASELINE_REVISION} from '../public-view/revision.mjs';
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
 const nav=JSON.parse(await readFile('dist/client/baseline/navigation.json','utf8'));assert.equal(nav.revision,BASELINE_REVISION);let poses=0;
 assert.equal(nav.floors.reduce((n,f)=>n+f.map.doors.length,0),402,'the map includes standard doors and both service-room doors');
 assert(Buffer.byteLength(JSON.stringify(nav))<700000,'maps stay compact and shared across all eight buildings');
 for(const b of DISTRICT)for(const d of nav.destinations.filter(d=>d.unit)){
  const matrix=buildingTransform(b),point=new THREE.Vector3(d.position[0],d.floor*nav.storey+1.62,d.position[1]).applyMatrix4(matrix),loc=districtLocation(point,nav),where={...locationAt(loc.position,nav),building:loc.building},plan=mapForLocation(nav,where),pose=localMapPose(point,new THREE.Vector3(0,0,-1).transformDirection(matrix),matrix.clone().invert());
  assert.equal(where.building,b.id);assert.equal(where.unit,d.unit);assert.equal(plan.unit,d.unit);assert.equal(plan.units.length,1);assert(mapIsVisible(null,where));assert(plan.walls.length>100);assert(!plan.furniture.some(p=>['bed','sofa','media','coffee','kitchen','wardrobe','desk','dining','chair','fridge','laundry'].includes(p.kind)));assert(Math.hypot(pose.position[0]-d.position[0],pose.position[1]-d.position[1])<1e-8);assert(Math.abs(pose.heading)<1e-8);
  const [x,z,w,h]=plan.viewBox.split(' ').map(Number);assert(pose.position[0]>x&&pose.position[0]<x+w&&pose.position[1]>z&&pose.position[1]<z+h);poses++;
 }
 assert.equal(poses,344);
 for(const b of DISTRICT){const point=new THREE.Vector3(8,nav.storey+1.62,-24).applyMatrix4(buildingTransform(b)),loc=districtLocation(point,nav);assert.equal(loc.building,b.id,'the projecting balcony stays attached to its building');assert.equal(locationAt(loc.position,nav).unit,5);}
 for(const f of nav.floors){const map=mapForLocation(nav,{building:'4102',floor:f.level});assert.equal(map.unit,undefined);assert.equal(map.units.length,f.units.length);for(const p of f.map.walls){assert(p.length>=3);assert(Object.values(polygonBounds([p])).every(Number.isFinite));}}
});

test('empty public apartments retain their source bedroom labels without an automatic master bed',async()=>{const nav=JSON.parse(await readFile('dist/client/baseline/navigation.json','utf8'));assert(nav.floors[0].map.rooms.some(r=>r.unit===4&&r.id==='4:master'));for(const f of nav.floors)assert(!f.map.furniture.some(p=>p.kind==='bed'));});
test('the public loading manifest records exact decoded UTF-8 sizes for all three actual scene downloads',async()=>{const manifest=JSON.parse(await readFile('dist/client/baseline/loading.json','utf8'));assert.equal(manifest.revision,APP_REVISION);assert.deepEqual(Object.keys(manifest.bytes).sort(),['building.json','navigation.json','site.json']);for(const [name,bytes]of Object.entries(manifest.bytes))assert.equal((await readFile('dist/client/baseline/'+name)).byteLength,bytes);});
