import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {ENTRANCE_SERVICES as E,entryElement,normalizeHomeSettings,ALL_HOME_PARTS,DOORS,openingPoint,canStand,collisionBoxes,movePlayer,roomAt,GARDEN_LAYOUT,PLOT,PUBLIC_ENTRY,polygonBounds,point,yardForSettings,gardenElement} from './home-model.mjs';
import {ENTRY_SOURCE,entryDoorBlocked} from './entrance-services.mjs';
import {createHomeScene} from './home-scene.js';
import {closeAllStudioOpenings} from './studio-state.mjs';
import {designEvidence} from './design-evidence.mjs';

test('the entry remains common-area context with only photographed contents and the new last-cabinet assignment',()=>{
 assert.equal(E.cabinets.length,3);assert.equal(E.parts.length,6);assert.equal(new Set(E.parts.map(p=>p.id)).size,6);
 for(const c of E.cabinets){assert.strictEqual(entryElement(c.id),c);assert(c.positionInferred&&c.dimensionsInferred);assert.equal(c.source,'entry-services');assert.deepEqual(designEvidence(c),{basis:'photo',position:'estimate',dimensions:'estimate'});assert(c.z>openingPoint(DOORS.find(d=>d.id==='entry'))[1]);assert(c.x>E.context.minX);assert(c.x+c.w/2<E.context.maxX);assert(c.parts.every(p=>ALL_HOME_PARTS.some(q=>q.id===p.id)));}
 assert.deepEqual(E.cabinets.map(c=>c.contents.length),[3,3,5]);assert(E.cabinets[1].contents[0].he.includes('לא קריאים'));assert(E.cabinets[2].he.includes('מונים 4 ו־3'));
 const all=JSON.stringify(E.cabinets.flatMap(c=>c.contents));assert(!/filter|non-return/.test(all),'no invented concealed filter or non-return assembly');
 assert.deepEqual(E.cabinets.slice(0,2).map(c=>c.meters),[undefined,undefined]);
 assert.deepEqual(E.cabinets[2].meters.map(m=>[m.apartment,m.capOpen]),[[4,false],[3,true]]);assert(E.cabinets[2].meters[0].y>E.cabinets[2].meters[1].y);
 assert.equal(E.cabinets[2].page,4);assert.equal(ENTRY_SOURCE.references.find(r=>r.page===4).file,'298252.jpg');
});

test('all six cabinet doors retain independent saved state and global close-all closes them',()=>{
 const opened=E.parts.map(p=>p.id),s=normalizeHomeSettings({openParts:[opened[0],opened[4],opened[0],'invented']}),again=normalizeHomeSettings(JSON.parse(JSON.stringify(s)));assert.deepEqual(again.openParts,[opened[0],opened[4]]);
 const all=normalizeHomeSettings({...s,openParts:opened});assert.deepEqual(all.openParts,opened);assert.deepEqual(closeAllStudioOpenings({setItem(){},getItem(){return null;}},{home:all}).home.openParts,[]);
});

