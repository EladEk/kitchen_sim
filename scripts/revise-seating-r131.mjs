import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {connectedWallRuns,wallFootprint} from '../src/building-geometry.mjs';
import {groundPoint,groundAngle,groundFurnitureBoxes} from '../src/ground-apartments.mjs';
import {APARTMENT_FURNITURE,GROUND_APARTMENT_FURNITURE} from '../src/apartment-furniture-layout.mjs';
import {furnitureContext,footprint,backing} from './neighbour-furniture-tools.mjs';
import {groundLivingContext,registeredLivingGuides} from './revise-living-r102.mjs';
const living=new Set(['sofa','coffee','media']),round=v=>JSON.parse(JSON.stringify(v,(_,n)=>typeof n==='number'?+n.toFixed(6):n));
export function seatingRoom(sofa){const f=BUILDING_FLOORS[sofa.floor],source=BUILDING_INTERIORS.floors[sofa.floor],unit=f.units.find(u=>u.number===sofa.unit);return furnitureContext({polygon:unit.polygon,walls:connectedWallRuns(source,f).map(wallFootprint),doors:source.doors,sliders:f.envelope.flatMap(e=>e.openings.filter(o=>o.kind==='slider'))}).room([sofa.x,sofa.z]);}

// Search real opposing wall runs, with matching viewing axes. The same door,
// window reserves and connected-approach checks govern every candidate.
export function wallSeating(room,old,built,guide=null){
 const candidates=[],points=guide?.polygon,bounds=points&&[Math.min(...points.map(p=>p[0]))-.35,Math.min(...points.map(p=>p[1]))-.35,Math.max(...points.map(p=>p[0]))+.35,Math.max(...points.map(p=>p[1]))+.35],inZone=b=>!bounds||b.minX>=bounds[0]&&b.minZ>=bounds[1]&&b.maxX<=bounds[2]&&b.maxZ<=bounds[3];
 for(const width of [...new Set([old.w,2,1.8,1.6])])for(const mediaW of [1.5,1.2,.9])for(const angle of [old.angle,0,Math.PI/2,Math.PI,-Math.PI/2]){
  const turned=Math.abs(Math.sin(angle))>.5,n=turned?Math.sign(Math.sin(angle)):Math.sign(Math.cos(angle)),axis=turned?'X':'Z',tangent=turned?'Z':'X',size=.92;
  for(const a of room.walls){
   const s=a[(n>0?'max':'min')+axis]+n*(size/2+.06),lo=a['min'+tangent]+width/2,hi=a['max'+tangent]-width/2;if(hi<lo)continue;
   const oldT=turned?old.z:old.x,ts=[Math.max(lo,Math.min(hi,oldT)),(lo+hi)/2];for(let t=Math.ceil(lo*10)/10;t<=hi+.001;t+=.1)ts.push(t);
   const targets=room.walls.map(b=>b[(n>0?'min':'max')+axis]-n*(.34/2+.06)).concat([2.2,2.4,2.6,2.8,3,3.3,3.6,4].map(d=>s+n*d));
   for(const t of ts){
    const make=(kind,along,w,d,rotation)=>{const [x,z]=turned?[along,t]:[t,along];return {kind,x,z,w,d,angle:rotation,box:footprint(x,z,w,d,rotation)};};
    const sofa=make('sofa',s,width,size,angle);if(!inZone(sofa.box)||!room.valid(sofa.box,built))continue;const sofaGap=backing(sofa.box,sofa.angle,sofa.w,room.walls);if(!Number.isFinite(sofaGap))continue;
    for(const v of targets){const distance=(v-s)*n;if(distance<1.9||distance>7)continue;
     const media=make('media',v,mediaW,.34,angle+Math.PI);if(!inZone(media.box)||!room.valid(media.box,[...built,sofa.box]))continue;
     const coffee=make('coffee',s+n*Math.min(1.13,distance*.45),.85,.5,angle);if(!inZone(coffee.box)||!room.valid(coffee.box,[...built,sofa.box,media.box]))continue;
     const mediaGap=backing(media.box,media.angle,media.w,room.walls),supported=Number.isFinite(mediaGap),score=Math.hypot(sofa.x-old.x,sofa.z-old.z)+Math.abs(width-old.w)*4+Math.abs(distance-3.1)*.12+Math.abs(Math.sin((angle-old.angle)/2))*.4+(supported?0:.8);
     candidates.push({set:[{...sofa,wallBacked:true,backGap:sofaGap},coffee,{...media,wallBacked:supported,...(supported?{backGap:mediaGap}:{}),support:'floor-console'}],score});
    }
   }
  }
 }
 candidates.sort((a,b)=>a.score-b.score);for(const c of candidates)if(room.routesClear([...built,...c.set.map(r=>r.box)])){const coffee=c.set[1],rug=footprint(coffee.x,coffee.z,2.05,1.5,coffee.angle);if(room.valid(rug,[]))coffee.rug={w:2.05,d:1.5};return c.set;}return null;
}
export function reviseSeating(){
 const replacements=new Map(),report=[],guides=registeredLivingGuides();
 for(const old of APARTMENT_FURNITURE.filter(r=>r.kind==='sofa')){
  const room=seatingRoom(old),fixed=APARTMENT_FURNITURE.filter(r=>r.floor===old.floor&&r.unit===old.unit&&!living.has(r.kind)).map(r=>r.box),set=wallSeating(room,old,fixed,guides.find(g=>g.floor===old.floor&&g.unit===old.unit));if(!set)throw Error('No wall-backed seating: '+old.id);
  const values=set.map(r=>round({...r,id:`f${old.floor}-unit-${old.unit}-${r.kind}`,floor:old.floor,unit:old.unit,sourcePage:old.sourcePage,seed:old.seed,layoutRevision:131}));replacements.set(old.floor+'|'+old.unit,values);report.push({floor:old.floor,unit:old.unit,sofa:values[0],media:values[2]});
 }
 const config=JSON.parse(readFileSync(new URL('./living-room-zones-r102.json',import.meta.url))),room=groundLivingContext(),base=wallSeating(room,{x:3.4,z:3.1,w:2.2,angle:Math.PI},groundFurnitureBoxes(4),config.ground);if(!base)throw Error('No wall-backed ground seating');
 const ground=GROUND_APARTMENT_FURNITURE.filter(r=>!living.has(r.kind));for(const unit of [1,2,3])for(const r of base){const [x,z]=groundPoint(unit,[r.x,r.z]),angle=groundAngle(unit,r.angle);ground.push(round({...r,x,z,angle,box:footprint(x,z,r.w,r.d,angle),id:`ground-${unit}-${r.kind}`,floor:0,unit,sourcePage:3,livingZone:config.ground.polygon.map(p=>groundPoint(unit,p)),layoutRevision:131}));}
 const upper=APARTMENT_FURNITURE.filter(r=>!living.has(r.kind));for(const set of replacements.values())upper.push(...set);
 writeFileSync('src/apartment-furniture-layout.mjs','// Source-registered furniture; R131 seating against actual walls with opposing TVs.\nexport const APARTMENT_FURNITURE='+JSON.stringify(upper)+';\nexport const GROUND_APARTMENT_FURNITURE='+JSON.stringify(ground)+';\n');
 writeFileSync('qa/seating-review-r131.json',JSON.stringify({revision:131,upper:report,ground:base,unchangedBedroomsAndKitchens:true},null,2));console.log(JSON.stringify({upper:report.length,ground:3}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)reviseSeating();
