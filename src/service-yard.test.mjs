import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SERVICE_YARD as Y,PLOT,HOUSE_OUTLINE,point,insidePolygon,polygonBounds,WINDOWS,WALLS,openingPoint,getRoom,findWalkPath,doorsOnPath,collisionBoxes,canStand,movePlayer,normalizeHomeSettings,ALL_HOME_PARTS} from './home-model.mjs';
import {SERVICE_SOURCE} from './service-yard-layout.mjs';
import {createHomeScene} from './home-scene.js';
import {closeAllStudioOpenings} from './studio-state.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<.00001,`${a} ≈ ${b}`),bounds=o=>new THREE.Box3().setFromObject(o);
const intersects=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;

test('chamber follows the new visible-lid photos and retains its original plan provenance',()=>{
 const expected=point((1183.97+1240.81)/2,(868.17+925.01)/2);Y.manhole.planPosition.forEach((v,i)=>near(v,expected[i]));assert.deepEqual(Y.manhole.position,[11.05,16.76]);assert(Y.manhole.photoVerified);
 assert(insidePolygon(Y.manhole.position,PLOT));assert(!insidePolygon(Y.manhole.position,HOUSE_OUTLINE));
 const e=Y.elements.find(e=>e.id==='service-manhole');assert(!e.planned);assert(e.dimensionsInferred);assert.match(e.noteEn,/not a measured lid/);assert.match(e.noteEn,/not a verified regulatory clearance/);
 assert.equal(Y.manhole.accessSize,1.6);
});

test('the 3 m deep by 3.5 m wide proposal follows the neighbour boundary and keeps the chamber access square exposed',()=>{
 const s=Y.shed,a=polygonBounds(Y.manhole.access),b=polygonBounds(s.polygon),plot=polygonBounds(PLOT);
 near(b.maxX-b.minX,3.5);near(b.maxZ-b.minZ,3);assert(!intersects(b,a));
 near(a.minZ-b.maxZ,.1);near(Y.manhole.position[1]-b.maxZ-.5,.4);
 assert(b.minX>plot.minX&&b.maxX<plot.maxX&&b.minZ>plot.minZ&&b.maxZ<plot.maxZ);
 near(plot.maxX-b.maxX,.1);near(Y.shed.passage,1.2503416666666647);
 for(let x=b.minX+.05;x<b.maxX;x+=.1)for(let z=b.minZ+.05;z<b.maxZ;z+=.1)assert(!insidePolygon([x,z],HOUSE_OUTLINE),'proposal never occupies an existing room');
});

test('actual shed, open leaves and appliance meshes do not cover the maintenance reserve',()=>{
 const settings=normalizeHomeSettings({openParts:Y.parts.map(p=>p.id)}),scene=createHomeScene(settings,{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);const access=polygonBounds(Y.manhole.access),a={minX:access.minX,maxX:access.maxX,minZ:access.minZ,maxZ:access.maxZ};
  for(const id of ['garden-shed','shed-fridge','shed-freezer']){
   const p=scene.gardenGroups.get(id);assert(p);p.traverse(o=>{if(!o.isMesh)return;const b=bounds(o);assert(!intersects({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z},a),`${id} never covers access`);});
  }
  const roof=scene.gardenGroups.get('garden-shed').children.find(o=>o.userData.part==='shed-roof'),b=bounds(roof);near(b.max.x-b.min.x,3.5);near(b.max.z-b.min.z,3);near(b.max.y,2.2);
  const cover=scene.gardenGroups.get('service-manhole').children.find(o=>o.userData.part==='inspection-cover'),c=bounds(cover);near((c.min.x+c.max.x)/2,Y.manhole.position[0]);near((c.min.z+c.max.z)/2,Y.manhole.position[1]);near(c.max.x-c.min.x,1);
  for(const e of Y.elements)assert(scene.picks.some(o=>o.userData.buildingId===e.id),`${e.id} has a dimension/source hit target`);
 }finally{scene.dispose();}
});

test('the utility exit reaches the flush chamber and the shed doorway blocks walking only while closed',()=>{
 const path=findWalkPath(getRoom('laundry').walk,Y.manhole.position);assert(path?.length);assert(doorsOnPath(path).includes('service-exit'));
 const boxes=collisionBoxes(doorsOnPath(path));for(const p of path)assert(canStand(p,boxes));
 const d=Y.shed.door,p=[d.x,d.z],closed=collisionBoxes([],true,[],[]),opened=collisionBoxes([],true,[],[d.id]);
 assert(!canStand(p,closed));assert(canStand(p,opened));
 const start=[d.x,d.z-.45],stopped=movePlayer(start,[0,.9],closed),entered=movePlayer(start,[0,.9],opened);
 assert(stopped[1]<d.z-.15);near(entered[1],d.z+.45);
 assert(canStand(Y.manhole.position,closed),'flush cover itself is not treated as an impassable obstacle');
 const leave=findWalkPath([d.x,d.z+.45],getRoom('garden').walk,true,[d.id]);assert(leave?.length,'guided navigation can leave an already-open shed');
});