test('actual 3D doors open outward separately, equipment remains pickable, and original device markings do not become operating controls',()=>{
 for(const cutaway of [false,true])for(const furniture of [false,true]){
  const settings=normalizeHomeSettings({cutaway,furniture,openParts:[E.parts[0].id,E.parts[3].id]}),scene=createHomeScene(settings,{mode:'overview'});
  try{
   scene.group.updateMatrixWorld(true);
   for(const c of E.cabinets){const g=scene.buildingGroups.get(c.id);assert(g);assert(g.userData.inspectionView.from[2]<c.z);const body=new THREE.Box3().setFromObject(g);assert(!body.isEmpty());for(const p of c.parts){const m=scene.motions.find(m=>m.id===p.id);assert(m);assert.equal(m.target,settings.openParts.includes(p.id)?m.openTarget:0);assert.equal(m.object.rotation.y,m.target);assert(scene.picks.some(o=>o.userData.partId===p.id));}}
   const collected=[];for(const c of E.cabinets)scene.buildingGroups.get(c.id).traverse(o=>{if(o.userData.part?.startsWith('observed-'))collected.push(o);});
   for(const part of ['observed-blue-riser','observed-grey-riser','observed-inspection-cap','observed-hot-water-tank','observed-black-insulated-pipe','observed-lower-metal-connection'])assert(collected.some(o=>o.userData.part===part));
   assert(collected.every(o=>o.userData.action==='building'&&o.userData.observed),'equipment clicks inspect; they do not operate real valves');
   const last=[];scene.buildingGroups.get('entry-unseen').traverse(o=>last.push(o));
   assert.deepEqual(last.filter(o=>o.userData.part==='observed-water-meter').map(o=>[o.userData.apartment,o.userData.capOpen]),[[4,false],[3,true]]);
   assert.equal(last.filter(o=>o.userData.part==='observed-meter-valve-handle').length,4);
   assert.equal(last.filter(o=>o.userData.part==='observed-meter-floor-drain').length,1);
   for(const part of ['observed-meter-open-cover','observed-meter-closed-cover','observed-meter-apartment-tag'])assert(last.some(o=>o.userData.part===part));
  }finally{scene.dispose();}
 }
 const closed=createHomeScene(normalizeHomeSettings({openParts:[]}),{mode:'walk'});
 try{
  closed.group.updateMatrixWorld(true);for(const c of E.cabinets){const ray=new THREE.Raycaster(new THREE.Vector3(c.x-.16,1.3,c.z-1),new THREE.Vector3(0,0,1)),hits=ray.intersectObjects(closed.picks);assert.equal(hits[0].object.userData.action,'part');assert(hits[0].object.userData.partId.startsWith(c.id+':'));}
 }finally{closed.dispose();}
});

test('the final cabinet contains the photographed meter arrangement with accessible 3D picking and no fabricated reading',()=>{
 const c=E.cabinets[2],scene=createHomeScene(normalizeHomeSettings({openParts:c.parts.map(p=>p.id),furniture:false}),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);const g=scene.buildingGroups.get(c.id),items=[];g.traverse(o=>items.push(o));
  const meters=items.filter(o=>o.userData.part==='observed-water-meter');assert.equal(meters.length,2);
  const top=meters.find(o=>o.userData.apartment===4),bottom=meters.find(o=>o.userData.apartment===3);
  assert(new THREE.Box3().setFromObject(top).getCenter(new THREE.Vector3()).y>new THREE.Box3().setFromObject(bottom).getCenter(new THREE.Vector3()).y);
  assert(!top.children.some(o=>o.userData.part==='observed-meter-dial'),'closed upper lid hides the dial');assert(bottom.children.some(o=>o.userData.part==='observed-meter-dial'));
  assert(items.filter(o=>o.userData.part==='meter-dial-detail-illustration').every(o=>o.userData.illustrative&&!o.userData.observed));assert(!items.some(o=>'reading' in o.userData));
  for(const mesh of items.filter(o=>o.isMesh&&o.userData.observed)){
   const b=new THREE.Box3().setFromObject(mesh);assert(b.min.x>=c.x-c.w/2-.001&&b.max.x<=c.x+c.w/2+.001,`${mesh.userData.part} fits cabinet width`);assert(b.min.z>=c.z-.001&&b.max.z<=c.z+c.d+.001,`${mesh.userData.part} fits cabinet depth`);assert(b.min.y>=c.bottom-.001&&b.max.y<=c.bottom+c.h+.001,`${mesh.userData.part} fits cabinet height`);
  }
  const ray=new THREE.Raycaster(new THREE.Vector3(c.x+.02,.93,c.z-1),new THREE.Vector3(0,0,1)),hits=ray.intersectObjects(scene.picks);
  assert(hits.length);assert.equal(hits[0].object.userData.buildingId,c.id);assert.equal(hits[0].object.userData.action,'building');assert.equal(hits[0].object.userData.apartment,4,'open doors expose the upper meter for inspection');
  assert(g.userData.inspectionView.target[1]<1,'focus looks down at the meters and drain');
 }finally{scene.dispose();}
});

