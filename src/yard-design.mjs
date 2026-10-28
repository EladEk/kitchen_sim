// Proposed work only. The source plot, chamber, openings and AC units stay fixed.
export const YARD_LIMITS={shed:{w:[1.9,4],d:[2,4],h:[2.1,2.6]},pergola:{w:[1.5,6],d:[1.5,6],h:[2.2,3.4]},fence:{h:[.8,2.2]}};
const rectangle=b=>[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]];
const bounds=p=>({minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[1])),maxZ:Math.max(...p.map(v=>v[1]))});
const box=p=>({minX:p.x-p.w/2,maxX:p.x+p.w/2,minZ:p.z-p.d/2,maxZ:p.z+p.d/2});
const intersects=(a,b)=>a.minX<b.maxX-.002&&a.maxX>b.minX+.002&&a.minZ<b.maxZ-.002&&a.maxZ>b.minZ+.002;
const contains=(outer,inner,gap=0)=>inner.minX>=outer.minX+gap-.002&&inner.maxX<=outer.maxX-gap+.002&&inner.minZ>=outer.minZ+gap-.002&&inner.maxZ<=outer.maxZ-gap+.002;
const colour=v=>typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v);
const inside=(p,poly)=>{let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
function overlapsHouse(b,poly){
 if(rectangle(b).some(p=>inside(p,poly))||poly.some(([x,z])=>x>b.minX+.002&&x<b.maxX-.002&&z>b.minZ+.002&&z<b.maxZ-.002))return true;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),r=rectangle(b);
 return r.some((a,i)=>poly.some((c,j)=>{const d=poly[(j+1)%poly.length],e=r[(i+1)%4];return cross(a,e,c)*cross(a,e,d)<-1e-8&&cross(c,d,a)*cross(c,d,e)<-1e-8;}));
}
export function defaultYardItem(context,id){
 if(id==='fence')return {h:context.garden.fence.height,color:context.garden.fence.color};
 const b=id==='shed'?context.service.shed:context.garden.bounds;
 return {x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,w:b.maxX-b.minX,d:b.maxZ-b.minZ,h:id==='shed'?context.service.shed.h:3,...(id==='pergola'?{color:'#e6dfcc'}:{})};
}
export function yardEditError(context,id,p){
 const limits=YARD_LIMITS[id];if(!limits)return 'unsupported';
 if(Object.entries(limits).some(([key,[min,max]])=>!Number.isFinite(p[key])||p[key]<min||p[key]>max))return 'size';
 if('color' in p&&!colour(p.color))return 'size';
 if(id==='fence')return null;
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return 'outside';
 const b=box(p);
 if(id==='pergola'){
  if(!contains(context.garden.bounds,b))return 'paving';
  const kitchen=context.outdoorKitchen;
  if(kitchen)for(const x of [b.minX+.12,b.maxX-.12])for(const z of [b.minZ+.12,b.maxZ-.12])if(intersects({minX:x-.07,maxX:x+.07,minZ:z-.07,maxZ:z+.07},kitchen))return 'kitchen';
  return null;
 }
 if(!contains(bounds(context.plot),b,.05)||b.minZ<context.exterior.porch.maxZ-.002||b.minX<context.service.safeWindow.minX-.002)return 'outside';
 if(intersects(b,bounds(context.service.manhole.access)))return 'chamber';
 if(intersects(b,context.service.safeWindow))return 'window';
 if(context.exterior.units.some(a=>intersects(b,a.body)||intersects(b,a.front)))return 'ac';
 if(intersects(b,context.exterior.porch)||intersects(b,context.exterior.court))return 'exit';
 if(overlapsHouse(b,context.house))return 'house';
 return null;
}
export function normalizeYardDesign(context,value){
 const result={};if(!value||typeof value!=='object'||Array.isArray(value))return result;
 for(const id of ['shed','pergola','fence']){
  const raw=value[id];if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const base=defaultYardItem(context,id);
  // Migrate only the former default footprint. Keep deliberately moved/resized sheds.
  const legacyShed=id==='shed'&&Math.abs(raw.w-3.5)<1e-5&&Math.abs(raw.d-3)<1e-5&&Math.abs(raw.x-(context.service.shed.maxX-1.75))<1e-5&&Math.abs(raw.z-base.z)<1e-5;
  const source=legacyShed?{...raw,x:base.x,z:base.z,w:base.w,d:base.d}:raw;
  const candidate=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,source[k]??v]));
  if(!yardEditError(context,id,candidate))result[id]=candidate;
 }return result;
}
export function changeYardDesign(context,value,id,command={}){
 const design=normalizeYardDesign(context,value);if(!YARD_LIMITS[id])return {design,error:'unsupported'};
 if(command.reset){delete design[id];return {design};}
 const current=design[id]||defaultYardItem(context,id),next={...current,...command.dimensions,...('color' in command?{color:command.color}:{})};
 if(id!=='fence'){
  // Resize against the far shed corner / balcony edge, preserving fence clearance.
  if(command.dimensions){next.x=current.x+(current.w-next.w)/2;next.z=id==='shed'?current.z+(current.d-next.d)/2:current.z+(next.d-current.d)/2;}
  if(command.position){next.x=command.position[0];next.z=command.position[1];}
  else{next.x+=command.dx??0;next.z+=command.dz??0;}
 }
 const error=yardEditError(context,id,next);if(error)return {design,error};
 return {design:{...design,[id]:next}};
}
export function resolveYardDesign(context,value){
 const design=normalizeYardDesign(context,value),baseGarden=context.garden,baseService=context.service;
 let garden=baseGarden,service=baseService;
 if(design.pergola||design.fence){
  const p=design.pergola||defaultYardItem(context,'pergola'),b=box(p),f=design.fence||defaultYardItem(context,'fence');
  const fence={...baseGarden.fence,height:f.h,panel:f.h-baseGarden.fence.curb,color:f.color};
  garden={...baseGarden,bounds:b,pergola:rectangle(b),width:p.d,depth:p.w,pergolaArea:p.w*p.d,pergolaHeight:p.h,pergolaColor:p.color,fence,posts:baseGarden.posts.map((post,i)=>({...post,x:i<2?b.minX+.12:b.maxX-.12,z:i%2?b.maxZ-.12:b.minZ+.12,height:p.h-.15}))};
  garden.elements=baseGarden.elements.map(e=>e.id==='garden-pergola'&&design.pergola?{...e,dimensions:[p.d,p.w,p.h],area:p.d*p.w,originLabel:['בחירת תכנון שלך','Your planning choice'],noteHe:'מידות ומיקום שנבחרו בסימולטור, בתוך רצועת הריצוף המקורית. גובה ופריסת העמודים להמחשה.',noteEn:'Your simulated dimensions and position, within the original paving strip. Height and post arrangement are illustrative.'}:e.id.startsWith('fence-')&&e.planned&&design.fence?{...e,dimensions:[e.dimensions[0],e.dimensions[1],f.h],metrics:[{he:'פנל מעל הבסיס',en:'Panel above base',value:fence.panel,unit:'m'},{he:'בסיס קיים משוער',en:'Assumed existing base',value:fence.curb,unit:'m'}],originLabel:['בחירת תכנון שלך · תוואי קיים','Your planning choice · fixed boundary'],noteHe:'גובה וגוון שנבחרו בסימולטור. תוואי הגבול ובסיס האבן נשמרו; זו אינה מדידה או בדיקת היתר.',noteEn:'Height and colour selected in the simulator. Boundary and stone base are retained; this is not a measurement or permit check.'}:e);
 }
 if(design.shed){
  const p=design.shed,b=box(p),old=baseService.shed,cx=(old.minX+old.maxX)/2,ratio=(p.w-2*old.wall)/(old.w-2*old.wall);
  const appliances=old.appliances.map(a=>({...a,x:p.x+(a.x-cx)*ratio,z:b.maxZ-(old.maxZ-a.z)})),shelves={minX:b.minX+old.wall,maxX:b.minX+old.wall+.4,minZ:b.minZ+.25,maxZ:b.minZ+Math.min(1.4,p.d-1.01)};
  const shed={...old,...b,polygon:rectangle(b),w:p.w,d:p.d,h:p.h,fenceGap:bounds(context.plot).maxX-b.maxX,passage:b.minX-Math.max(...context.house.flatMap((a,i)=>{const c=context.house[(i+1)%context.house.length];return Math.abs(a[0]-c[0])<.01&&a[0]<=b.minX&&Math.max(a[1],c[1])>b.minZ+.002&&Math.min(a[1],c[1])<b.maxZ-.002?[a[0]]:[]})),door:{...old.door,x:p.x,z:b.minZ,height:Math.min(2,p.h-.1)},appliances,shelves};
  service={...baseService,shed,elements:baseService.elements.map(e=>e.id==='garden-shed'?{...e,he:'מחסן — בחירת התכנון שלך',en:'Shed — your planning choice',dimensions:[p.w,p.d,p.h],area:p.w*p.d,parts:[shed.door],originLabel:['בחירת תכנון שלך','Your planning choice'],metrics:[{he:'שטח פנים משוער',en:'Assumed inside area',value:(p.w-.12)*(p.d-.12),unit:'m²'},{he:'פער מקו הגדר',en:'Gap from boundary',value:shed.fenceGap,unit:'m'}],noteHe:'מידות ומיקום שנבחרו בסימולטור. שני המכשירים נשארים מידות מקום שמור בלבד. אזורי הגישה והאוורור הם עזרי תכנון משוערים לפי המקורות.',noteEn:'Dimensions and position selected in the simulator. Appliances remain planning placeholders. Access and ventilation zones are source-based planning estimates.'}:e.id==='service-manhole'?{...e,metrics:e.metrics.map(m=>m.en==='Shed side to symbol rim'?{...m,value:Math.hypot(Math.max(b.minX-baseService.manhole.position[0],0,baseService.manhole.position[0]-b.maxX),Math.max(b.minZ-baseService.manhole.position[1],0,baseService.manhole.position[1]-b.maxZ))-.5}:m)}:e)};
 }
 return {garden,service,design};
}
