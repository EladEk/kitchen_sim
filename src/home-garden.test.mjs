import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createHomeScene} from './home-scene.js';
import {GARDEN_LAYOUT as L,TERRACE,PLOT,FURNITURE,point,polygonBounds,roomAt,getRoom,collisionBoxes,canStand,findWalkPath,normalizeHomeSettings} from './home-model.mjs';
import {GARDEN_SOURCE,GARDEN_REFERENCES} from './home-garden-reference.mjs';
import {closeAllStudioOpenings} from './studio-state.mjs';
const near=(a,b,tolerance=.00001)=>assert(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);
const bounds=o=>new THREE.Box3().setFromObject(o);

test('new work follows only the original paving width and starts at the upper-floor edge',()=>{
 const terrace=polygonBounds(TERRACE),added=polygonBounds(L.paving),roof=polygonBounds(L.pergola),finished=polygonBounds(L.finished),plot=polygonBounds(PLOT);
 for(const poly of [added,roof,finished]){near(poly.minZ,terrace.minZ);near(poly.maxZ,terrace.maxZ);near(poly.minX,plot.minX);}
 near(roof.maxX,point(498.3,42.88)[0]);near(added.maxX,terrace.minX);near(finished.maxX,terrace.maxX);
 near(L.width,4.34975);near(L.depth,3.959225);near(L.pergolaArea,17.22163894375);near(L.pavingArea,15.48152145625);
 near(roof.maxX-added.maxX,.40005);
 assert(L.width<4.4,'does not cover the roughly 7.4 m upstairs balcony frontage');
 assert(added.maxX<=terrace.minX,'original paving is retained without overlapping the addition');
 assert.equal(roomAt(point(410,200)),'terrace');assert.equal(roomAt(point(410,320)),'garden','does not widen paving along the bedroom facade');
});

test('actual pergola geometry stays inside the requested strip and posts clear Hercules',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);const roof=scene.gardenGroups.get('garden-pergola'),b=bounds(roof),expected=polygonBounds(L.pergola),kitchen=bounds(scene.furnitureGroups.get('outdoor-kitchen'));
  near(b.min.x,expected.minX);near(b.max.x,expected.maxX);near(b.min.z,expected.minZ);near(b.max.z,expected.maxZ);near(b.max.y,3);
  const posts=roof.children.filter(o=>o.userData.part==='pergola-post');assert.equal(posts.length,4);
  for(const post of posts){const p=bounds(post);assert(!p.intersectsBox(kitchen),'support clears the actual kitchen assembly');assert(p.min.x>=expected.minX&&p.max.x<=expected.maxX&&p.min.z>=expected.minZ&&p.max.z<=expected.maxZ);assert(!canStand([post.position.x,post.position.z],collisionBoxes([],false)),'permanent post also blocks the walking camera');}
  for(const id of ['garden-pergola','garden-paving','upper-balcony',...L.fence.runs.map(r=>r.id)])assert(scene.picks.some(o=>o.userData.buildingId===id),`${id} has a dimension-inspector hit target`);
  const original=scene.roomGroups.get('terrace').children.find(o=>o.userData.floorFinish),added=scene.gardenGroups.get('garden-paving').children.find(o=>o.userData.floorFinish);
  near(original.position.y,added.position.y);assert.equal(added.userData.floorFinish,'ordered-terrace');assert.deepEqual(added.userData.tile,[.15,.6]);assert.equal(original.userData.floorFinish,added.userData.floorFinish);
 }finally{scene.dispose();}
});

