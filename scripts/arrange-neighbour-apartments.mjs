import {readFileSync,writeFileSync} from 'node:fs';
import {BUILDING_FLOORS,BUILDING} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {APARTMENT_FURNITURE as previous} from '../src/apartment-furniture-layout.mjs';
import {connectedWallRuns,wallFootprint,polygonContains} from '../src/building-geometry.mjs';
import {groundBaseProfile,groundFurnitureBoxes,groundPoint,groundDirection} from '../src/ground-apartments.mjs';
import {HOUSE_OUTLINE,openingPoint} from '../src/home-model.mjs';
import {furnitureContext,placeBed,placeLiving,footprint} from './neighbour-furniture-tools.mjs';
const seeds=JSON.parse(readFileSync('scripts/apartment-room-seeds.json')),r=BUILDING.registration,S=r.pdfMetresPerPoint,world=(page,p)=>[0,1].map(i=>r.liftWorld[i]+(p[i]-r.sheetLiftPixels[page][i]*1332/1250)*S),upper=[],ground=[],failures=[];
for(const f of BUILDING_FLOORS.filter(f=>f.level>0)){
 const source=BUILDING_INTERIORS.floors[f.level],walls=connectedWallRuns(source,f).map(wallFootprint),sliders=f.envelope.flatMap(p=>p.openings.filter(o=>o.kind==='slider')),contexts=new Map(),get=(unit)=>{if(!contexts.has(unit.number))contexts.set(unit.number,furnitureContext({polygon:unit.polygon,walls,doors:source.doors,sliders}));return contexts.get(unit.number);},built=previous.filter(p=>p.floor===f.level&&p.kind==='kitchen');upper.push(...built);
 for(const [n,pdf]of seeds[f.page].beds.entries()){
  const seed=world(f.page,pdf),unit=f.units.find(u=>polygonContains(seed,u.polygon));if(!unit)throw Error(`No unit at bedroom seed ${f.level}:${n}`);const room=get(unit).room(seed),bed=placeBed(room,seed,!!pdf[2],built.map(b=>b.box));
  if(!bed){failures.push({floor:f.level,unit:unit.number,kind:'bed',n});continue;}const record={...bed,id:`f${f.level}-beds-${n}`,floor:f.level,unit:unit.number,kind:'bed',master:!!pdf[2],seed,sourcePage:f.page,roomArea:room.area,layoutRevision:62};built.push(record);upper.push(record);
 }
 for(const kitchen of built.filter(p=>p.kind==='kitchen')){const room=get(f.units.find(u=>u.number===kitchen.unit)).room(kitchen.seed),set=placeLiving(room,built.map(b=>b.box));if(!set){failures.push({floor:f.level,unit:kitchen.unit,kind:'living'});continue;}for(const item of set){const record={...item,id:`f${f.level}-unit-${kitchen.unit}-${item.kind}`,floor:f.level,unit:kitchen.unit,sourcePage:f.page,seed:room.centre,layoutRevision:62};built.push(record);upper.push(record);}}
 console.log(JSON.stringify({floor:f.level,beds:built.filter(r=>r.kind==='bed').length,living:built.filter(r=>r.kind==='sofa').length}));
}
const profile=groundBaseProfile(),doors=profile.doors.map(o=>{const [x,z]=openingPoint(o),vertical=o.vertical,sign=o.hinge==='end'?-1:1,hinge=vertical?[x,z-sign*o.width/2]:[x-sign*o.width/2,z],closed=vertical?[x,z+sign*o.width/2]:[x+sign*o.width/2,z],turn=(o.swing||-1),opened=vertical?[x+sign*o.width*turn,hinge[1]]:[hinge[0],z-sign*o.width*turn];return {...o,hinge,closed,opened};}),sliders=doors.filter(d=>d.type==='slider').map(d=>({a:d.hinge,b:d.closed})),walls=[];
for(const w of profile.walls){const vertical=Math.abs(w.a[0]-w.b[0])<.01,axis=vertical?1:0,lo=Math.min(w.a[axis],w.b[axis]),hi=Math.max(w.a[axis],w.b[axis]),holes=[...profile.windows,...profile.doors].filter(o=>o.wallId===w.id).map(o=>[o.start,o.end]).sort((a,b)=>a[0]-b[0]);let cursor=lo;for(const [a,b]of [...holes,[hi,hi]]){if(a>cursor+.001){const from=[...w.a],to=[...w.b];from[axis]=cursor;to[axis]=a;walls.push(wallFootprint({a:from,b:to,width:w.thickness}));}cursor=Math.max(cursor,b);}}
const ctx=furnitureContext({polygon:HOUSE_OUTLINE,walls,doors,sliders}),base=[],obstacles=groundFurnitureBoxes(4);
for(const [n,id]of ['bedroom-a','bedroom-b','master','bedroom-c','safe-room'].entries()){const roomDef=profile.rooms.find(r=>r.id===id),room=ctx.room(roomDef.walk),bed=placeBed(room,roomDef.walk,id==='master',[...obstacles,...base.map(r=>r.box)]);if(!bed){failures.push({floor:0,kind:'bed',room:id});continue;}base.push({...bed,id:`bed-${n}`,roomId:id,kind:'bed',master:id==='master'});}
const livingRoom=ctx.room(profile.rooms.find(r=>r.id==='living').walk),living=placeLiving(livingRoom,[...obstacles,...base.map(r=>r.box)]);if(!living)failures.push({floor:0,kind:'living'});else base.push(...living.map(r=>({...r,id:r.kind})));
for(const unit of [1,2,3])for(const p of base){const [x,z]=groundPoint(unit,[p.x,p.z]),n=groundDirection(unit,[Math.sin(p.angle),Math.cos(p.angle)]),angle=Math.atan2(n[0],n[1]);ground.push({...p,id:`ground-${unit}-${p.id}`,floor:0,unit,x,z,angle,box:footprint(x,z,p.w,p.d,angle),footApproach:p.footApproach?groundPoint(unit,p.footApproach):undefined,sourcePage:3,layoutRevision:62});}
if(failures.length){console.log(JSON.stringify({failures},null,2));process.exitCode=1;}else{
 const clean=rows=>JSON.parse(JSON.stringify(rows,(k,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v));
 writeFileSync('src/apartment-furniture-layout.mjs','// Proposed neighbour furnishings; source rooms and circulation retained. R62.\nexport const APARTMENT_FURNITURE='+JSON.stringify(clean(upper))+';\nexport const GROUND_APARTMENT_FURNITURE='+JSON.stringify(clean(ground))+';\n');
 const report={revision:62,upper:{beds:upper.filter(p=>p.kind==='bed').length,kitchens:upper.filter(p=>p.kind==='kitchen').length,livingRooms:upper.filter(p=>p.kind==='sofa').length},ground:{beds:ground.filter(p=>p.kind==='bed').length,livingRooms:ground.filter(p=>p.kind==='sofa').length},failures};writeFileSync('qa/neighbour-furniture-r62.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
