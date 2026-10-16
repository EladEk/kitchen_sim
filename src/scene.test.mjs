import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createKitchen} from './scene.js';
import {DEFAULTS} from './model.mjs';
import {OPENING_IDS} from './openings.mjs';
import {HOB,HOOD,appliancePlacement} from './appliances.mjs';
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

function findParts(root,kind){const parts=[];root.traverse(o=>{if(o.userData.part===kind)parts.push(o);});return parts;}
function boundsOf(objects){const bounds=new THREE.Box3();for(const o of objects)bounds.union(new THREE.Box3().setFromObject(o));return bounds;}
const mm=v=>Math.round(v*100000)/100;
test('Siemens cooktop has an 812 × 520 × 51 mm envelope with a real opening in the stone',()=>{
 const scene=createKitchen(DEFAULTS);scene.group.updateMatrixWorld(true);
 const glass=findParts(scene.group,'cooktop-glass'),body=findParts(scene.group,'cooktop-body');
 assert.equal(glass.length,1);assert.equal(body.length,1);
 const glassSize=boundsOf(glass).getSize(new THREE.Vector3()),envelope=boundsOf([...glass,...body]).getSize(new THREE.Vector3());
 assert.equal(mm(glassSize.x),812);assert.equal(mm(glassSize.z),520);assert.equal(mm(envelope.y),51);
 const worktop=findParts(scene.group,'worktop')[0];assert.ok(worktop);
 const ray=new THREE.Raycaster(new THREE.Vector3(3.88,2,.31),new THREE.Vector3(0,-1,0));
 assert.equal(ray.intersectObject(worktop).length,0,'Stone must not fill the cooktop cutout');
 ray.ray.origin.x=3.4;assert.ok(ray.intersectObject(worktop).length>0,'Stone must remain outside the cutout');
 scene.dispose();
});
test('hood motor fits inside the cabinet, its duct clears the shelf and its inherited offset is retained',()=>{
 const scene=createKitchen(DEFAULTS);scene.group.updateMatrixWorld(true);
 const parent=scene.moduleGroups.get(HOOD.cabinetId),motor=findParts(parent,'hood-motor'),base=findParts(parent,'hood-base'),duct=findParts(parent,'hood-duct');
 assert.equal(motor.length,1);assert.equal(base.length,1);assert.equal(duct.length,1);
 const m=boundsOf(motor),f=boundsOf(base),d=boundsOf(duct),fit=appliancePlacement();
 assert.equal(mm(f.getSize(new THREE.Vector3()).x),894);assert.equal(mm(f.getSize(new THREE.Vector3()).z),310);
 const sides=findParts(parent,'carcass-side').map(o=>new THREE.Box3().setFromObject(o));
 assert.ok(m.min.x>=sides[0].max.x-.00001);assert.ok(m.max.x<=sides[1].min.x+.00001);
 assert.equal(Math.round((f.getCenter(new THREE.Vector3()).x-3.88)*1000),40);
 assert.equal(fit.centerOffset,40);assert.equal(findParts(parent,'hood-led').length,2);
 assert.ok(Math.abs(d.getSize(new THREE.Vector3()).x-.15)<.00001);
 for(const shelf of [...findParts(parent,'hood-shelf'),...findParts(parent,'hood-top-panel')]){
  const c=d.getCenter(new THREE.Vector3()),ray=new THREE.Raycaster(new THREE.Vector3(c.x,3,c.z),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(shelf).length,0,'The pipe axis must pass through a real circular shelf opening');
  ray.ray.origin.x+=.15;assert.ok(ray.intersectObject(shelf).length>0,'Shelf material must remain outside the circular opening');
 }
 const hob=boundsOf(findParts(scene.group,'cooktop-glass'));
 assert.ok(f.min.x<=hob.min.x&&f.max.x>=hob.max.x,'Hood trim should span the cooktop despite the recorded offset');
 scene.dispose();
});
test('hood inspection retains all appliance parts and opening one door leaves the other closed',()=>{
 const scene=createKitchen({...DEFAULTS,selected:HOOD.cabinetId,inspection:true,openParts:[`${HOOD.cabinetId}:door-left`]});
 const parent=scene.moduleGroups.get(HOOD.cabinetId);
 for(const kind of ['hood-base','hood-motor','hood-duct'])assert.equal(findParts(parent,kind).length,1,`${kind} must stay inside the inspected cabinet`);
 assert.equal(findParts(parent,'hood-filter').length,2);
 const left=scene.openingObjects.get(`${HOOD.cabinetId}:door-left`)[0],right=scene.openingObjects.get(`${HOOD.cabinetId}:door-right`)[0];
 assert.ok(Math.abs(left.rotation.y)>1);assert.equal(right.rotation.y,0);
 assert.ok(scene.picks.every(p=>{for(let o=p;o;o=o.parent)if(o===parent)return true;return false;}));
 scene.dispose();
});

test('BOXIN LX 90 matches the manufacturer envelope and central motor instead of a full-width block',()=>{
 const scene=createKitchen(DEFAULTS);scene.group.updateMatrixWorld(true);
 const hood=findParts(scene.group,'hood-appliance')[0],motor=findParts(hood,'hood-motor')[0],collar=findParts(hood,'hood-outlet')[0];
 const product=boundsOf([hood]),m=boundsOf([motor]),outlet=boundsOf([collar]),base=boundsOf(findParts(hood,'hood-base'));
 const size=product.getSize(new THREE.Vector3()),ms=m.getSize(new THREE.Vector3());
 assert.deepEqual(size.toArray().map(mm),[894,361.3,310]);
 assert.deepEqual(ms.toArray().map(mm),[305,278.8,269.8]);
 assert.equal(mm(m.min.y-product.min.y),60);
 assert.equal(mm(m.min.z-product.min.z),16.2);
 assert.equal(mm(outlet.getCenter(new THREE.Vector3()).z-product.min.z),102.7);
 assert.equal(mm(outlet.max.y-product.min.y),361.3);
 assert.equal(mm(m.max.y-product.min.y),338.8);
 assert.equal(mm(base.max.y-base.min.y),60);
 assert.equal(findParts(hood,'hood-filter').length,2);assert.equal(findParts(hood,'hood-led').length,2);assert.equal(findParts(hood,'hood-led-bezel').length,2);assert.equal(findParts(hood,'hood-filter-latch').length,2);
 assert.ok(findParts(hood,'hood-front-visor').length);assert.ok(findParts(hood,'hood-maker-badge').length);
 // The product origin is 10 mm from the wall in a 320 mm cabinet.
 assert.equal(mm(product.min.z),10);assert.equal(mm(outlet.getCenter(new THREE.Vector3()).z),112.7);
 scene.dispose();
});
