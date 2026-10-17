import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EXTERIOR_LAYOUT as E,SERVICE_YARD as Y,HOUSE,WALLS,WINDOWS,DOORS,point,polygonBounds,getRoom,findWalkPath,collisionBoxes,canStand,normalizeHomeSettings,gardenElement} from './home-model.mjs';
import {EXTERIOR_SOURCE} from './home-exterior-layout.mjs';
import {HOUSE_SOURCES} from './home-products.mjs';
import {createHomeScene} from './home-scene.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);
const intersects=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return {minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,minY:b.min.y,maxY:b.max.y};};

test('covered service porch and open kitchen court use different plan-derived depths',()=>{
 near(E.porch.width,1.600020833333333);near(E.porch.depth,1.9994625);near(E.court.width,1.489941666666667);near(E.court.depth,3.299108333333333);
 near(E.porch.maxZ,point(1184.28,561.58)[1]);near(E.court.maxZ,E.porch.maxZ);
 const w=WALLS.find(w=>w.id===E.returnWall.id);assert(w.external);near(w.a[0],E.porch.maxX+.1);near(w.b[1],E.porch.maxZ);
 assert(gardenElement(E.court.id).noteEn.includes('distinct from the window-frame reveal'));
 assert(gardenElement(E.porch.id).doorId==='service-exit');assert.equal(DOORS.filter(d=>d.id==='service-exit').length,1);
});

test('porch return blocks crossing the recess; paths use its open mouth and reach both AC-side yard and chamber',()=>{
 const opened=DOORS.map(d=>d.id),boxes=collisionBoxes(opened,false),p=E.porch,c=E.court;
 assert(!canStand([E.returnWall.worldX,(p.minZ+p.maxZ)/2],boxes));
 const goal=[(c.minX+c.maxX)/2,c.minZ+.7],path=findWalkPath(getRoom('laundry').walk,goal,false);
 assert(path?.length);assert(path.some(q=>q[1]>p.maxZ+.15),'route goes around the return wall end');for(const q of path)assert(canStand(q,boxes));
 assert(findWalkPath(getRoom('laundry').walk,Y.manhole.position)?.length);
 for(const a of E.units)assert(!canStand([a.x,a.z],boxes),'permanent condenser bodies obstruct walking even with furniture hidden');
});

test('only the service porch receives a ceiling and stone cladding respects both existing windows and the door',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);const p=scene.gardenGroups.get(E.porch.id),c=scene.gardenGroups.get(E.court.id),ceiling=p.children.find(o=>o.userData.part==='service-porch-ceiling');
  assert(ceiling);const b=bounds(ceiling);near(b.minY,E.porch.ceiling);assert(b.minY>DOORS.find(d=>d.id==='service-exit').height);assert(b.maxY<HOUSE.height);
  assert(!c.children.some(o=>o.userData.part?.includes('ceiling')));
  for(const parent of [p,c])for(const mesh of parent.children.filter(o=>o.userData.part==='exterior-stone-cladding')){
   const [a,z,bottom,top]=mesh.userData.span;
   for(const o of [...WINDOWS,...DOORS].filter(o=>o.wallId===mesh.userData.wallId))assert(!(a<o.end-.0001&&z>o.start+.0001&&bottom<o.sill+o.height-.0001&&top>o.sill+.0001),`stone leaves ${o.id} open`);
  }
  for(const id of ['kitchen-window','utility-window'])assert(c.children.filter(o=>o.userData.part==='stone-window-jamb'&&o.userData.openingId===id).length===2);
  for(const id of [p.userData.buildingId,c.userData.buildingId]){const view=scene.gardenGroups.get(id).userData.inspectionView;near(view.from[1],HOUSE.eyeHeight);assert(view.from[2]>view.target[2]);}
 }finally{scene.dispose();}
 const cutaway=createHomeScene(normalizeHomeSettings());try{assert(!cutaway.gardenGroups.get(E.porch.id).children.some(o=>o.userData.part==='service-porch-ceiling'));}finally{cutaway.dispose();}
});

