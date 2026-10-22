import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS as FLOORS,normalizeTourDestination} from './building-layout.mjs';
import {BUILDING_INTERIORS as INTERIORS} from './building-interiors.mjs';
import {normalizeHomeSettings,DOORS} from './home-model.mjs';
import {buildingBoxes,buildingCanStand,moveBuildingPlayer,destinationStart,buildingLocation,stairPose,duplexPose} from './building-navigation.mjs';
import {createElevators,requestElevator,stepElevators,liftIsOpen} from './elevator-model.mjs';
import {buildBuildingContext} from './building-scene.js';
import {joystickVector,walkingInput} from './joystick.mjs';
const near=(a,b,e=.015)=>assert(Math.abs(a-b)<e,`${a} ≈ ${b}`);
const settings=normalizeHomeSettings({openDoors:DOORS.map(d=>d.id),furniture:false});

test('four garden units retain independent service-room outlines and different traced garden plots',()=>{
 const f=FLOORS[0];assert.deepEqual(f.units.map(u=>u.number),[1,2,3,4]);
 for(const u of f.units)assert.equal(u.polygon.length,14);
 const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
 for(const u of f.units)near(area(u.polygon),139.3,.2);
 assert(f.gardens[1].plot.length>f.gardens[0].plot.length,'rounded unit-2 plot is its own trace');
 assert(new Set(f.gardens.map(g=>Math.round(area(g.polygon)))).size===4);
});

test('all 43 physical entrances and both duplex destinations spawn inside the selected unit and cross their actual door opening',()=>{
 const cars=createElevators();assert.equal(INTERIORS.floors.reduce((n,f)=>n+f.entries.length,0),43);
 assert.equal(INTERIORS.floors[6].entries.some(e=>e.unit===32),false);
 for(const f of FLOORS){const boxes=buildingBoxes(f.level,settings,cars);
  for(const u of f.units){const target=`unit:${u.number}:${f.level}`,s=destinationStart(target,settings,cars);assert.equal(buildingLocation(s.position,f.level).unit,u.number,target);assert(buildingCanStand(s.position,f.level,boxes,cars),target);}
  for(const d of INTERIORS.floors[f.level].doors.filter(d=>d.unit)){
   const m=d.hinge.map((n,i)=>(n+d.closed[i])/2),l=Math.hypot(...d.opened.map((n,i)=>n-d.hinge[i])),normal=d.opened.map((n,i)=>(n-d.hinge[i])/l),hall=m.map((n,i)=>n-normal[i]*.6),inside=m.map((n,i)=>n+normal[i]*.6),p=moveBuildingPlayer(hall,inside.map((n,i)=>n-hall[i]),f.level,boxes,cars);
   assert(Math.hypot(...p.map((n,i)=>n-inside[i]))<.07,`floor ${f.level} / unit ${d.unit} entry must be walkable`);
  }
 }
 assert.equal(normalizeTourDestination('unit:32:6'),'unit:32:6');assert.equal(normalizeTourDestination('floor:8'),'floor:8');assert.equal(normalizeTourDestination('unit:999:0'),'unit:4:0');
});

test('the two lifts align on every actual landing; absent or closed cars block the shaft, while every open landing admits a visitor',()=>{
 const ground=INTERIORS.floors[0];
 for(const f of INTERIORS.floors){for(const lift of f.lifts){
  near(lift.doorCenter[0],ground.lifts[lift.id].doorCenter[0]);near(lift.doorCenter[1],ground.lifts[lift.id].doorCenter[1]);assert.equal(lift.doorSide,'east');
  const cars=createElevators().map(c=>({...c,floor:f.level,target:f.level,y:f.level*BUILDING.storey})),[x,z]=lift.doorCenter,hall=[x+.6,z],cabin=[x-.8,z],boxes=buildingBoxes(f.level,settings,cars),p=moveBuildingPlayer(hall,[-1.4,0],f.level,boxes,cars);
  near(p[0],cabin[0],.03);assert(buildingCanStand(cabin,f.level,boxes,cars));
  const away=cars.map(c=>({...c,door:0,phase:'moving'}));assert(!buildingCanStand(cabin,f.level,buildingBoxes(f.level,settings,away),away));
  const blocked=moveBuildingPlayer(hall,[-1.4,0],f.level,buildingBoxes(f.level,settings,away),away);assert(blocked[0]>x+.1,'closed landing door blocks movement before the shaft');
 }}
});

