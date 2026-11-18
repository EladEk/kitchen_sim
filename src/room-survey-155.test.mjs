import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {existsSync} from 'node:fs';
import {ROOM_SURVEY_SOURCES,SURVEY_ELEMENTS} from './room-survey-155.mjs';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings,ELECTRICAL_LAYOUT} from './home-model.mjs';
import {buildGroundApartments} from './ground-apartments-scene.js';

test('survey appliances survive furniture hiding in both owner scene and public garden template',()=>{
 const own=createHomeScene(normalizeHomeSettings({furniture:false,cutaway:false}),{mode:'walk'});
 const root=new THREE.Group(),resources=[];
 try{
  buildGroundApartments({root,resources,picks:[],settings:{furniture:false,apartmentFurnishing:false},mode:'walk',units:[1,2,3]});
  for(const e of SURVEY_ELEMENTS){assert(own.buildingGroups.has(e.id));const source=ROOM_SURVEY_SOURCES.find(s=>s.id===e.source);assert(source.pages.includes(e.page));}
  const parts=[];root.traverse(o=>{if(o.userData.part)parts.push(o.userData.part)});
  assert.equal(parts.filter(p=>p==='observed-split-ac').length,6,'two permanent AC bodies in each of three garden replicas');
  assert(!parts.includes('ground-base-kitchen'),'owner cabinetry never enters the unfurnished public template');
  assert(parts.includes('intercom-handset'),'public services render the new handset');
  for(const id of ['electrical-B06','electrical-A06','electrical-O08'])assert(ELECTRICAL_LAYOUT.points.find(p=>p.id===id).kind==='control');
 }finally{own.dispose();resources.forEach(r=>r.dispose?.());}
});
test('new reference media resolve locally and guest WC points at its confirmed photo',()=>{
 for(const s of ROOM_SURVEY_SOURCES){for(const ref of s.references||[])assert(existsSync(new URL('../public'+ref.image,import.meta.url)));if(s.video)assert(existsSync(new URL('../public'+s.video,import.meta.url)));}
 const wc=SURVEY_ELEMENTS.find(e=>e.roomId==='powder'),source=ROOM_SURVEY_SOURCES.find(s=>s.id===wc.source);
 assert(source.references.find(r=>r.page===wc.page).image.endsWith('/338853.jpg'));
});
