import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {BUILDING,BUILDING_FLOORS} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {connectedWallRuns,wallFootprint,polygonContains} from '../src/building-geometry.mjs';
import {furnitureContext,footprint,backing} from './neighbour-furniture-tools.mjs';
import {APARTMENT_FURNITURE} from '../src/apartment-furniture-layout.mjs';
const config=JSON.parse(readFileSync(new URL('./apartment-room-seeds.json',import.meta.url))),registration=BUILDING.registration;
export const wetSeedWorld=(page,p)=>p.map((v,i)=>registration.liftWorld[i]+(v-registration.sheetLiftPixels[page][i]*1332/1250)*registration.pdfMetresPerPoint);
export function bathroomContexts(){
 const rows=[];
 for(const floor of BUILDING_FLOORS.filter(f=>f.level>0)){
  const source=BUILDING_INTERIORS.floors[floor.level],walls=connectedWallRuns(source,floor).map(wallFootprint),contexts=new Map();
  for(const [index,p] of (config[floor.page].bathrooms||[]).entries()){
   const seed=wetSeedWorld(floor.page,p),unit=floor.units.find(u=>polygonContains(seed,u.polygon));if(!unit)throw Error(`Bathroom seed ${floor.page}:${index} outside apartment`);
   if(!contexts.has(unit.number))contexts.set(unit.number,furnitureContext({polygon:unit.polygon,walls,doors:source.doors}));
   const room=contexts.get(unit.number).room(seed);if(room.area<.8||room.area>8)throw Error(`Bathroom seed ${floor.page}:${index} has room area ${room.area.toFixed(2)}`);
   rows.push({floor:floor.level,unit:unit.number,sourcePage:floor.page,index,seed,room});
  }
 }return rows;
}
export function placeBathroom(room,seed,built=[]){
 const candidates=(kind,w,d)=>{const out=[];
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const i of room.cells){const [x,z]=room.xy(i),box=footprint(x,z,w,d,angle);if(!room.valid(box,built))continue;const gap=backing(box,angle,w,room.walls);if(!Number.isFinite(gap))continue;
   const approach=[x+Math.sin(angle)*(d/2+.35),z+Math.cos(angle)*(d/2+.35)];if(!room.pointClear(approach,built,.17))continue;
   out.push({kind,x,z,w,d,angle,box,approach,backGap:gap,score:gap+Math.hypot(x-seed[0],z-seed[1])*.04});
  }return out.sort((a,b)=>a.score-b.score);
 };
 const toilets=[...candidates('wc',.36,.60),...candidates('wc',.36,.54)],basins=[...candidates('basin',.48,.36),...candidates('basin',.36,.28)];
 for(const wc of toilets)for(const basin of basins){if(!room.valid(basin.box,[...built,wc.box]))continue;const boxes=[...built,wc.box,basin.box];if(!room.pointClear(wc.approach,[...built,basin.box],.17)||!room.pointClear(basin.approach,[...built,wc.box],.17)||!room.routesClear(boxes))continue;
  const result=[wc,basin];if(room.area>3.2){const shower=candidates('shower',.78,.78).find(s=>room.valid(s.box,boxes)&&room.pointClear(wc.approach,[...boxes,s.box],.18)&&room.pointClear(basin.approach,[...boxes,s.box],.18)&&room.routesClear([...boxes,s.box]));if(shower)result.push(shower);}return result;
 }return null;
}
export function generateBathrooms(){
 const rows=bathroomContexts(),records=[],seen=new Set();
 for(const row of rows){const key=`${row.floor}:${row.unit}:${row.room.cells[0]}`;if(seen.has(key))throw Error('Duplicate wet room '+key);seen.add(key);
  const built=APARTMENT_FURNITURE.filter(f=>f.floor===row.floor&&f.unit===row.unit).map(f=>f.box),set=placeBathroom(row.room,row.seed,built);if(!set)throw Error(`No safe wet-room arrangement ${row.sourcePage}:${row.index}, area ${row.room.area}`);
  for(const item of set)records.push({...item,id:`f${row.floor}-wet-${row.index}-${item.kind}`,floor:row.floor,unit:row.unit,roomId:`wet-${row.index}`,sourcePage:row.sourcePage,seed:row.seed,roomArea:row.room.area,illustrative:true,layoutRevision:112});
 }
 const rounded=records;
 writeFileSync('src/apartment-bathroom-layout.mjs','// Illustrative fixtures in source-registered wet rooms. Not plumbing or installation plans.\nexport const APARTMENT_BATHROOMS='+JSON.stringify(rounded)+';\n');
 writeFileSync('qa/bathroom-placement-r112.json',JSON.stringify({rooms:rows.length,fixtures:records.length,source:'building-plan.pdf pages4-10',measuredFixtures:false,roomsValidated:true},null,2));console.log(JSON.stringify({rooms:rows.length,fixtures:records.length}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)generateBathrooms();
