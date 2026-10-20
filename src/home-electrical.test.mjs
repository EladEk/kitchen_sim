import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {ELECTRICAL_LAYOUT as E,WALLS,WINDOWS,DOORS,ROOMS,normalizeHomeSettings,electricalPoint,collisionBoxes} from './home-model.mjs';
import {ELECTRICAL_KINDS,ELECTRICAL_REFERENCES,electricalVisible,electricalPlanMarkers} from './home-electrical.mjs';
import {createHomeScene} from './home-scene.js';
import {closeAllStudioOpenings} from './studio-state.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);

test('every electrical observation has stable identity, source evidence, and explicit estimate flags',()=>{
 assert.equal(E.points.length,48);assert.equal(new Set(E.points.map(p=>p.id)).size,E.points.length);
 for(const p of E.points){
  assert(electricalPoint(p.id)===p);assert(ELECTRICAL_KINDS[p.kind]);assert(ROOMS.some(r=>r.id===p.roomId));assert(p.positionInferred);assert(p.dimensionsInferred);
  assert(p.evidence.length>0);for(const e of p.evidence){assert(ELECTRICAL_REFERENCES.some(s=>s.page===e.page));const [x,y,w,h]=e.rect;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1,`${p.label} has a source-normalized rectangle`);}
  if(['bedroom-a','bedroom-b','bedroom-c'].includes(p.roomId))assert(p.roomInferred,'numbered room assignment remains provisional');
 }
 assert.equal(E.points.filter(p=>p.evidence.some(e=>e.page===3)).length,0,'no invented outlets in the obscured doorway photo');
 assert.equal(electricalPoint('electrical-H04').kind,'preparation','open wired boxes do not become confirmed switches');
});

test('all estimated placements sit on a real wall span and avoid existing door/window apertures',()=>{
 for(const p of E.points){
  const w=WALLS.find(w=>w.id===p.wallId),vertical=Math.abs(w.a[0]-w.b[0])<.001,position=p.observedPosition||p.position,height=p.observedHeight||p.height,axis=vertical?1:0,q=position[vertical?2:0];assert(w);assert(q>=w.a[axis]&&q<=w.b[axis],`${p.label} survey origin remains on its host wall`);
  const normalAxis=vertical?0:2;near(position[normalAxis],w.a[vertical?0:1]+p.side*(w.thickness/2+.033));
  for(const o of [...WINDOWS,...DOORS].filter(o=>o.wallId===p.wallId))assert(!(q>o.start&&q<o.end&&height>o.sill&&height<o.sill+o.height),`${p.label} is not inside ${o.id}`);
 }
});

test('plan callouts separate adjacent boxes and stacked elevations without moving real anchors',()=>{
 const before=JSON.stringify(E.points.map(p=>p.position)),markers=electricalPlanMarkers(E.points);assert.equal(markers.length,E.points.length);
 for(let i=0;i<markers.length;i++)for(let j=0;j<i;j++)assert(Math.hypot(markers[i].x-markers[j].x,markers[i].z-markers[j].z)>=.37-1e-6,'independent SVG hit targets do not collapse');
 assert.equal(before,JSON.stringify(E.points.map(p=>p.position)));
 const a=markers.find(m=>m.point.label==='M05'),b=markers.find(m=>m.point.label==='M06');assert(Math.hypot(a.x-b.x,a.z-b.z)>.37);
});

test('electrical layer and provisional-room filter persist through imports and Close all',()=>{
 const settings=normalizeHomeSettings({showElectrical:false,electricalInferred:false,openDoors:['entry'],openParts:['wardrobe-a:left']}),again=normalizeHomeSettings(JSON.parse(JSON.stringify(settings)));
 assert.equal(again.showElectrical,false);assert.equal(again.electricalInferred,false);
 assert(E.points.every(p=>!electricalVisible(p,again)));const certain=normalizeHomeSettings({electricalInferred:false});assert(E.points.some(p=>!p.roomInferred&&electricalVisible(p,certain)));assert(E.points.filter(p=>p.roomInferred).every(p=>!electricalVisible(p,certain)));
 const closed=closeAllStudioOpenings({getItem:()=>null,setItem:()=>{}},{home:again}).home;assert.equal(closed.showElectrical,false);assert.equal(closed.electricalInferred,false);assert.deepEqual(closed.openDoors,[]);
});

