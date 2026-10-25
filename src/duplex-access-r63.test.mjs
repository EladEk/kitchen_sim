import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {BUILDING_DUPLEXES,duplexForUnit,duplexStair} from './building-duplexes.mjs';
import {buildingBoxes,buildingCanStand,buildingLocation,destinationStart,moveBuildingWalker} from './building-navigation.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {createElevators} from './elevator-model.mjs';

const near=(a,b,t=.015)=>assert(Math.abs(a-b)<t,`${a} ≈ ${b}`);
const cars=createElevators(),settings=normalizeHomeSettings({furniture:true}),cache=new Map();
const boxes=floor=>{if(!cache.has(floor))cache.set(floor,buildingBoxes(floor,settings,cars));return cache.get(floor);};
function go(walker,target,speed=1){
 for(let i=0;i<1000;i++){
  const delta=target.map((v,j)=>v-walker.position[j]),length=Math.hypot(...delta);if(length<.005)return walker;
  const step=Math.min(length,speed*1.85*.05),next=moveBuildingWalker(walker.position,delta.map(v=>v/length*step),walker,boxes,cars);
  assert(Math.hypot(...next.position.map((v,j)=>v-walker.position[j]))>.00001,`blocked on floor ${walker.floor}: ${walker.position} → ${target}`);
  assert.equal(buildingLocation(next.position,next.floor).unit,32,'the entire private route remains in apartment 32');
  assert(Math.abs(next.baseY-walker.baseY)<.3,'no whole-storey jump, including when a fast frame crosses a landing');
  walker=next;
 }
 assert.fail('private stair route did not finish');
}

test('every repeated apartment number has one source-backed internal connection and only its lower hall entrance',()=>{
 const repeated=new Map();for(const f of BUILDING_FLOORS)for(const u of f.units){if(!repeated.has(u.number))repeated.set(u.number,[]);repeated.get(u.number).push(f.level);}
 const pairs=[...repeated].filter(([,floors])=>floors.length>1);assert.deepEqual(pairs,[[32,[5,6]]]);assert.equal(BUILDING_DUPLEXES.length,pairs.length);
 for(const [unit,floors]of pairs){
  const duplex=duplexForUnit(unit,floors[0]);assert.deepEqual([duplex.entryFloor,duplex.upperFloor],floors);assert.deepEqual(duplex.sourcePages,floors.map(f=>BUILDING_FLOORS[f].page));assert(duplexStair(duplex));
  const entries=BUILDING_INTERIORS.floors.flatMap(f=>f.entries.filter(e=>e.unit===unit).map(e=>({floor:f.level,...e})));
  assert.equal(entries.length,1);assert.equal(entries[0].floor,duplex.entryFloor);
  for(const floor of floors){const start=destinationStart(`unit:${unit}:${floor}`,settings,cars);assert.equal(start.floor,duplex.entryFloor);assert.equal(buildingLocation(start.position,start.floor).unit,unit);}
 }
 for(const unit of [40,41,42,43])assert.equal(duplexForUnit(unit,unit<42?7:8),null,'separate source apartments must not be merged into invented duplexes');
});

test('a furnished duplex can be walked up and back down through the private stair at all three walking speeds',()=>{
 for(const speed of [1,2,3]){
  const start=destinationStart('unit:32:6',settings,cars);let walker={position:start.position,floor:start.floor,baseY:start.floor*BUILDING.storey,stair:null};
  for(const target of [[8.75,-7.2],[8.75,-11.15],[7.05,-11.15],[6.8,-10.4]])walker=go(walker,target,speed);
  assert.equal(walker.floor,6);near(walker.baseY,6*BUILDING.storey);assert.equal(walker.stair,null);
  for(const target of [[7.05,-11.15],[8.75,-11.15],[8.75,-7.2],start.position])walker=go(walker,target,speed);
  assert.equal(walker.floor,5);near(walker.baseY,5*BUILDING.storey);assert.equal(walker.stair,null);
 }
});

test('upper landing guards cannot be bypassed by treating an unrelated approach as a descent',()=>{
 for(const [position,delta]of [[[8.75,-6.9],[0,-1.2]],[[7.8,-9],[1.2,0]]]){
  const next=moveBuildingWalker(position,delta,{floor:6,baseY:6*BUILDING.storey},boxes,cars);
  assert.equal(next.floor,6);near(next.baseY,6*BUILDING.storey);assert.equal(next.stair,null);
  assert(Math.hypot(...next.position.map((v,i)=>v-position[i]))<.5,'solid landing guard stops the walker');
 }
});

test('the upper duplex is isolated from the sixth-floor hall even with every real door open',()=>{
 const floor=6,open=buildingBoxes(floor,normalizeHomeSettings({furniture:false,closedBuildingDoors:[]}),cars),step=.12,minX=-.5,minZ=-12.15,width=90,height=104;
 const start=[Math.round((7-minX)/step),Math.round((-10.8-minZ)/step)],queue=[start],seen=new Set([start.join(',')]);
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i],p=[minX+x*step,minZ+z*step];assert(p[0]<9.75,'upper private rooms must not connect through any gap to the common hall');
  for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,key=a+','+b;if(a<0||a>=width||b<0||b>=height||seen.has(key))continue;seen.add(key);if(buildingCanStand([minX+a*step,minZ+b*step],floor,open,cars))queue.push([a,b]);}
 }
 assert(queue.length>3000,'the check explores the rooms and balcony, not just an obstructed start point');
});

test('only the slab between the duplex storeys is open; the lower base and upper ceiling remain solid',()=>{
 const root=new THREE.Group(),resources=[];buildBuildingContext({group:root,resources,settings:normalizeHomeSettings({buildingLevel:7,furniture:false}),mode:'walk'});root.updateMatrixWorld(true);
 try{
  const at=[8.75,-9],find=(level,part)=>{const all=[];root.traverse(o=>{if(o.userData.buildingFloor===level&&o.userData.part===part)all.push(o);});return all;};
  const down=(y,objects)=>new THREE.Raycaster(new THREE.Vector3(at[0],y,at[1]),new THREE.Vector3(0,-1,0)).intersectObjects(objects,true);
  assert(down(16,find(5,'building-floor-slab')).length,'lower floor under the stair is closed');
  assert.equal(down(19,find(6,'building-floor-slab')).length,0,'upper floor is cut around the private stair');
  assert.equal(down(19,find(5,'building-storey-ceiling')).length,0,'lower ceiling shares that aperture');
  assert(down(22,find(6,'building-storey-ceiling')).length,'upper ceiling does not have an extra unexplained hole');
  const walls=find(6,'building-facade-wall').concat(find(6,'building-interior-wall'));
  const hallRay=new THREE.Raycaster(new THREE.Vector3(10.1,6*BUILDING.storey+1.2,-6.75),new THREE.Vector3(-1,0,0),0,1.2);
  assert(hallRay.intersectObjects(walls,true).length,'a rendered wall closes the former lower-entry position on the upper floor');
 }finally{resources.forEach(r=>r.dispose?.());}
});