test('two upright appliances fit with actual rear/side allowances and doors operate independently',()=>{
 const s=Y.shed,[fridge,freezer]=s.appliances;
 near(s.maxZ-s.wall-(fridge.z+fridge.d/2),.1);near(freezer.x-freezer.w/2-(fridge.x+fridge.w/2),.15);
 assert(fridge.x-fridge.w/2>s.minX+s.wall);assert(freezer.x+freezer.w/2<s.maxX-s.wall);
 for(const a of s.appliances){assert(a.h<s.h-.06-.05);assert(Y.elements.find(e=>e.id===a.id).noteEn.includes('models and dimensions are unknown'));}
 const closed=createHomeScene(normalizeHomeSettings(),{mode:'walk'}),one=createHomeScene(normalizeHomeSettings({openParts:['shed-fridge:door']}),{mode:'walk'});
 try{
  const original=new Map(closed.motions.map(m=>[m.id,m.target]));for(const m of one.motions)if(m.id==='shed-fridge:door')assert.notEqual(m.target,original.get(m.id));else assert.equal(m.target,original.get(m.id));
  assert(Y.parts.every(p=>ALL_HOME_PARTS.some(q=>q.id===p.id)));
 }finally{closed.dispose();one.dispose();}
});

test('shed roof and new door states survive imports and Close all still closes every new leaf',()=>{
 const settings=normalizeHomeSettings({shedRoof:false,openParts:Y.parts.map(p=>p.id)}),again=normalizeHomeSettings(JSON.parse(JSON.stringify(settings)));
 assert.equal(again.shedRoof,false);assert.deepEqual(again.openParts,Y.parts.map(p=>p.id));
 const storage={getItem:()=>null,setItem:()=>{}},closed=closeAllStudioOpenings(storage,{home:again});assert.equal(closed.home.shedRoof,false);assert.deepEqual(closed.home.openParts,[]);
 const scene=createHomeScene(settings,{mode:'walk'});try{assert(!scene.gardenGroups.get('garden-shed').children.some(o=>o.userData.part==='shed-roof'));assert(scene.picks.some(o=>o.userData.partId==='garden-shed:door'));}finally{scene.dispose();}
});

test('chamber identification keeps original PDF provenance and readable portable crop assets',()=>{
 const path=p=>new URL(`../public${p}`,import.meta.url),source=readFileSync(path('/house/house-plan.pdf')),record=JSON.parse(readFileSync(path('/house/service-yard/provenance.json')));
 assert.equal(createHash('sha256').update(source).digest('hex'),record.sourceSha256);
 assert.equal(record.items.length,6);for(const page of SERVICE_SOURCE.pages){const bytes=readFileSync(path(SERVICE_SOURCE.references.find(r=>r.page===page)?.image||`${SERVICE_SOURCE.imagePrefix}${page}.jpg`));assert.equal(bytes.readUInt16BE(0),0xffd8);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.items.find(i=>i.page===page).sha256);}
});


test('safe-room window frontage and full door-swing geometry stay outside the new shed',()=>{
 const w=WINDOWS.find(w=>w.id==='safe-window'),wall=WALLS.find(a=>a.id===w.wallId),p=openingPoint(w),clear=Y.safeWindow,s=Y.shed;
 near(clear.minX,w.start);near(clear.maxX,w.end);assert(clear.minZ>p[1]+wall.thickness/2);
 assert(s.minX>w.end+.1,'shed stays laterally outside the full window opening');
 assert(!intersects(polygonBounds(clear.polygon),polygonBounds(s.polygon)));
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 try{const door=scene.motions.find(m=>m.id==='garden-shed:door');for(let i=0;i<=12;i++){door.object.rotation.y=i*Math.PI*.49/12;scene.group.updateMatrixWorld(true);const b=bounds(door.object);assert(!intersects({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z},polygonBounds(clear.polygon)),'opening the shed does not occupy the window frontage');}}finally{scene.dispose();}
});

test('new visible-lid photos supersede the older obscured views without claiming measured coordinates',()=>{
 assert.equal(Y.manhole.photoVerified,true);assert(Y.manhole.positionInferred);
 const record=JSON.parse(readFileSync(new URL('../public/house/service-yard/provenance.json',import.meta.url)));
 for(const page of [3,4]){const item=record.items.find(i=>i.page===page);assert.equal(item.lidVisuallyConfirmed,false);assert.match(item.originalSha256,/^[a-f0-9]{64}$/);assert.match(SERVICE_SOURCE.references.find(r=>r.page===page).noteEn,/No (chamber )?lid is confidently/);}
});
