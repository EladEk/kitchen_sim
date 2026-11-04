// Room labels manually registered on the original PDF at native 1 px / pt.
// Furniture sizes/layout are proposed, not builder specifications.
import {readFileSync,writeFileSync} from 'node:fs';
import {BUILDING_FLOORS,BUILDING} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {connectedWallRuns,wallFootprint,polygonContains} from '../src/building-geometry.mjs';
const seeds=JSON.parse(readFileSync('scripts/apartment-room-seeds.json')),r=BUILDING.registration,S=r.pdfMetresPerPoint,step=.10;
const world=(page,p)=>p.map((v,i)=>r.liftWorld[i]+(v-r.sheetLiftPixels[page][i]*1332/1250)*S);
const contains=(b,p,pad=0)=>p[0]>=b.minX-pad&&p[0]<=b.maxX+pad&&p[1]>=b.minZ-pad&&p[1]<=b.maxZ+pad;
const overlap=(a,b,pad=0)=>a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad;
const records=[],failures=[];
for(const f of BUILDING_FLOORS.filter(f=>f.level>0)){
 const source=BUILDING_INTERIORS.floors[f.level],walls=connectedWallRuns(source,f).map(wallFootprint),doors=source.doors.map(d=>({minX:Math.min(d.hinge[0],d.closed[0],d.opened[0])-.12,maxX:Math.max(d.hinge[0],d.closed[0],d.opened[0])+.12,minZ:Math.min(d.hinge[1],d.closed[1],d.opened[1])-.12,maxZ:Math.max(d.hinge[1],d.closed[1],d.opened[1])+.12})),portalWalls=source.doors.map(d=>({minX:Math.min(d.hinge[0],d.closed[0])-.07,maxX:Math.max(d.hinge[0],d.closed[0])+.07,minZ:Math.min(d.hinge[1],d.closed[1])-.07,maxZ:Math.max(d.hinge[1],d.closed[1])+.07}));
 const built=[];
 for(const [kind,ps] of Object.entries(seeds[f.page]).filter(([kind])=>['beds','kitchens'].includes(kind)))for(let n=0;n<ps.length;n++){
  const p=world(f.page,ps[n]),unit=f.units.find(u=>polygonContains(p,u.polygon));if(!unit){failures.push({floor:f.level,kind,seed:ps[n],reason:'unit'});continue;}
  const xs=unit.polygon.map(p=>p[0]),zs=unit.polygon.map(p=>p[1]),minX=Math.floor(Math.min(...xs)/step)*step,minZ=Math.floor(Math.min(...zs)/step)*step,nx=Math.ceil((Math.max(...xs)-minX)/step)+1,nz=Math.ceil((Math.max(...zs)-minZ)/step)+1;
  const xy=i=>[minX+(i%nx)*step,minZ+Math.floor(i/nx)*step],idx=(x,z)=>Math.round((z-minZ)/step)*nx+Math.round((x-minX)/step),free=new Uint8Array(nx*nz);
  for(let i=0;i<free.length;i++){const q=xy(i);free[i]=polygonContains(q,unit.polygon)&&!walls.some(w=>contains(w,q,.025))&&!portalWalls.some(w=>contains(w,q))?1:0;}
  let start=-1,dist=Infinity;for(let i=0;i<free.length;i++)if(free[i]){const q=xy(i),d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<dist){dist=d;start=i;}}
  if(start<0){failures.push({floor:f.level,kind,seed:ps[n],reason:'room'});continue;}
  const room=new Set([start]),queue=[start];for(let h=0;h<queue.length;h++){const i=queue[h];for(const j of [i-1,i+1,i-nx,i+nx])if(j>=0&&j<free.length&&free[j]&&!room.has(j)&&Math.abs(i%nx-j%nx)<=1){room.add(j);queue.push(j);}}
  const valid=b=>!walls.some(w=>overlap(w,b,.045))&&!doors.some(w=>overlap(w,b))&&!built.some(w=>overlap(w,b,.08))&&(()=>{for(let x=b.minX;x<=b.maxX+.001;x+=.12)for(let z=b.minZ;z<=b.maxZ+.001;z+=.12)if(!room.has(idx(x,z))||!polygonContains([x,z],unit.polygon))return false;return [[b.minX,b.minZ],[b.minX,b.maxZ],[b.maxX,b.minZ],[b.maxX,b.maxZ]].every(q=>polygonContains(q,unit.polygon));})();
  let best=null;const sizes=kind==='beds'?(ps[n][2]?[[1.55,2.02],[1.4,1.95],[1.2,1.95]]:[[1,2.02],[.9,1.95]]):[[2.4,.62],[2,.62],[1.8,.60]];
  for(const [w,d] of sizes){for(const angle of (kind==='beds'?[0,Math.PI/2]:[0,Math.PI/2,Math.PI,-Math.PI/2]))for(const i of room){const [x,z]=xy(i);if(Math.hypot(x-p[0],z-p[1])>(kind==='beds'?3.5:3))continue;const turned=Math.abs(Math.sin(angle))>.5,W=turned?d:w,D=turned?w:d,b={minX:x-W/2,maxX:x+W/2,minZ:z-D/2,maxZ:z+D/2};if(!valid(b))continue;
    if(kind==='kitchens'){
     const turned=Math.abs(Math.sin(angle))>.5,normal=turned?Math.sin(angle):Math.cos(angle),wallCoordinate=turned?x-normal*d/2:z-normal*d/2;
     const backing=walls.some(v=>{const thickness=turned?v.maxX-v.minX:v.maxZ-v.minZ,run=turned?v.maxZ-v.minZ:v.maxX-v.minX,edge=turned?(normal>0?v.maxX:v.minX):(normal>0?v.maxZ:v.minZ),gap=(wallCoordinate-edge)*normal,span=Math.min(turned?b.maxZ:b.maxX,turned?v.maxZ:v.maxX)-Math.max(turned?b.minZ:b.minX,turned?v.minZ:v.minX);return thickness<.45&&run>w*.8&&span>w*.78&&gap>=.04&&gap<.20;});
     if(!backing)continue;
    }
    const nearWall=Math.min(...walls.map(v=>Math.max(0,Math.max(v.minX-b.maxX,b.minX-v.maxX,v.minZ-b.maxZ,b.minZ-v.maxZ)))),score=Math.hypot(x-p[0],z-p[1])*.35+nearWall*2;
    if(!best||score<best.score)best={id:`f${f.level}-${kind}-${n}`,floor:f.level,unit:unit.number,kind:kind==='beds'?'bed':'kitchen',master:!!ps[n][2],x,z,w,d,angle,box:b,seed:p,sourcePage:f.page,roomArea:room.size*step*step,score};
   }if(best)break;}
  if(best){records.push(best);built.push(best.box);}else failures.push({floor:f.level,unit:unit.number,kind,seed:ps[n],reason:'fit',roomArea:room.size*step*step});
 }
}
writeFileSync('src/apartment-furniture-layout.mjs','// Source-registered proposed furniture; generated by scripts/place-apartment-furniture.mjs.\nexport const APARTMENT_FURNITURE='+JSON.stringify(records)+';\n');
writeFileSync('qa/apartment-furniture-placement-r58.json',JSON.stringify({records:records.length,failures},null,2));console.log(JSON.stringify({placed:records.length,bedrooms:records.filter(r=>r.kind==='bed').length,kitchens:records.filter(r=>r.kind==='kitchen').length,failures}));