test('two distinct condensers follow the photographed order, face outward and preserve unknown dimensions',()=>{
 assert.equal(E.units.length,2);const [large,small]=E.units;assert(large.z>small.z);assert(large.h>small.h);near(large.z,point(1104.48,660.94)[1]);
 const scene=createHomeScene(normalizeHomeSettings({furniture:false}),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);
  for(const a of E.units){
   const p=scene.gardenGroups.get(a.id),body=p.children.find(o=>o.userData.part==='ac-body'),fan=p.children.find(o=>o.userData.part==='ac-fan'),b=bounds(body);
   near(b.maxX-b.minX,a.d);near(b.maxZ-b.minZ,a.w);near(b.maxY-b.minY,a.h);near(b.minY,a.bottom);assert(bounds(fan).minX>b.maxX);
   assert(p.children.some(o=>o.userData.part==='ac-bracket'));assert(scene.picks.some(o=>o.userData.buildingId===a.id));
   assert.equal(p.children.find(o=>o.userData.part==='ac-front-planning-reserve').userData.manufacturerVerified,false);
   assert(gardenElement(a.id).dimensionsInferred);assert(gardenElement(a.id).noteEn.includes('Models and dimensions are unknown'));assert(gardenElement(a.id).noteEn.includes('not a verified manufacturer requirement'));
  }
 }finally{scene.dispose();}
});

test('shortened neighbour-side shed and full inward door sweep avoid both proposed AC frontage reserves',()=>{
 const s=Y.shed;near(s.d,2.5);near(s.w,2);near((s.w-.12)*(s.d-.12),1.88*2.38);assert.equal(s.door.hinge,'end');assert.equal(s.door.swing,1);
 for(const a of E.units){assert(!intersects(polygonBounds(s.polygon),a.front));assert(!intersects(polygonBounds(Y.manhole.access),a.body));assert(s.minZ>a.front.maxZ);}
 const scene=createHomeScene(normalizeHomeSettings({openParts:Y.parts.map(p=>p.id)}),{mode:'walk'});
 try{
  const door=scene.motions.find(m=>m.id===s.door.id);assert(door);
  for(let i=0;i<=16;i++){
   door.object.rotation.y=i*Math.PI*.49/16;scene.group.updateMatrixWorld(true);const b=bounds(door.object);
   for(const a of E.units)assert(!intersects(b,a.front),'door never swings into AC frontage');
   assert(!intersects(b,s.shelves),'right-hinge inward leaf clears shelves');
   for(const a of s.appliances)assert(!intersects(b,{minX:a.x-a.w/2,maxX:a.x+a.w/2,minZ:a.z-a.d/2,maxZ:a.z+a.d/2}));
  }
  scene.group.updateMatrixWorld(true);
  for(const id of ['garden-shed','shed-fridge','shed-freezer'])scene.gardenGroups.get(id).traverse(o=>{if(o.isMesh)for(const a of E.units)assert(!intersects(bounds(o),a.front),`${id} clears AC planning reserve`);});
 }finally{scene.dispose();}
});

test('new source images and plan crop stay portable with original-file hashes and explicit evidence limits',()=>{
 assert(HOUSE_SOURCES.some(s=>s.id===EXTERIOR_SOURCE.id));const file=p=>new URL(`../public${p}`,import.meta.url),record=JSON.parse(readFileSync(file('/house/exterior/provenance.json')));
 assert.equal(record.acModelsIdentified,false);assert.equal(record.measuredAcSizes,false);
 for(const page of EXTERIOR_SOURCE.pages){const bytes=readFileSync(file(`${EXTERIOR_SOURCE.imagePrefix}${page}.jpg`)),item=record.items.find(i=>i.page===page);assert.equal(bytes.readUInt16BE(0),0xffd8);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);if(page<5){assert.equal(item.sha256,item.originalSha256);assert.equal(item.metricScale,false);}}
 assert.equal(createHash('sha256').update(readFileSync(file('/house/house-plan.pdf'))).digest('hex'),record.sourceSha256);
});
