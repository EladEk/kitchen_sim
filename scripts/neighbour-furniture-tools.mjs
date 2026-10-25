import {polygonContains} from '../src/building-geometry.mjs';
export const overlap=(a,b,pad=0)=>a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad;
export const contains=(b,[x,z],pad=0)=>x>=b.minX-pad&&x<=b.maxX+pad&&z>=b.minZ-pad&&z<=b.maxZ+pad;
export function footprint(x,z,w,d,angle=0){const W=Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*d,D=Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*d;return {minX:x-W/2,maxX:x+W/2,minZ:z-D/2,maxZ:z+D/2};}
export function backing(box,angle,w,walls){
 const turned=Math.abs(Math.sin(angle))>.5,normal=turned?Math.sin(angle):Math.cos(angle),back=turned?(normal>0?box.minX:box.maxX):(normal>0?box.minZ:box.maxZ);
 return walls.reduce((best,v)=>{const edge=turned?(normal>0?v.maxX:v.minX):(normal>0?v.maxZ:v.minZ),gap=(back-edge)*normal,span=Math.min(turned?box.maxZ:box.maxX,turned?v.maxZ:v.maxX)-Math.max(turned?box.minZ:box.minX,turned?v.minZ:v.minX),run=turned?v.maxZ-v.minZ:v.maxX-v.minX;
  return run>w*.7&&span>w*.7&&gap>=.035&&gap<=.19?Math.min(best,gap):best;},Infinity);
}

// Build closed room components from the real walls and door thresholds. The
// room name/seed identifies a component; it is never used as a bed position.
export function furnitureContext({polygon,walls,doors,sliders=[]}){
 const step=.1,xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]),minX=Math.floor(Math.min(...xs)/step)*step,minZ=Math.floor(Math.min(...zs)/step)*step,nx=Math.ceil((Math.max(...xs)-minX)/step)+1,nz=Math.ceil((Math.max(...zs)-minZ)/step)+1,N=nx*nz;
 const bounds={minX,maxX:minX+(nx-1)*step,minZ,maxZ:minZ+(nz-1)*step};walls=walls.filter(w=>overlap(w,bounds,.3));
 const xy=i=>[minX+(i%nx)*step,minZ+Math.floor(i/nx)*step],idx=([x,z])=>Math.round((z-minZ)/step)*nx+Math.round((x-minX)/step);
 const sweeps=doors.map(d=>({minX:Math.min(d.hinge[0],d.closed[0],d.opened[0])-.12,maxX:Math.max(d.hinge[0],d.closed[0],d.opened[0])+.12,minZ:Math.min(d.hinge[1],d.closed[1],d.opened[1])-.12,maxZ:Math.max(d.hinge[1],d.closed[1],d.opened[1])+.12})),thresholds=doors.map(d=>({minX:Math.min(d.hinge[0],d.closed[0])-.07,maxX:Math.max(d.hinge[0],d.closed[0])+.07,minZ:Math.min(d.hinge[1],d.closed[1])-.07,maxZ:Math.max(d.hinge[1],d.closed[1])+.07})),reserves=sliders.map(o=>{const vertical=Math.abs(o.a[0]-o.b[0])<.01;return {minX:Math.min(o.a[0],o.b[0])-(vertical?.85:.12),maxX:Math.max(o.a[0],o.b[0])+(vertical?.85:.12),minZ:Math.min(o.a[1],o.b[1])-(vertical?.12:.85),maxZ:Math.max(o.a[1],o.b[1])+(vertical?.12:.85)};});
 const labels=new Int32Array(N);for(let i=0;i<N;i++){const p=xy(i);if(!polygonContains(p,polygon)||walls.some(w=>contains(w,p,.025))||thresholds.some(w=>contains(w,p)))labels[i]=-1;}
 const components=[];for(let start=0;start<N;start++)if(labels[start]===0){const id=components.length+1,cells=[start];labels[start]=id;for(let h=0;h<cells.length;h++){const i=cells[h];for(const j of [i-1,i+1,i-nx,i+nx])if(j>=0&&j<N&&labels[j]===0&&Math.abs(i%nx-j%nx)<=1){labels[j]=id;cells.push(j);}}components.push(cells);}
 const roomCache=new Map();
 function room(seed){let start=-1,distance=Infinity;for(let i=0;i<N;i++)if(labels[i]>0){const p=xy(i),d=Math.hypot(p[0]-seed[0],p[1]-seed[1]);if(d<distance){start=i;distance=d;}}if(start<0||distance>.65)throw Error('Room seed is outside its source room');const id=labels[start];if(roomCache.has(id))return roomCache.get(id);const cells=components[id-1],has=p=>{const i=idx(p);return i>=0&&i<N&&labels[i]===id&&polygonContains(p,polygon);},centre=cells.reduce((sum,i)=>{const p=xy(i);return sum.map((v,k)=>v+p[k]/cells.length);},[0,0]);
  const pointClear=(p,built=[],radius=.18)=>has(p)&&!walls.some(w=>contains(w,p,radius))&&!built.some(w=>contains(w,p,radius));
  const valid=(b,built=[],reserve=true)=>!walls.some(w=>overlap(w,b,.035))&&!(reserve&&[...sweeps,...reserves].some(w=>overlap(w,b)))&&!built.some(w=>overlap(w,b,.08))&&(()=>{for(let x=b.minX;x<=b.maxX+.001;x+=.12)for(let z=b.minZ;z<=b.maxZ+.001;z+=.12)if(!has([x,z]))return false;return [[b.minX,b.minZ],[b.minX,b.maxZ],[b.maxX,b.minZ],[b.maxX,b.maxZ]].every(has);})();
  const approaches=[];for(const d of [...doors.map(d=>({a:d.hinge,b:d.closed})),...sliders]){const l=Math.hypot(d.b[0]-d.a[0],d.b[1]-d.a[1]);if(l<.4)continue;const p=d.a.map((v,k)=>(v+d.b[k])/2),n=[-(d.b[1]-d.a[1])/l,(d.b[0]-d.a[0])/l];for(const sign of [-1,1]){const q=p.map((v,k)=>v+n[k]*sign*.5);if(pointClear(q))approaches.push(q);}}
  function routesClear(built){const pass=new Uint8Array(N);for(const i of cells)if(pointClear(xy(i),built))pass[i]=1;const targets=approaches.map(p=>idx(p));if(!targets.length)return true;if(targets.some(i=>!pass[i]))return false;const queue=[targets[0]];pass[queue[0]]=2;for(let h=0;h<queue.length;h++){const i=queue[h];for(const j of [i-1,i+1,i-nx,i+nx])if(j>=0&&j<N&&pass[j]===1&&Math.abs(i%nx-j%nx)<=1){pass[j]=2;queue.push(j);}}return targets.every(i=>pass[i]===2);}
  const value={cells,xy,centre,has,pointClear,valid,routesClear,walls,area:cells.length*step*step};roomCache.set(id,value);return value;
 }
 return {room,walls};
}

