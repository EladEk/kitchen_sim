import {writeFileSync} from 'node:fs';
import {BUILDING_TRACE as trace} from '../src/building-trace.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
const changes=[];
for(const f of trace.floors.filter(f=>f.level>0))for(const p of f.envelope)for(const o of p.openings){
 const normal=Math.abs(o.a[0]-o.b[0])<.01?0:1,axis=1-normal,lo=Math.min(o.a[axis],o.b[axis]),hi=Math.max(o.a[axis],o.b[axis]);
 const door=BUILDING_INTERIORS.floors[f.level].doors.find(d=>d.balconyDoor&&Math.abs(d.hinge[normal]-d.closed[normal])<.01&&Math.abs(d.hinge[normal]-o.a[normal])<.3&&Math.min(hi,Math.max(d.hinge[axis],d.closed[axis]))-Math.max(lo,Math.min(d.hinge[axis],d.closed[axis]))>(hi-lo)*.65);
 if(door){o.kind='door';o.doorId=door.id;changes.push({floor:f.level,doorId:door.id,a:o.a,b:o.b});}
}
writeFileSync('src/building-trace.mjs','// Registered building trace with source-confirmed balcony door classifications.\nexport const BUILDING_TRACE='+JSON.stringify(trace)+';\n');
writeFileSync('qa/balcony-opening-classification-r60.json',JSON.stringify(changes,null,2)+'\n');console.log(JSON.stringify({balconyDoorsPreviouslyWindows:changes.length}));
