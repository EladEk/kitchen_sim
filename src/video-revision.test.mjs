import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
import {DEFAULTS} from './model.mjs';
import {HOUSE,ROOMS,WINDOWS,KITCHEN_ANCHOR,ELECTRICAL_LAYOUT as E,normalizeHomeSettings} from './home-model.mjs';
import {HVAC_PROFILE} from './hvac-profile.mjs';
import {PHOTO_REFERENCES,OBSERVED_ELEMENTS} from './home-photo-reference.mjs';
import {ELECTRICAL_REFERENCES} from './home-electrical.mjs';
import {ELECTRICAL_ROOM_REVIEWS} from './electrical-video-review.mjs';
import {objectVisible} from './kitchen-visibility.mjs';

// Canvas is only used for existing hood decals in this geometry-only test.
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

const find=(root,part)=>{const out=[];root.traverse(o=>{if(o.userData.part===part)out.push(o);});return out;};
const point=id=>E.points.find(p=>p.label===id);
const window=id=>WINDOWS.find(w=>w.id===id);
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);
const bounds=o=>new THREE.Box3().setFromObject(o);

test('both actual scenes put the large louvred grille over the hall opening, with a deeper entry projection and a separate controller',()=>{
 const home=createHomeScene(normalizeHomeSettings({furniture:false}),{mode:'walk'}),kitchen=createKitchen({...DEFAULTS,cabinetVisibility:'hidden'});
 try{
  home.group.updateMatrixWorld(true);kitchen.group.updateMatrixWorld(true);
  const h=home.buildingGroups.get('kitchen-hvac'),k=find(kitchen.group,'kitchen-hvac')[0],hall=ROOMS.find(r=>r.id==='hall'),mouth=[hall.polygon[0][0],hall.polygon[1][0]];
  for(const root of [h,k]){
   assert.equal(find(root,'hvac-bulkhead').length,2);assert.equal(find(root,'hvac-grille').length,2);assert.equal(find(root,'hvac-controller').length,1);
   const [work,entry]=find(root,'hvac-bulkhead'),large=find(root,'hvac-grille').find(o=>o.userData.hvacGrille==='hall-large');
   const workSize=work.geometry.parameters,entrySize=entry.geometry.parameters;
   assert(entrySize.depth>workSize.depth+.4,'the hall section projects farther toward the living space');
   near(work.position.x+workSize.width/2,entry.position.x-entrySize.width/2);
   assert(large.position.x-large.children[0].geometry.parameters.width/2>work.position.x+workSize.width/2,'large grille is beyond the kitchen work run');
   const blades=find(large,'hvac-horizontal-louvre');assert(blades.length>15);assert(blades.every(b=>b.geometry.parameters.width>100*b.geometry.parameters.height));
   assert.equal(find(root,'hvac-controller-display').length,1);assert.equal(find(root,'hvac-controller-key').length,4);
   root.traverse(o=>{if(o.isMesh)assert(o.material.opacity===1&&objectVisible(o),'hiding furniture does not hide or ghost permanent HVAC');});
   near(bounds(root).min.y,2.42);assert(bounds(root).max.y<=HOUSE.height+1e-5);
  }
  const large=find(h,'hvac-grille').find(o=>o.userData.hvacGrille==='hall-large'),c=large.getWorldPosition(new THREE.Vector3());
  assert(c.x>mouth[0]&&c.x<mouth[1],'actual transformed grille centre is above the plan hall mouth');
  assert(c.z<KITCHEN_ANCHOR[1]-.9,'hall grille is on the forward face, not the work-run plane');
  for(const part of ['hvac-bulkhead','hvac-grille','hvac-controller']){
   const a=find(h,part),b=find(k,part);for(let i=0;i<a.length;i++){
    const homeLocal=h.worldToLocal(a[i].getWorldPosition(new THREE.Vector3())),kitchenLocal=k.worldToLocal(b[i].getWorldPosition(new THREE.Vector3()));
    homeLocal.toArray().forEach((v,j)=>near(v,kitchenLocal.toArray()[j]));
   }
  }
  assert(kitchen.roomStructure.has(k));assert(!kitchen.furnishingRoots.includes(k));
  const observation=OBSERVED_ELEMENTS.find(e=>e.id==='kitchen-hvac');assert.equal(observation.page,HVAC_PROFILE.photoPage);assert(observation.noteEn.includes('estimates'));
  assert(PHOTO_REFERENCES.find(r=>r.page===observation.page).image.endsWith('kitchen-hall-277903.jpg'));
 }finally{home.dispose();kitchen.dispose();}
});