test('actual 3D markers are independently inspectable, permanent with furniture hidden, and hidden by the electrical toggle',()=>{
 const scene=createHomeScene(normalizeHomeSettings({furniture:false}),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);
  for(const e of E.points){const p=scene.gardenGroups.get(e.id);assert(p);p.position.toArray().forEach((v,i)=>near(v,e.position[i]));assert(scene.picks.some(m=>m.userData.electricalId===e.id));
   const view=p.userData.inspectionView;assert(e.relocation?view.target[2]-view.from[2]>1:(view.from[0]-view.target[0])*e.normal[0]+(view.from[2]-view.target[2])*e.normal[1]>1);
   const pin=p.children.find(m=>m.userData.part==='electrical-annotation-hit');assert(pin.material.depthTest===false,'annotation remains visible behind existing furniture');
   assert(!new THREE.Box3().setFromObject(p).isEmpty());
  }
 }finally{scene.dispose();}
 const hidden=createHomeScene(normalizeHomeSettings({showElectrical:false}));try{assert(E.points.every(p=>!hidden.gardenGroups.has(p.id)));assert(hidden.doorGroups.has('service-exit'));}finally{hidden.dispose();}
 const filtered=createHomeScene(normalizeHomeSettings({electricalInferred:false}));try{assert(E.points.every(p=>filtered.gardenGroups.has(p.id)===!p.roomInferred));}finally{filtered.dispose();}
 assert(collisionBoxes().every(b=>!b.electricalId),'annotation layer adds no new walking obstacle');
});

test('duplicate source views share one ID and source images, video times and provenance are portable',()=>{
 const file=p=>new URL(`../public${p}`,import.meta.url),record=JSON.parse(readFileSync(file('/house/electrical/provenance.json')));
 assert.equal(record.metricSurvey,false);assert.equal(record.items.filter(i=>i.second!=null).length,12);
 for(const s of ELECTRICAL_REFERENCES){assert(existsSync(file(s.image)));if(s.second!=null){assert(s.second>=0&&s.second<32.332896);const bytes=readFileSync(file(s.image)),r=record.items.find(r=>r.second===s.second);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);}}
 assert(E.points.find(p=>p.label==='K01').evidence.length===2);assert(E.points.filter(p=>p.label==='K01').length===1);
 assert(E.points.find(p=>p.label==='S03').evidence.some(e=>e.page===9));assert(E.points.find(p=>p.label==='S03').evidence.some(e=>e.page===13));
});

test('the additional 277903 photo has five established IDs, retains original bytes and does not count hidden sockets or a reattached video twice',()=>{
 const source=ELECTRICAL_REFERENCES.find(r=>r.page===21),bytes=readFileSync(new URL(`../public${source.image}`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);assert.equal(source.width,1536);assert.equal(source.height,1152);
 const ids=E.points.filter(p=>p.evidence.some(e=>e.page===21)).map(p=>p.label);assert.deepEqual(ids,['K06','K08','K09','K10','H02']);assert.equal(E.points.length,48);assert(!E.points.find(p=>p.label==='K07').evidence.some(e=>e.page===21));
 const boxes=E.points.flatMap(p=>p.evidence.filter(e=>e.page===21).map(e=>({label:p.label,rect:e.rect})));for(const a of boxes)for(const b of boxes.filter(b=>b!==a)){const [x,y,w,h]=a.rect,[u,v,s,t]=b.rect;assert(Math.min(x+w,u+s)<=Math.max(x,u)||Math.min(y+h,v+t)<=Math.max(y,v));}
 const provenance=JSON.parse(readFileSync(new URL('../public/house/electrical/provenance.json',import.meta.url)));assert.equal(provenance.items.find(i=>i.file==='kitchen-hall-277903.jpg').sha256,source.sha256);const video=readFileSync(new URL('../public/house/photos/walkthrough.mp4',import.meta.url));assert.equal(createHash('sha256').update(video).digest('hex'),provenance.additionalReview.portableVideoSha256);
 for(const id of ['K06','K08','K09','K10'])assert(E.points.find(p=>p.label===id).evidence.some(e=>e.page===1),'earlier evidence remains accessible');
});

test('H02 is mounted on the living-facing wall across the hall entrance while K09 keeps its separate proposed oven-side connection',()=>{
 const h=E.points.find(p=>p.label==='H02'),k=E.points.find(p=>p.label==='K09'),low=E.points.find(p=>p.label==='K10');assert.equal(h.roomId,'living');assert.equal(h.wallId,'bed-a-north');assert.equal(h.kind,'outlet');assert.deepEqual(h.normal,[0,-1]);assert(h.position[0]<k.observedPosition[0]-1);assert(h.position[2]<k.observedPosition[2]-.9);assert.equal(h.page,21);assert(h.positionInferred);assert.equal(h.height,2.2);assert(h.positionNoteHe.includes('משוערים'));
 assert.equal(k.kind,'preparation');assert.equal(k.height,1.65);assert.equal(k.observedHeight,1.15);assert.equal(k.relocation.accessPart,'oven:lift-up');near(k.observedPosition[0],low.position[0]);assert.equal(k.page,21);
 const scene=createHomeScene(normalizeHomeSettings({furniture:false}));try{scene.group.updateMatrixWorld(true);const node=scene.gardenGroups.get(h.id);assert.deepEqual(node.position.toArray(),h.position);assert(scene.picks.some(m=>m.userData.electricalId===h.id));assert(node.userData.inspectionView.from[2]<h.position[2]);}finally{scene.dispose();}
});
