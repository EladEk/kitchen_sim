import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OPENING_SCHEDULE,BUILDING_SPEC} from './home-building-spec.mjs';
import {DOORS,WINDOWS,HOUSE,normalizeHomeSettings} from './home-model.mjs';
import {createHomeScene} from './home-scene.js';
import {HOUSE_SOURCES} from './home-products.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('RG/RG1 opening schedule updates rendered heights without inventing ceiling or sill measurements',()=>{
 const scene=createHomeScene(normalizeHomeSettings({openDoors:[]}),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);
  for(const o of [...DOORS,...WINDOWS]){assert(OPENING_SCHEDULE[o.id]);assert.equal(o.schedule.source,'apartment-spec');assert([16,17].includes(o.schedule.page));}
  for(const id of ['bed-a-window','bed-b-window','master-window','bed-c-window','kitchen-window','utility-window']){
   const definition=WINDOWS.find(w=>w.id===id);assert.equal(definition.height,1.25);assert.equal(definition.sillInferred,true);
   let frame;scene.group.traverse(o=>{if(o.userData.windowId===id)frame=o;});assert(frame);
   const head=frame.children.find(o=>o.userData.part==='window-head'),sill=frame.children.find(o=>o.userData.part==='window-sill');
   const top=new THREE.Vector3(),bottom=new THREE.Vector3();head.getWorldPosition(top);sill.getWorldPosition(bottom);assert(Math.abs(top.y-bottom.y-1.25)<.001,'construction height is retained across the two sash profiles');
   let panes=0;frame.traverse(o=>{if(o.userData.glazing){const bounds=new THREE.Box3().setFromObject(o);assert(bounds.min.y>bottom.y&&bounds.max.y<top.y,'glass fits inside the opening profiles');panes++;}});assert(panes>=1);
  }
  assert.equal(WINDOWS.find(w=>w.id==='ensuite-window').height,.9);assert.equal(WINDOWS.find(w=>w.id==='safe-window').height,1);
  for(const [id,height] of [['bed-a',2.1],['bed-b',2.1],['safe',2],['service-exit',2.3]]){
   const leaf=scene.motions.find(m=>m.id===`door:${id}`).object.children[0],size=new THREE.Box3().setFromObject(leaf).getSize(new THREE.Vector3());assert(Math.abs(size.y-(height-.025))<.001);
  }
  assert.equal(BUILDING_SPEC.minimumHeight,2.5);assert.equal(BUILDING_SPEC.minimumServiceHeight,2.05);assert.equal(HOUSE.height,2.75,'minimum is not substituted for the unmeasured actual ceiling');
 }finally{scene.dispose();}
});

test('bathroom tile surfaces stop at door-frame height, guest WC surfaces at 120 cm',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'}),tops=new Map();
 try{
  scene.group.updateMatrixWorld(true);
  scene.group.traverse(o=>{if(o.userData.wallTile){const id=o.userData.roomId,bounds=new THREE.Box3().setFromObject(o),expected=id==='powder'?1.2:2.1;assert(bounds.max.y<=expected+.001);tops.set(id,Math.max(tops.get(id)||0,bounds.max.y));}});
  for(const [id,expected] of [['bathroom',2.1],['ensuite',2.1],['powder',1.2]])assert(Math.abs(tops.get(id)-expected)<.001,`${id} cladding has its scheduled top`);
 }finally{scene.dispose();}
});

test('new source previews use actual PDF page numbers and retain original PDF bytes',()=>{
 for(const [id,digest,pages] of [['apartment-spec','5c7d7ec1e85d73ee89d3d8df171c087d1bb1d4c00b418fd8eb6a290204df6b2f',[11,12,16,17,26,30,31,32,33,34]],['building-plan','17b91da71d113f1ef3f8bbb2fd9a472354c357c59ff0046422451a3857022f73',[2,3,4,5,6,7,8,9,10,11]]]){
  const source=HOUSE_SOURCES.find(s=>s.id===id);assert.deepEqual(source.pages,pages);
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../public${source.pdf}`,import.meta.url))).digest('hex'),digest);
  for(const page of pages)assert(existsSync(new URL(`../public${source.imagePrefix}${page}.jpg`,import.meta.url)));
 }
 assert.deepEqual(BUILDING_SPEC.bedroomNumbers,{master:1,'bedroom-a':2,'bedroom-b':3,'bedroom-c':4,'safe-room':5});
});
