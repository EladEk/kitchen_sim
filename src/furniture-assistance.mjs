import {getFurniture,getRoom,furnitureBounds,furnitureForSettings,moveHomeFurniture,DOORS,WINDOWS,openingPoint} from './home-model.mjs';
const overlap=(a,b,c,d)=>a<d-.001&&b>c+.001;
const distance=(a,b)=>Math.hypot(Math.max(a.minX-b.maxX,b.minX-a.maxX,0),Math.max(a.minZ-b.maxZ,b.minZ-a.maxZ,0));
function roomEdges(room){return room.polygon.map((a,i)=>({a,b:room.polygon[(i+1)%room.polygon.length]}));}
export function assistedFurnitureMove(settings,id,command){
 if(!command.position||settings.furnitureSnap===false)return moveHomeFurniture(settings,id,command.position?{dx:command.position[0]-getFurniture(id,settings).position[0],dz:command.position[1]-getFurniture(id,settings).position[1]}:command);
 const f=getFurniture(id,settings),position=command.position;if(!f||!position.every(Number.isFinite))return {settings,error:'outside'};
 const candidate={...f,position},b=furnitureBounds(candidate),xs=[position[0]],zs=[position[1]],add=(list,v,original)=>{if(Math.abs(v-original)<=.12)list.push(v);};
 const hx=(b.maxX-b.minX)/2,hz=(b.maxZ-b.minZ)/2;
 for(const {a,b:e} of roomEdges(getRoom(f.roomId))){
  if(Math.abs(a[0]-e[0])<.001&&overlap(b.minZ,b.maxZ,Math.min(a[1],e[1]),Math.max(a[1],e[1])))for(const sign of [-1,1])add(xs,a[0]+sign*(hx+.02),position[0]);
  if(Math.abs(a[1]-e[1])<.001&&overlap(b.minX,b.maxX,Math.min(a[0],e[0]),Math.max(a[0],e[0])))for(const sign of [-1,1])add(zs,a[1]+sign*(hz+.02),position[1]);
 }
 for(const other of furnitureForSettings(settings).filter(o=>o.id!==id&&o.roomId===f.roomId)){
  const q=furnitureBounds(other);
  if(overlap(b.minZ,b.maxZ,q.minZ,q.maxZ)){add(xs,q.minX-hx-.05,position[0]);add(xs,q.maxX+hx+.05,position[0]);}
  if(overlap(b.minX,b.maxX,q.minX,q.maxX)){add(zs,q.minZ-hz-.05,position[1]);add(zs,q.maxZ+hz+.05,position[1]);}
 }
 const candidates=xs.flatMap(x=>zs.map(z=>({position:[x,z],snaps:Number(x!==position[0])+Number(z!==position[1]),distance:Math.hypot(x-position[0],z-position[1])}))).sort((a,b)=>b.snaps-a.snaps||a.distance-b.distance);
 for(const c of candidates){const result=moveHomeFurniture(settings,id,{dx:c.position[0]-f.position[0],dz:c.position[1]-f.position[1]});if(!result.error)return {...result,snapped:c.snaps>0};}
 return moveHomeFurniture(settings,id,{dx:position[0]-f.position[0],dz:position[1]-f.position[1]});
}
export function furnitureClearances(settings,id){
 const f=getFurniture(id,settings);if(!f)return null;const b=furnitureBounds(f),room=getRoom(f.roomId),cx=f.position[0],cz=f.position[1],directions={left:null,right:null,up:null,down:null};
 const set=(key,gap,from,to,label)=>{if(gap>=-.005&&(!directions[key]||gap<directions[key].gap))directions[key]={gap:Math.max(0,gap),from,to,label};};
 for(const {a,b:e} of roomEdges(room)){
  if(Math.abs(a[0]-e[0])<.001&&cz>=Math.min(a[1],e[1])&&cz<=Math.max(a[1],e[1])){set('left',b.minX-a[0],[b.minX,cz],[a[0],cz],'wall');set('right',a[0]-b.maxX,[b.maxX,cz],[a[0],cz],'wall');}
  if(Math.abs(a[1]-e[1])<.001&&cx>=Math.min(a[0],e[0])&&cx<=Math.max(a[0],e[0])){set('up',b.minZ-a[1],[cx,b.minZ],[cx,a[1]],'wall');set('down',a[1]-b.maxZ,[cx,b.maxZ],[cx,a[1]],'wall');}
 }
 const others=furnitureForSettings(settings).filter(o=>o.id!==id&&o.roomId===f.roomId).map(o=>({id:o.id,kind:o.kind,b:furnitureBounds(o)}));
 for(const o of others){const q=o.b;if(overlap(b.minZ,b.maxZ,q.minZ,q.maxZ)){const z=(Math.max(b.minZ,q.minZ)+Math.min(b.maxZ,q.maxZ))/2;set('left',b.minX-q.maxX,[b.minX,z],[q.maxX,z],'furniture');set('right',q.minX-b.maxX,[b.maxX,z],[q.minX,z],'furniture');}if(overlap(b.minX,b.maxX,q.minX,q.maxX)){const x=(Math.max(b.minX,q.minX)+Math.min(b.maxX,q.maxX))/2;set('up',b.minZ-q.maxZ,[x,b.minZ],[x,q.maxZ],'furniture');set('down',q.minZ-b.maxZ,[x,b.maxZ],[x,q.minZ],'furniture');}}
 const openings=list=>list.filter(o=>o.rooms.includes(f.roomId)).map(o=>{const [x,z]=openingPoint(o),q=o.vertical?{minX:x,maxX:x,minZ:o.start,maxZ:o.end}:{minX:o.start,maxX:o.end,minZ:z,maxZ:z};return {id:o.id,gap:distance(b,q)};}).sort((a,b)=>a.gap-b.gap);
 return {directions,nearestFurniture:others.map(o=>({id:o.id,gap:distance(b,o.b)})).sort((a,b)=>a.gap-b.gap)[0],door:openings(DOORS)[0],window:openings(WINDOWS)[0]};
}
