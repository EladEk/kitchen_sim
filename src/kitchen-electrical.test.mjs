import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createKitchen} from './scene.js';
import {DEFAULTS,ROOM,snapshot} from './model.mjs';
import {KITCHEN_ELECTRICAL_POINTS as P,kitchenElectricalPoint,kitchenElectricalMarkers,kitchenElectricalElevation} from './kitchen-electrical.mjs';
import {ELECTRICAL_LAYOUT,KITCHEN_ANCHOR} from './home-model.mjs';
import {closeAllStudioOpenings} from './studio-state.mjs';
const context=new Proxy({}, {get:(obj,key)=>obj[key]||(()=>{}),set:(obj,key,v)=>(obj[key]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);

test('detailed kitchen reuses the nine corrected kitchen observations with inverse house placement and unchanged evidence',()=>{
 assert.equal(P.length,9);assert.deepEqual(P.map(p=>p.id),ELECTRICAL_LAYOUT.points.filter(p=>p.roomId==='kitchen').map(p=>p.id));
 for(const p of P){const original=ELECTRICAL_LAYOUT.points.find(o=>o.id===p.id);assert(kitchenElectricalPoint(p.id)===p);near(KITCHEN_ANCHOR[0]-p.position[0],original.position[0]);near(KITCHEN_ANCHOR[1]-p.position[2],original.position[2]);near(p.position[1],original.height);assert.deepEqual(p.evidence,original.evidence);
  assert(p.positionInferred&&p.dimensionsInferred);assert(p.position[0]>=0&&p.position[0]<=ROOM.long/1000);assert(p.position[2]>=0&&p.position[2]<=ROOM.short/1000);assert(p.height>0&&p.height<ROOM.height/1000);assert(p.normal.every((n,i)=>n===-original.normal[i]));
 }
});

test('optional 3D layer has correct metre-scale markers, outward camera views and invisible fixture pick targets',()=>{
 const hidden=createKitchen(DEFAULTS),visible=createKitchen({...DEFAULTS,showElectrical:true});
 try{
  assert.equal(hidden.electricalGroups.size,0);assert.equal(visible.electricalGroups.size,9);visible.group.updateMatrixWorld(true);
  for(const p of P){const node=visible.electricalGroups.get(p.id);assert(node);node.position.toArray().forEach((v,i)=>near(v,p.position[i]));const plate=node.children.find(m=>m.userData.part==='electrical-faceplate');assert(plate);const size=new THREE.Vector3();plate.geometry.computeBoundingBox();plate.geometry.boundingBox.getSize(size);near(size.x,p.width);near(size.y,p.boxHeight);near(size.z,p.depth);
   const hit=visible.picks.find(m=>m.userData.electricalId===p.id&&m.userData.part==='electrical-annotation-hit');assert(hit);assert.equal(hit.material.depthTest,true);assert.equal(hit.material.opacity,0);assert.equal(hit.renderOrder,0);assert(!node.children.some(n=>n.userData.part==='electrical-highlight'));assert(!hit.userData.openingId,'electrical clicks are not cabinet opening actions');const view=node.userData.inspectionView;assert(p.relocation?view.from[2]-view.target[2]>1:(view.from[0]-view.target[0])*p.normal[0]+(view.from[2]-view.target[2])*p.normal[1]>1);
  }
 }finally{hidden.dispose();visible.dispose();}
});

test('enabling outlet markers leaves all cabinet opening transforms unchanged and preserves isolated cabinet inspection',()=>{
 const settings={...DEFAULTS,openParts:['sink:door-left','island-1:drawer-0']},a=createKitchen(settings),b=createKitchen({...settings,showElectrical:true}),inspection=createKitchen({...settings,showElectrical:true,inspection:true,selected:'sink'});
 try{
  a.group.updateMatrixWorld(true);b.group.updateMatrixWorld(true);
  for(const [id,objects] of a.openingObjects){const other=b.openingObjects.get(id);assert.equal(other.length,objects.length);for(let i=0;i<objects.length;i++){const x=new THREE.Box3().setFromObject(objects[i]),y=new THREE.Box3().setFromObject(other[i]);x.min.toArray().forEach((v,j)=>near(v,y.min.toArray()[j]));x.max.toArray().forEach((v,j)=>near(v,y.max.toArray()[j]));}}
  assert.equal(inspection.electricalGroups.size,0);assert(inspection.group.children.every(c=>!c.visible||c===inspection.moduleGroups.get('sink')||c.isLight));assert(inspection.picks.every(m=>!m.userData.electricalId));
 }finally{a.dispose();b.dispose();inspection.dispose();}
});

test('all plan callouts and both elevations keep the same IDs, height and short-wall direction',()=>{
 const markers=kitchenElectricalMarkers();assert.equal(markers.length,9);assert.equal(new Set(markers.map(m=>m.point.id)).size,9);
 const long=kitchenElectricalElevation('long'),short=kitchenElectricalElevation('short');assert.equal(long.length,5);assert.equal(short.length,4);
 for(const {point:p,x,y} of [...long,...short]){near(y,ROOM.height-p.height*1000);near(x,p.wall==='long'?p.position[0]*1000:ROOM.short-p.position[2]*1000);assert(x>=0&&x<=ROOM[p.wall==='long'?'long':'short']);}
});

test('outlet visibility survives saved settings and global Close all without changing finishes or source data',()=>{
 const save=JSON.parse(JSON.stringify(snapshot({...DEFAULTS,showElectrical:true,base:'oak',openParts:['sink:door-left']}))),next=closeAllStudioOpenings({getItem:()=>null,setItem:()=>{}},{kitchen:save}).kitchen;
 assert.equal(next.settings.showElectrical,true);assert.equal(next.settings.base,'oak');assert.deepEqual(next.settings.openParts,[]);assert.equal(snapshot({...DEFAULTS,showElectrical:false}).settings.showElectrical,false);
});