test('elevator travel closes before moving, opens only on arrival, serves floors 0–8 and keeps the second car independent',()=>{
 let cars=requestElevator(createElevators(),0,8);assert.equal(cars[0].phase,'closing');
 let moved=false;for(let i=0;i<1000;i++){cars=stepElevators(cars,.05);if(cars[0].phase==='moving'){moved=true;assert.equal(cars[0].door,0);assert(!liftIsOpen(cars[0],8));}}
 assert(moved);assert(liftIsOpen(cars[0],8));near(cars[0].y,24.8);assert(liftIsOpen(cars[1],0));
 assert.equal(requestElevator(cars,0,9),cars,'roof is not an invented passenger stop');
 cars=requestElevator(cars,0,0);for(let i=0;i<1000;i++)cars=stepElevators(cars,.05);assert(liftIsOpen(cars[0],0));
});

test('source common and duplex stairs keep flat floor landings and continuous floor-to-floor rise',()=>{
 const [a,b]=INTERIORS.floors[3].stairs.rect,m=(a[0]+b[0])/2,n=a[1]+1.55,s=b[1]-1.14;
 near(stairPose([m-.5,a[1]+.6],3).y,3*BUILDING.storey);near(stairPose([m+.5,a[1]+.6],3).y,3*BUILDING.storey);
 const west=stairPose([m-.5,(n+s)/2],3);near(west.y,3.25*BUILDING.storey);
 const south=stairPose([m-.5,s+.1],3,west);near(south.y,3.5*BUILDING.storey);
 const east=stairPose([m+.5,(n+s)/2],3,south);near(east.y,3.75*BUILDING.storey);
 const top=stairPose([m+.5,n-.2],3,east);assert.equal(top.floor,4);near(top.y,4*BUILDING.storey);
 const d=INTERIORS.floors[5].duplexStair,[c,e]=d.longFlightRect,[u,v]=d.shortFlightRect;
 near(duplexPose([(c[0]+e[0])/2,e[1]],5).y,5*BUILDING.storey);near(duplexPose([u[0],(u[1]+v[1])/2],6).y,6*BUILDING.storey);
});

test('analog joystick has a dead zone, proportional speed, clamped diagonals and neutral release',()=>{
 assert.deepEqual(joystickVector(3,2),{x:0,y:0});assert(joystickVector(0,-22).y<0&&joystickVector(0,-22).y>-.6);
 near(Math.hypot(...Object.values(joystickVector(400,-400))),1);
 const slow=walkingInput(new Set(),{joystick:{x:.2,y:-.3}});near(slow.forward,.3);near(slow.side,.2);
 const mixed=walkingInput(new Set(['KeyW','KeyD']),{joystick:{x:1,y:-1}});near(Math.hypot(mixed.forward,mixed.side),1);
 assert.equal(walkingInput(new Set(),{joystick:{x:0,y:0}}).moving,false);
});

test('rendered cabins move with the travel state and only the destination landing doors open',()=>{
 const group=new THREE.Group(),resources=[],picks=[],model=buildBuildingContext({group,resources,picks,settings,mode:'walk'});
 try{let cars=requestElevator(createElevators(),0,4);for(let i=0;i<700;i++)cars=stepElevators(cars,.05);model.elevators.update(cars);near(model.elevators.cars[0].node.position.y,12.4);near(model.elevators.cars[1].node.position.y,0);
  const l=model.elevators.hallDoors.find(h=>h.level===4&&h.id===0),g=model.elevators.hallDoors.find(h=>h.level===0&&h.id===0);near(Math.abs(l.leaves[0].position.z-l.z),.675);near(Math.abs(g.leaves[0].position.z-g.z),.225);
  assert.equal(picks.filter(p=>p.userData.action==='elevator-ride').length,18);
 }finally{resources.forEach(r=>r.dispose?.());}
});