test('walking can cross only the open existing apartment entrance and cannot cross cabinets or opened service leaves',()=>{
 const door=DOORS.find(d=>d.id==='entry'),[x,z]=openingPoint(door),before=[x-.4,z],after=[x+.65,z],open=collisionBoxes(['entry'],false),closed=collisionBoxes([],false);
 assert(canStand(after,open));assert.equal(roomAt(after),'living');let p=[...before];for(let i=0;i<30;i++)p=movePlayer(p,[.04,0],closed);assert(p[0]<x);p=[...before];for(let i=0;i<30;i++)p=movePlayer(p,[.04,0],open);assert(p[0]>x+.4);
 for(const c of E.cabinets){assert(!canStand([c.x,c.z+.25],open));assert(entryDoorBlocked(E,c.parts[0].id,{x:c.x,z:c.z-.15}));assert(!entryDoorBlocked(E,c.parts[0].id,{x:c.x,z:c.z-1}));}
 const c=E.cabinets[0],withLeaf=collisionBoxes(['entry'],false,[],[c.parts[0].id]);assert(!canStand([c.x-c.w/2,c.z-c.w/4],withLeaf));assert(!canStand([E.context.maxX+.5,z],open));
});

test('the neighbour wall and coping stop before the common entrance in every view and saved fence design',()=>{
 const run=GARDEN_LAYOUT.fence.runs.find(r=>r.id==='fence-east'),plot=polygonBounds(PLOT),entry=polygonBounds(PUBLIC_ENTRY);
 assert.deepEqual(run.a,[plot.maxX,plot.maxZ]);assert.deepEqual(run.b,point(1277.82,159.1));
 assert.equal(run.b[1],entry.maxZ);assert.equal(run.length,run.a[1]-run.b[1]);
 assert.equal(gardenElement(run.id).dimensions[0],run.length,'inspector measures only the retained wall');
 const alcove=new THREE.Box3(new THREE.Vector3(E.context.minX,0,E.context.minZ),new THREE.Vector3(E.context.maxX,E.ceiling,E.context.maxZ));
 const commonEntry=new THREE.Box3(new THREE.Vector3(entry.minX,0,entry.minZ),new THREE.Vector3(entry.maxX,E.ceiling,entry.maxZ-.001));
 for(const mode of ['overview','room','walk'])for(const cutaway of [true,false])for(const openParts of [[],E.parts.map(p=>p.id)]){
  const settings=normalizeHomeSettings({cutaway,openParts,yardDesign:{fence:{h:1.8,color:'#4a4a4a'}}}),scene=createHomeScene(settings,{mode});
  try{
   assert.deepEqual(yardForSettings(settings).garden.fence.runs,GARDEN_LAYOUT.fence.runs);
   scene.group.updateMatrixWorld(true);const wall=scene.gardenGroups.get(run.id),wallBox=new THREE.Box3().setFromObject(wall);
   assert(Math.abs(wallBox.min.z-run.b[1])<1e-5);assert(Math.abs(wallBox.max.z-run.a[1])<1e-5);
   for(const mesh of wall.children){const b=new THREE.Box3().setFromObject(mesh);assert(!b.intersectsBox(alcove),`${mesh.userData.part} clears the complete alcove`);assert(!b.intersectsBox(commonEntry),`${mesh.userData.part} clears the original entrance notch`);}
   for(const c of E.cabinets){assert(!wallBox.intersectsBox(new THREE.Box3().setFromObject(scene.buildingGroups.get(c.id))),`${c.id} and its open doors clear the garden wall`);}
   // Walk in front of the opened leaves, keeping the actual door obstacles.
   const z=openingPoint(DOORS.find(d=>d.id==='entry'))[1]-.25,boxes=collisionBoxes(['entry'],false,[],openParts);
   for(const x of [plot.maxX-.25,plot.maxX,plot.maxX+.25])assert(canStand([x,z],boxes),'the former wall line is a continuous walkable entrance');
  }finally{scene.dispose();}
 }
});

test('entrance references keep the original photos and video with exact hashes, independent of the old house walkthrough',()=>{
 const record=JSON.parse(readFileSync(new URL('../public/house/entry-services/provenance.json',import.meta.url)));assert.equal(record.metricSurvey,false);assert.equal(record.videoInteriorObserved,false);
 for(const r of record.items){const file=new URL('../public/house/entry-services/'+r.file,import.meta.url);assert(existsSync(file));assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),r.sha256);}
 assert.equal(ENTRY_SOURCE.videoPage,10);assert(ENTRY_SOURCE.video.endsWith('298240.mp4'));assert(ENTRY_SOURCE.videoNoteEn.includes('closed'));assert.deepEqual(ENTRY_SOURCE.pages,[1,2,3,4,10]);
 assert(record.items.some(r=>r.file==='298252.jpg'));assert(record.lastCabinetAssignment.includes('Upper meter tag 4'));
});
