import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN_SCALE,point,HOUSE,ROOMS,WALLS,DOORS,WINDOWS,FURNITURE,ALL_HOME_PARTS,HOME_DEFAULTS,getRoom,normalizeHomeSettings,insidePolygon,openingPoint,roomAt,collisionBoxes,canStand,movePlayer,findWalkPath,doorsOnPath} from './home-model.mjs';

test('house uses the PDF scale and keeps source topology and printed dimensions separate',()=>{
 assert.equal(PLAN_SCALE,50*25.4/72/1000);assert.deepEqual(point(606,45.7),[0,0]);
 assert.equal(ROOMS.length,14);assert.equal(ROOMS.filter(r=>r.kind==='bedroom').length,3);
 assert.equal(getRoom('bedroom-a').size,'350 × 280 cm');
 const master=getRoom('master');assert.equal(master.polygon.length,6);assert(!insidePolygon(point(650,680),master.polygon));assert(insidePolygon(point(760,680),master.polygon));
 assert(!WINDOWS.some(w=>w.rooms.includes('master')&&w.wallId==='south'));
 const mouth=point(920,357.52);assert(canStand(mouth,collisionBoxes([],false)), 'hall entrance must remain open');
 for(const room of ROOMS){assert(insidePolygon(room.walk,room.polygon),`${room.id} start is in its room`);assert.equal(roomAt(room.walk),room.id);}
 // Removing the dining zone merges its floor into living, without overlapping kitchen.
 for(let x=680;x<1260;x+=9)for(let z=46;z<357;z+=9){const p=point(x,z),count=ROOMS.slice(0,2).filter(r=>insidePolygon(p,r.polygon)).length;assert(count<=1);}
});

test('every room is reachable by continuous walking with furniture and only route doors opened',()=>{
 const start=getRoom('living').walk;
 for(const room of ROOMS){
  const path=findWalkPath(start,room.walk);assert(path?.length,`${room.id} must be reachable`);
  const ids=doorsOnPath(path),boxes=collisionBoxes([...HOME_DEFAULTS.openDoors,...ids]);
  assert(canStand(room.walk,boxes),`${room.id} destination is clear`);
  if(['bedroom-a','bedroom-b','master','bedroom-c','safe-room','powder','ensuite'].includes(room.id))assert(!ids.includes('service-exit'),`${room.id} should use indoor circulation`);
  let p=[...start];
  for(const target of path){let steps=0;while(Math.hypot(p[0]-target[0],p[1]-target[1])>.045&&steps++<100){const dx=target[0]-p[0],dz=target[1]-p[1],dist=Math.hypot(dx,dz),step=Math.min(.03,dist);p=movePlayer(p,[dx/dist*step,dz/dist*step],boxes);}assert(steps<100,`${room.id} path has no unreachable step`);}
  assert(Math.hypot(p[0]-room.walk[0],p[1]-room.walk[1])<.05,`${room.id} arrival is within 5 cm`);
 }
 const yardPath=findWalkPath(getRoom('laundry').walk,point(1220,600));assert(yardPath?.length);assert(doorsOnPath(yardPath).includes('service-exit'));
});

test('closed doors and walls stop large movement; an opened doorway permits it',()=>{
 const door=DOORS.find(d=>d.id==='bed-a'),p=openingPoint(door),start=[p[0]+.6,p[1]],delta=[-1.2,0];
 const closed=movePlayer(start,delta,collisionBoxes([],false));assert(closed[0]>p[0]+HOUSE.playerRadius);
 const open=movePlayer(start,delta,collisionBoxes(['bed-a'],false));assert(Math.abs(open[0]-(p[0]-.6))<.001);
 const window=WINDOWS.find(w=>w.id==='bed-a-window'),q=openingPoint(window),from=[q[0]+.65,q[1]],stopped=movePlayer(from,[-1.3,0],collisionBoxes(DOORS.map(d=>d.id),false));assert(stopped[0]>q[0]);
 const patio=DOORS.find(d=>d.id==='patio'),w=WALLS.find(w=>w.id===patio.wallId),a=[w.a[0],patio.start+patio.width*.25],b=[w.a[0],patio.start+patio.width*.75],boxes=collisionBoxes(['patio'],false);
 assert(canStand(a,boxes),'sliding half is clear');assert(!canStand(b,boxes),'fixed half remains solid');
});

test('home imports validate independent door, drawer and finish states',()=>{
 const a=ALL_HOME_PARTS[0].id,b=ALL_HOME_PARTS[1].id;
 assert.equal(new Set(ALL_HOME_PARTS.map(p=>p.id)).size,ALL_HOME_PARTS.length);
 const s=normalizeHomeSettings({lang:'bad',openDoors:['bed-a','bed-a','bad'],openParts:[a,a,'bad'],rooms:{master:{wall:'sage',floor:'oak',wood:'dark'},living:{wall:'bad',floor:'bad',wood:'bad'}}});
 assert.deepEqual(s.openDoors,['bed-a']);assert.deepEqual(s.openParts,[a]);assert(!s.openParts.includes(b));assert.equal(s.lang,'he');assert.equal(s.rooms.master.wall,'sage');assert.equal(s.rooms.living.wall,'ivory');
 assert.doesNotThrow(()=>normalizeHomeSettings(null));assert.equal(normalizeHomeSettings().openDoors.includes('patio'),true);
 assert(FURNITURE.every(f=>f.illustrative));
});