export function placeBed(room,seed,master,built=[]){
 const sizes=master?[[1.55,2.02],[1.4,1.95],[1.2,1.95]]:[[1,2.02],[.9,1.95]];
 for(const [w,d]of sizes){const candidates=[];for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const i of room.cells){const [x,z]=room.xy(i),box=footprint(x,z,w,d,angle);if(!room.valid(box,built))continue;const gap=backing(box,angle,w,room.walls);if(!Number.isFinite(gap))continue;const n=[Math.sin(angle),Math.cos(angle)],side=[Math.cos(angle),-Math.sin(angle)],foot=[x+n[0]*(d/2+.38),z+n[1]*(d/2+.38)];if(!room.pointClear(foot,built))continue;const sides=[-1,1].filter(sign=>room.pointClear([x+side[0]*sign*(w/2+.35),z+side[1]*sign*(w/2+.35)],built));if(!sides.length)continue;const score=Math.hypot(x-seed[0],z-seed[1])*.16+gap*2-(master?sides.length*.13:0);candidates.push({x,z,w,d,angle,box,headGap:gap,accessibleSides:sides.length,footApproach:foot,score});}
  candidates.sort((a,b)=>a.score-b.score);for(const r of candidates.slice(0,50))if(room.routesClear([...built,r.box]))return r;
 }
 return null;
}

export function placeLiving(room,built=[]){
 for(const [sofaW,mediaW]of [[2.2,1.5],[2,1.3],[1.8,1.1]]){const candidates=[];
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const i of room.cells){const [x,z]=room.xy(i),box=footprint(x,z,mediaW,.34,angle);if(!room.valid(box,built))continue;const gap=backing(box,angle,mediaW,room.walls);if(!Number.isFinite(gap))continue;const n=[Math.sin(angle),Math.cos(angle)];
   for(const distance of [2.6,2.8,3,2.4,3.3,3.6]){const sofa={kind:'sofa',x:x+n[0]*distance,z:z+n[1]*distance,w:sofaW,d:.92,angle:angle+Math.PI};sofa.box=footprint(sofa.x,sofa.z,sofa.w,sofa.d,sofa.angle);if(!room.valid(sofa.box,[...built,box]))continue;
    const coffee={kind:'coffee',x:sofa.x-n[0]*1.16,z:sofa.z-n[1]*1.16,w:.95,d:.55,angle};coffee.box=footprint(coffee.x,coffee.z,coffee.w,coffee.d,angle);if(!room.valid(coffee.box,[...built,box,sofa.box]))continue;
    const side=[Math.cos(angle),-Math.sin(angle)];if(![-1,1].some(sign=>room.pointClear([sofa.x+side[0]*sign*(sofa.w/2+.38),sofa.z+side[1]*sign*(sofa.w/2+.38)],[...built,box,coffee.box])))continue;
    const media={kind:'media',x,z,w:mediaW,d:.34,angle,box},score=Math.hypot(sofa.x-room.centre[0],sofa.z-room.centre[1])*.25+Math.abs(distance-2.8)*.2+gap;
    candidates.push({sofa,coffee,media,score});
   }
  }
  candidates.sort((a,b)=>a.score-b.score);for(const set of candidates.slice(0,80))if(room.routesClear([...built,set.sofa.box,set.coffee.box,set.media.box])){const rug=footprint(set.coffee.x,set.coffee.z,2.05,1.5,set.coffee.angle);if(room.valid(rug,[]))set.coffee.rug={w:2.05,d:1.5};return [set.sofa,set.coffee,set.media];}
 }
 return null;
}
