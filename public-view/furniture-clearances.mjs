import {itemPolygons,FURNITURE_TYPES} from './apartment-editing.mjs';
import {verticalOverlap,resolveAttachments} from './furniture-attachments.mjs';
import clipping from 'polygon-clipping';
const EPS=1e-8,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const edges=p=>p.map((a,i)=>[a,p[(i+1)%p.length]]);
function pointOnSegment(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length)):0;return [a[0]+t*dx,a[1]+t*dz];}
function inside(p,poly){let yes=false;for(const [a,b]of edges(poly)){if(dist(pointOnSegment(p,a,b),p)<EPS)return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function intersection(a,b,c,d){const r=sub(b,a),s=sub(d,c),den=cross(r,s);if(Math.abs(den)<EPS)return null;const q=sub(c,a),t=cross(q,s)/den,u=cross(q,r)/den;return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?[a[0]+t*r[0],a[1]+t*r[1]]:null;}
// Edge-to-edge model distance, including arbitrary rotations and L-shaped sofas.
export function nearestPolygonClearance(fromPolys,toPolys){
 let best=null;const keep=(from,to)=>{const gap=dist(from,to);if(!best||gap<best.gap-EPS)best={gap,from:[...from],to:[...to]};};
 for(const p of fromPolys)for(const q of toPolys){
  if(inside(p[0],q)){keep(p[0],p[0]);continue;}if(inside(q[0],p)){keep(q[0],q[0]);continue;}
  for(const [a,b]of edges(p))for(const [c,d]of edges(q)){const hit=intersection(a,b,c,d);if(hit){keep(hit,hit);continue;}keep(a,pointOnSegment(a,c,d));keep(b,pointOnSegment(b,c,d));keep(pointOnSegment(c,a,b),c);keep(pointOnSegment(d,a,b),d);}
 }
 return best;
}
function section(poly,level,across){const along=1-across,values=[];for(const [a,b]of edges(poly)){if(level<Math.min(a[across],b[across])-EPS||level>Math.max(a[across],b[across])+EPS)continue;const delta=b[across]-a[across];if(Math.abs(delta)<EPS)values.push(a[along],b[along]);else values.push(a[along]+(b[along]-a[along])*(level-a[across])/delta);}return values.length?[Math.min(...values),Math.max(...values)]:null;}
function directionalClearance(fromPolys,toPolys,direction){
 const across=['left','right'].includes(direction)?1:0,sign=['left','up'].includes(direction)?-1:1;let best=null;
 for(const p of fromPolys)for(const q of toPolys){
  const low=Math.max(Math.min(...p.map(v=>v[across])),Math.min(...q.map(v=>v[across]))),high=Math.min(Math.max(...p.map(v=>v[across])),Math.max(...q.map(v=>v[across])));if(high<low-EPS)continue;
  const levels=[(low+high)/2,...p.concat(q).map(v=>v[across]).filter(v=>v>=low-EPS&&v<=high+EPS)];
  for(const level of levels){const a=section(p,level,across),b=section(q,level,across);if(!a||!b)continue;const start=sign>0?a[1]:a[0],end=sign>0?b[0]:b[1],gap=(end-start)*sign;if(gap< -EPS)continue;if(!best||gap<best.gap-EPS){const from=across?[start,level]:[level,start],to=across?[end,level]:[level,end];best={gap:Math.max(0,gap),from,to};}}
 }
 return best;
}
export const clearanceCentimetres=gap=>Math.round(Math.max(0,gap)*1000)/10;
export const CLEARANCE_DIRECTIONS=Object.freeze([
 {key:'left',name:'שמאל',number:1,color:'#246bb4'},
 {key:'right',name:'ימין',number:2,color:'#b36a15'},
 {key:'up',name:'גב',number:3,color:'#8755b1'},
 {key:'down',name:'חזית',number:4,color:'#2b8162'}
]);
export const clearanceLabel=guide=>(guide.axis==='vertical'?(guide.direction==='above'?'מעל':'מתחת'):guide.directionName||'')+' · '+guide.name+' · ≈ '+clearanceCentimetres(guide.gap)+' ס״מ';
const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-a[1]*b[0];},0))/2;
function sharedFootprintPoint(a,b){let best=null;for(const p of a)for(const q of b)for(const rings of clipping.intersection([p],[q])){const poly=rings[0],size=area(poly);if(size>EPS&&(!best||size>best.size))best={size,point:poly.reduce((s,p)=>[s[0]+p[0]/poly.length,s[1]+p[1]/poly.length],[0,0])};}return best?.point||null;}

