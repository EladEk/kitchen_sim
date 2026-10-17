import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHomeScene} from './home-scene.js';
import {HOUSE,ROOMS,WINDOWS,SHUTTERS,WALLS,openingPoint,insidePolygon,normalizeHomeSettings} from './home-model.mjs';
import {OBSERVED_ELEMENTS,SHUTTER_COVERS,PHOTO_REFERENCES,PHOTO_SOURCE} from './home-photo-reference.mjs';
const bounds=o=>new THREE.Box3().setFromObject(o),near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} ≈ ${b}`);

test('photo-observed HVAC and ceiling drops stay above doors, cabinets and the walking eye height',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);
  for(const e of OBSERVED_ELEMENTS){
   const group=scene.buildingGroups.get(e.id);assert(group,`${e.id} exists`);assert(group.userData.dimensionsInferred);
   assert(scene.picks.some(o=>o.userData.buildingId===e.id),`${e.id} opens its dimensions inspector`);
   const b=bounds(group);near(b.min.y,e.bottom);assert(b.max.y<=HOUSE.height+.001);assert(b.min.y>HOUSE.eyeHeight+.4);
  }
  const hvac=scene.buildingGroups.get('kitchen-hvac'),b=bounds(hvac),grilles=hvac.children.filter(o=>o.userData.part==='hvac-grille');assert.equal(grilles.length,2);
  let highestCabinet=0;scene.group.traverse(o=>{if(o.isMesh&&o.userData.action==='kitchen')highestCabinet=Math.max(highestCabinet,bounds(o).max.y);});assert(b.min.y>highestCabinet+.015,'bulkhead clears the actual tall units and upper cabinets');
  for(const id of ['hall-ceiling','master-ceiling']){
   const e=OBSERVED_ELEMENTS.find(e=>e.id===id),mesh=scene.buildingGroups.get(id).children[0],positions=mesh.geometry.attributes.position,room=ROOMS.find(r=>r.id===e.roomId),v=new THREE.Vector3();
   for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);assert(insidePolygon([v.x,v.z],room.polygon)||room.polygon.some(p=>Math.hypot(p[0]-v.x,p[1]-v.z)<.001),'ceiling footprint does not cover another room');}
   assert(bounds(mesh).min.y>2.3,'doorway and head clearance remains');
  }
 }finally{scene.dispose();}
});

test('the safe-room filter is inside, above the protected window, separate from the furniture toggle',()=>{
 for(const furniture of [true,false]){
  const scene=createHomeScene(normalizeHomeSettings({furniture}),{mode:'walk'});
  try{
   scene.group.updateMatrixWorld(true);const filter=scene.buildingGroups.get('safe-air-filter'),b=bounds(filter),window=WINDOWS.find(w=>w.id==='safe-window'),wall=WALLS.find(w=>w.id===window.wallId),room=ROOMS.find(r=>r.id==='safe-room');
   assert(b.min.y>window.sill+window.height+.1);assert(b.max.z<wall.a[1]-wall.thickness/2);assert(b.max.y<HOUSE.height);
   // The traced floor polygon is inset farther than the nominal thick wall.
   // Attach the back to the actual wall face; keep the body centre/front in the room.
   near(wall.a[1]-wall.thickness/2-b.max.z,.015);
   assert(insidePolygon([(b.min.x+b.max.x)/2,(b.min.z+b.max.z)/2],room.polygon));
   for(const x of [b.min.x,b.max.x])assert(insidePolygon([x,b.min.z],room.polygon));
   let exterior;scene.group.traverse(o=>{if(o.userData.part==='photo-exterior-slats')exterior=o;});assert(exterior);assert(bounds(exterior).min.z>wall.a[1]+wall.thickness/2,'the visible exterior slats stay outside the glass');
  }finally{scene.dispose();}
 }
 const cutaway=createHomeScene(normalizeHomeSettings({cutaway:true}));try{assert.equal(cutaway.buildingGroups.size,0,'ceiling elements do not obscure the floor plan cutaway');}finally{cutaway.dispose();}
});

test('dark photographed shutter covers face indoors while independent curtains stay outdoors',()=>{
 const scene=createHomeScene(normalizeHomeSettings({cutaway:false}));
 try{
  scene.group.updateMatrixWorld(true);const covers=new Map();scene.group.traverse(o=>{if(o.userData.shutterCoverId)covers.set(o.userData.shutterCoverId,o);});
  assert.equal(covers.size,5);assert(!covers.has('kitchen-window'),'the kitchen cover is concealed behind its bulkhead');
  for(const [id,profile] of Object.entries(SHUTTER_COVERS)){
   const o=SHUTTERS.find(s=>s.id===id).opening,wall=WALLS.find(w=>w.id===o.wallId),p=openingPoint(o),b=bounds(covers.get(id)),curtain=bounds(scene.shutterGroups.get(id));
   near(b.min.y,o.sill+o.height);near(b.max.y,o.sill+o.height+profile.height);
   if(o.vertical){assert(b.min.x>p[0]+wall.thickness/2);assert(curtain.max.x<p[0]);}else{assert(b.max.z<p[1]-wall.thickness/2);assert(curtain.min.z>p[1]);}
   assert(covers.get(id).children.every(o=>o.userData.action==='shutter'&&o.userData.shutterId===id),'cover clicks keep the correct independent shutter action');
  }
  for(const id of ['bed-a-window','bed-b-window','master-window','bed-c-window','kitchen-window']){
   let frame;scene.group.traverse(o=>{if(o.userData.windowId===id)frame=o;});const sashes=frame.children.filter(o=>o.userData.part==='window-sash');assert.equal(sashes.length,2);assert.notEqual(sashes[0].position.z,sashes[1].position.z,'two tracks are physically separate');
  }
 }finally{scene.dispose();}
});

test('all nine supplied photos and the video have local, portable preview assets and attachment provenance',()=>{
 const file=p=>new URL(`../public${p}`,import.meta.url),provenance=JSON.parse(readFileSync(file('/house/photos/provenance.json')));
 assert.equal(PHOTO_REFERENCES.length,9);assert.equal(provenance.items.length,10);assert.equal(new Set(PHOTO_REFERENCES.map(p=>p.file)).size,9);
 for(const p of PHOTO_REFERENCES){const preview=`${PHOTO_SOURCE.imagePrefix}${p.page}.jpg`,original=provenance.items.find(i=>i.original===p.file);assert(original);assert.match(original.sha256,/^[a-f0-9]{64}$/);const bytes=readFileSync(file(preview));assert.equal(bytes.readUInt16BE(0),0xffd8);}
 const video=readFileSync(file(PHOTO_SOURCE.video));assert.equal(video.toString('ascii',4,8),'ftyp');assert(video.indexOf('moov')<video.indexOf('mdat'),'video is fast-start encoded');assert(video.length<5_000_000);assert(existsSync(file(PHOTO_SOURCE.poster)));assert(statSync(file(PHOTO_SOURCE.poster)).size>5000);
 for(const e of OBSERVED_ELEMENTS)assert(PHOTO_SOURCE.pages.includes(e.page));
});