test('window-relative sockets face into the photographed rooms and numbered-room matches remain provisional',()=>{
 const wa=window('bed-a-window'),wb=window('bed-b-window'),wo=window('bed-c-window');
 for(const id of ['A01','A02','A03']){const p=point(id);assert.equal(p.roomId,'bedroom-b');assert(p.roomInferred);assert(p.position[2]<wb.start);assert.deepEqual(p.normal,[1,0]);}
 assert(point('A01').position[2]>point('A02').position[2]);assert(point('A02').position[2]>point('A03').position[2]);
 for(const p of E.points.filter(p=>p.label.startsWith('B'))){assert.equal(p.roomId,'bedroom-a');assert(p.roomInferred);}
 assert(point('B03').position[2]>wa.end,'first room fitting stays on the south/right side of its west-facing window');
 assert(point('B01').position[0]>point('B02').position[0]);assert(point('B02').position[0]>point('B04').position[0]);assert(point('B04').position[0]>point('B05').position[0]);
 assert(point('O01').position[0]>wo.end,'image-left is east when looking at the south wall');
 assert(point('O02').position[0]<wo.start+.25);assert(point('O03').position[0]<point('O02').position[0]);
 for(const id of ['O04','O05']){assert.equal(point(id).wallId,'master-east');assert.deepEqual(point(id).normal,[1,0]);}
 for(const id of ['A01','B03','O01'])assert.equal(point(id).kind,'preparation','a bare/unreadable fitting is not promoted to a confirmed switch');
});

test('safe-room side groups, the main-bedroom rear wall and the hall fitting use the correct wall faces without changing source identities',()=>{
 for(const id of ['S01','S02','S03','S04','S06']){assert.equal(point(id).wallId,'wet-east');assert.deepEqual(point(id).normal,[-1,0]);}
 const sw=window('safe-window');assert.equal(point('S05').wallId,sw.wallId);assert(point('S05').position[0]>sw.start&&point('S05').position[0]<sw.end);assert(point('S05').height<sw.sill);
 for(const id of ['M01','M02','M03','M04']){assert.equal(point(id).wallId,'south');assert.deepEqual(point(id).normal,[0,-1]);}
 assert(point('M04').position[0]<.5,'corner outlet stays beside the west window wall');assert(point('M03').position[0]>2.8,'three rear-wall preparations remain at the other end');
 assert.equal(point('M04').evidence[0].page,24);assert(point('M04').evidence.some(e=>e.page===6),'the original photograph is retained');
 assert.equal(point('H01').wallId,'bed-b-east');assert.deepEqual(point('H01').normal,[1,0]);
 assert.equal(E.points.length,51);assert(!point('K05'));assert.equal(point('K09').height,1.65);
});

test('the review covers every room, retains original-video provenance and links only indoor rooms to video intervals',()=>{
 assert.deepEqual(new Set(ELECTRICAL_ROOM_REVIEWS.map(r=>r.roomId)),new Set(ROOMS.map(r=>r.id)));
 assert.equal(ELECTRICAL_ROOM_REVIEWS.length,ROOMS.length);
 for(const row of ELECTRICAL_ROOM_REVIEWS){assert(row.he&&row.en);if(row.second!=null)assert(row.second>=0&&row.second<E.reviewedVideo.duration);if(row.page)assert(ELECTRICAL_REFERENCES.some(s=>s.page===row.page));}
 for(const id of ['garden','terrace']){const row=ELECTRICAL_ROOM_REVIEWS.find(r=>r.roomId===id);assert.equal(row.second,undefined);assert(row.page);}
 const provenance=JSON.parse(readFileSync(new URL('../public/house/electrical/provenance.json',import.meta.url)));
 assert.equal(provenance.fullResolutionReview.sha256,'f29792fe1aa136a45b9902e9328698468627c4c8209e6a805a462de800108d45');
 assert.deepEqual(provenance.fullResolutionReview.displaySize,[1080,1920]);assert.equal(provenance.fullResolutionReview.metricSurvey,false);
 for(const second of [15,16.5,24,28])assert(provenance.items.some(i=>i.second===second&&i.reviewRevision===29));
});