function blockedByWall(guide,walls){
 if(guide.gap<EPS)return false;const a=guide.from,b=guide.to,axis=Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1])?0:1;
 return walls.some(poly=>{const segments=edges(poly),cuts=[0,1];for(const [c,d]of segments){const hit=intersection(a,b,c,d);if(hit)cuts.push((hit[axis]-a[axis])/(b[axis]-a[axis]));}cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){if(cuts[i]-cuts[i-1]<EPS)continue;const t=(cuts[i]+cuts[i-1])/2,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(inside(p,poly)&&!segments.some(([c,d])=>dist(pointOnSegment(p,c,d),p)<EPS))return true;}return false;});
}
export function furnitureClearances(item,context,items=[]){
 if(!item||!context||!['x','z','yaw','w','d','h'].every(k=>Number.isFinite(item[k]))||item.w<=0||item.d<=0||item.h<=0||!Number.isFinite(item.y||0))return null;
 let prospective;try{prospective=resolveAttachments([...items.filter(r=>r.id!==item.id),item]);}catch{prospective=[...items.filter(r=>r.id!==item.id),item];}
 // Preserve residents' item order so numbered target names remain stable in previews.
 const byId=new Map(prospective.map(r=>[r.id,r])),ordered=items.map(r=>byId.get(r.id)).filter(Boolean);if(!items.some(r=>r.id===item.id))ordered.push(byId.get(item.id));item=byId.get(item.id)||item;
 const footprint=itemPolygons(item),walls=(context.walls||[]).filter(p=>p.length>=3),directions={left:null,right:null,up:null,down:null},vertical={above:null,below:null};let nearestWall=null,nearestFurniture=null;
 const c=Math.cos(item.yaw),s=Math.sin(item.yaw),local=([x,z])=>[(x-item.x)*c-(z-item.z)*s,(x-item.x)*s+(z-item.z)*c],world=([x,z])=>[item.x+x*c+z*s,item.z-x*s+z*c],localFootprint=footprint.map(p=>p.map(local)),bottom=item.y||0,top=bottom+item.h;
 const family=new Set([item.id,item.attachment?.supportId,...ordered.filter(r=>r.attachment?.supportId===item.id).map(r=>r.id)]);
 const consider=(target,polys,low=bottom,high=top)=>{
  const nearest=nearestPolygonClearance(footprint,polys);if(!nearest)return;
  const all={...target,...nearest};if(target.type==='wall'){if(!nearestWall||all.gap<nearestWall.gap)nearestWall=all;}else if(!blockedByWall(nearest,walls)&&(!nearestFurniture||all.gap<nearestFurniture.gap))nearestFurniture=all;
  const targetLocal=polys.map(p=>p.map(local));for(const definition of CLEARANCE_DIRECTIONS){const key=definition.key,gap=directionalClearance(localFootprint,targetLocal,key);if(!gap)continue;const from=world(gap.from),to=world(gap.to);if(target.type==='furniture'&&blockedByWall({...gap,from,to},walls))continue;
   if(!directions[key]||gap.gap<directions[key].gap-EPS)directions[key]={...target,...gap,from,to,axis:'horizontal',direction:key,directionName:definition.name,number:definition.number,color:definition.color,fromY:(low+high)/2,toY:(low+high)/2,targetPolygons:polys};
  }
 };
 walls.forEach((p,i)=>consider({type:'wall',id:'wall-'+i,name:'קיר'},[p]));
 const counts=new Map(),names=new Map();for(const r of ordered){const n=(counts.get(r.kind)||0)+1;counts.set(r.kind,n);names.set(r.id,(FURNITURE_TYPES[r.kind]?.he||'רהיט')+' '+n);}
 for(const other of ordered){if(other.id===item.id)continue;const polys=itemPolygons(other),low=other.y||0,high=low+other.h,target={type:'furniture',id:other.id,name:names.get(other.id)};
  if(!family.has(other.id)&&verticalOverlap(item,other))consider(target,polys,Math.max(bottom,low),Math.min(top,high));
  const shared=sharedFootprintPoint(footprint,polys);if(!shared)continue;
  let key,fromY,toY;if(low>=top-EPS){key='above';fromY=top;toY=Math.max(top,low);}else if(high<=bottom+EPS){key='below';fromY=bottom;toY=Math.min(bottom,high);}else continue;
  const gap=Math.abs(toY-fromY);if(!vertical[key]||gap<vertical[key].gap-EPS)vertical[key]={...target,axis:'vertical',direction:key,directionName:key==='above'?'מעל':'מתחת',number:key==='above'?5:6,color:'#b04468',gap,from:[...shared],to:[...shared],fromY,toY,targetPolygons:polys};
 }
 // An open side may end at a terrace/room boundary instead of a modeled wall.
 // Label that honestly; do not turn an open edge into an invented wall.
 const domain=context.unitPolygons||context.polygons||[],boundaries=domain.flatMap((poly,i)=>edges(poly).map((edge,j)=>({id:'boundary-'+i+'-'+j,polys:[edge]})));
 for(const definition of CLEARANCE_DIRECTIONS){const key=definition.key;if(directions[key])continue;let best=null;for(const boundary of boundaries){const gap=directionalClearance(localFootprint,boundary.polys.map(p=>p.map(local)),key);if(gap&&(!best||gap.gap<best.gap))best={...gap,id:boundary.id};}if(best)directions[key]={...best,type:'boundary',name:'גבול החלל',axis:'horizontal',from:world(best.from),to:world(best.to),fromY:(bottom+top)/2,toY:(bottom+top)/2,direction:key,directionName:definition.name,number:definition.number,color:definition.color,targetPolygons:[]};}
 const horizontal=Object.values(directions).filter(Boolean),verticalGuides=Object.values(vertical).filter(Boolean);
 return {directions,vertical,horizontalGuides:horizontal,verticalGuides,nearestWall,nearestFurniture,guides:[...horizontal,...verticalGuides],itemId:item.id,sourceName:names.get(item.id),scope:context.scope,elevation:context.elevation||0,height:.03+bottom+item.h/2};
}
export function liveFurnitureClearances(session,context,items=[]){return session?.hasPoint&&['move','place','configure'].includes(session.stage)&&session.item?furnitureClearances(session.item,context,items):null;}