test('roof visibility preserves supports, all openings, and permanent features with furniture hidden',()=>{
 const settings=normalizeHomeSettings(),visible=createHomeScene(settings,{mode:'walk'}),hidden=createHomeScene(normalizeHomeSettings({...settings,pergolaRoof:false,furniture:false}),{mode:'walk'});
 try{
  const parts=scene=>{const names=[];scene.group.traverse(o=>names.push(o.userData.part));return names;};
  assert(parts(visible).includes('pergola-shade-profile'));assert(parts(visible).includes('upper-balcony-slab'));
  assert(!parts(hidden).includes('pergola-shade-profile'));assert(!parts(hidden).includes('upper-balcony-slab'));assert(!parts(hidden).includes('upper-balcony-edge'));
  assert.equal(parts(hidden).filter(s=>s==='pergola-post').length,4);assert.equal(hidden.furnitureGroups.size,0);
  assert.equal(hidden.doorGroups.size,visible.doorGroups.size);assert.deepEqual(hidden.motions.filter(m=>m.id.startsWith('door:')).map(m=>[m.id,m.target]),visible.motions.filter(m=>m.id.startsWith('door:')).map(m=>[m.id,m.target]));
  for(const run of L.fence.runs){const p=hidden.gardenGroups.get(run.id);p.updateWorldMatrix(true,true);near(bounds(p).max.y,1.5);const slats=p.children.filter(o=>o.userData.part==='horizontal-fence-slat');assert.equal(slats.length,run.style==='shared-wall'?0:10);if(run.style==='shared-wall')assert(p.children.some(o=>o.userData.part==='existing-neighbour-wall'));for(const slat of slats){near(slat.geometry.parameters.height,.11);assert(slat.geometry.parameters.width>1||slat.geometry.parameters.depth>1,'slats run horizontally');}}
 }finally{visible.dispose();hidden.dispose();}
});

test('the new paved area has a continuous route from the living slider',()=>{
 const target=point(420,225),path=findWalkPath(getRoom('living').walk,target);
 assert(path?.length);near(path.at(-1)[0],target[0]);near(path.at(-1)[1],target[1]);
 const boxes=collisionBoxes(['patio'],true);
 for(const p of path)assert(canStand(p,boxes),'route avoids supports, furniture, walls and closed doors');
 const f=FURNITURE.find(f=>f.id==='outdoor-kitchen');assert.equal(f.w,3.1);assert.deepEqual(f.position,point(297.65,176.08));
});

test('roof preference survives old saves, JSON import and global close',()=>{
 assert.equal(normalizeHomeSettings({schema:2}).pergolaRoof,true);
 const settings=normalizeHomeSettings({schema:2,pergolaRoof:false,openDoors:['patio'],openParts:['wardrobe-a:left']});
 assert.equal(normalizeHomeSettings(JSON.parse(JSON.stringify(settings))).pergolaRoof,false);
 const stored=new Map(),storage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},closed=closeAllStudioOpenings(storage,{home:settings});
 assert.equal(closed.home.pergolaRoof,false);assert.deepEqual(closed.home.openDoors,[]);assert.deepEqual(closed.home.openParts,[]);
 assert.equal(normalizeHomeSettings(closed.home).pergolaRoof,false);
});

test('outdoor references retain portable previews and distinguish photos from design examples',()=>{
 const file=p=>new URL(`../public${p}`,import.meta.url),provenance=JSON.parse(readFileSync(file('/house/garden/provenance.json')));
 assert.equal(GARDEN_REFERENCES.length,9);assert.equal(provenance.references.length,9);
 for(const ref of GARDEN_REFERENCES){
  assert(GARDEN_SOURCE.pages.includes(ref.page));const item=provenance.references.find(i=>i.original===ref.file),bytes=readFileSync(file(`${GARDEN_SOURCE.imagePrefix}${ref.page}.jpg`));
  assert.equal(bytes.readUInt16BE(0),0xffd8);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.previewSha256);assert.match(item.originalSha256,/^[a-f0-9]{64}$/);
  assert.equal(ref.kind,ref.page<=4?'photo':'design');
 }
 assert(L.elements.find(e=>e.id==='garden-pergola').planned);assert(!L.elements.find(e=>e.id==='upper-balcony').planned);
 assert.equal(L.fence.height,1.5);near(L.fence.panel+L.fence.curb,L.fence.height);
});
