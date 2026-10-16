import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createKitchen} from './scene.js';
import {DEFAULTS} from './model.mjs';
import {OPENING_IDS} from './openings.mjs';
// Material painting is intentionally mocked. Geometry is the real Three.js scene.
const context=new Proxy({}, {get:(obj,key)=>obj[key]||(()=>{}),set:(obj,key,v)=>(obj[key]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
test('both closed daylight and open evening scenes build finite metric geometry',()=>{
 for(const settings of [DEFAULTS,{...DEFAULTS,base:'oak',upper:'sage',stone:'basalt',light:'evening',openParts:OPENING_IDS,dimensions:true,selected:'island-1'}]){
  const scene=createKitchen(settings);scene.group.updateMatrixWorld(true);assert.ok(scene.picks.length>50);let meshes=0;
  scene.group.traverse(o=>{if(o.isMesh){meshes++;o.geometry.computeBoundingBox();const bounds=new THREE.Box3().setFromObject(o);for(const v of [...bounds.min.toArray(),...bounds.max.toArray()])assert.ok(Number.isFinite(v),`Nonfinite mesh coordinate: ${o.userData.id||'unlabelled'}`);}});
  assert.ok(meshes>0);assert.ok(scene.picks.some(p=>p.userData.id==='sink'));assert.ok(scene.picks.some(p=>p.userData.id==='oven'));scene.dispose();
 }
});
test('island drawers face the work aisle and upper fronts stay at 320 mm depth',()=>{
 const scene=createKitchen(DEFAULTS);scene.group.updateMatrixWorld(true);
 const drawer=scene.picks.find(p=>p.userData.id==='island-1'&&p.userData.part==='drawer-front');assert.ok(drawer);const world=drawer.getWorldPosition(new THREE.Vector3());assert.ok(world.z<1.61,`Island drawer should face aisle, z=${world.z}`);
 const upper=scene.picks.find(p=>p.userData.id==='upper-0'&&p.userData.part==='hinged-front');const up=upper.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(up.z-.33)<.001);scene.dispose();
});

test('individual cabinet opening is independent and exposes the specified contents',()=>{
 const scene=createKitchen({...DEFAULTS,openParts:['storage-57:door','island-0:door']});scene.group.updateMatrixWorld(true);
 const storage=scene.moduleGroups.get('storage-57'),baskets=scene.moduleGroups.get('island-0'),mixer=scene.moduleGroups.get('mixer');
 const parts=(g,name)=>{const out=[];g.traverse(o=>{if(o.userData.part===name)out.push(o);});return out;};
 assert.equal(parts(storage,'drawer-tray').length,2);assert.equal(parts(baskets,'wire-basket').length,3);
 const storageDoor=parts(storage,'hinged-front')[0],mixerDoor=parts(mixer,'hinged-front')[0];
 assert.ok(Math.abs(storageDoor.parent.rotation.y)>1);assert.equal(mixerDoor.parent.rotation.y,0);scene.dispose();
});
test('close-up mode exposes only the selected cabinet and its click targets',()=>{
 const scene=createKitchen({...DEFAULTS,selected:'upper-1',openParts:['upper-1:door-left'],inspection:true});
 const active=scene.moduleGroups.get('upper-1');assert.ok(active.visible);
 assert.equal([...scene.moduleGroups.values()].filter(g=>g.visible).length,1);
 assert.ok(scene.group.children.every(c=>!c.visible||c===active||c.isLight));
 assert.ok(scene.picks.length>=2);for(const p of scene.picks){let ancestor=p;while(ancestor&&ancestor!==active)ancestor=ancestor.parent;assert.equal(ancestor,active);}
 let shelves=0,hinged=0;active.traverse(o=>{if(o.userData.part==='shelf')shelves++;if(o.userData.part==='hinged-front')hinged++;});assert.equal(shelves,2);assert.equal(hinged,2);scene.dispose();
});

function openingBounds(scene,id){scene.group.updateMatrixWorld(true);const box=new THREE.Box3();for(const o of scene.openingObjects.get(id)||[])box.union(new THREE.Box3().setFromObject(o));return [...box.min.toArray(),...box.max.toArray()];}
test('all controls have corresponding clickable geometry',()=>{const scene=createKitchen(DEFAULTS);assert.deepEqual([...scene.openingObjects.keys()].sort(),[...OPENING_IDS].sort());for(const id of OPENING_IDS)assert.ok(scene.picks.some(mesh=>mesh.userData.openingId===id),`Missing click target: ${id}`);scene.dispose();});
test('moving one door or drawer keeps its neighbours fixed in the actual 3D model',()=>{
 const closed=createKitchen(DEFAULTS);
 for(const id of ['drawers-90:drawer-1','sink:door-left','pantry:upper-door','upper-1:door-right','oven:lift-up','oven:lower-drawer-1','fridge:door-left']){
  const opened=createKitchen({...DEFAULTS,openParts:[id]});assert.notDeepEqual(openingBounds(opened,id),openingBounds(closed,id),`Target did not move: ${id}`);
  for(const other of OPENING_IDS.filter(x=>x!==id))assert.deepEqual(openingBounds(opened,other),openingBounds(closed,other),`Unexpected movement of ${other} from ${id}`);opened.dispose();
 }closed.dispose();
});
