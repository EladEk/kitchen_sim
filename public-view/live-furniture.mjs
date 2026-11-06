import {createRoomFocus} from './room-selection.mjs';
import {categoryForKind} from './furniture-catalog.mjs';
import {FURNITURE_TYPES,newItemId,placementError,polygonsOverlap,itemPolygon,itemPolygons,furnitureOverlaps,polygonBounds,normalizeWorkspace,updateUnit,validatePlacements,scopeKey,unitContext} from './apartment-editing.mjs';
import {SUPPORT_KINDS,TV_KINDS,localPoint,resolveAttachments,supportFits,verticalOverlap} from './furniture-attachments.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),round=n=>Math.round(n*10000)/10000;
export function furnitureTemplate(kind,context,items=[],color='#cbbda4'){
 const def=FURNITURE_TYPES[kind],[w,d,h]=def.size,b=context.bounds,anchor=context.selectedRoom?.label||[(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2];return {id:newItemId(),kind,x:anchor[0],z:anchor[1],w:w/100,d:d/100,h:h/100,yaw:0,color,...(def.base?{y:def.base/100}:{})};
}
export function wallPlacement(item,point,context){
 const out=[],gap=.085,turns=item.attachment?.mode==='wall'?(item.attachment.turns||0):0;
 for(const poly of context.walls){const b=polygonBounds([poly]),horizontal=b.maxX-b.minX>b.maxZ-b.minZ,length=horizontal?b.maxX-b.minX:b.maxZ-b.minZ;
  for(const sign of [-1,1]){const yaw=(horizontal?(sign>0?0:Math.PI):(sign>0?Math.PI/2:-Math.PI/2))+turns*Math.PI/2,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw)),alongSize=horizontal?c*item.w+s*item.d:s*item.w+c*item.d,acrossSize=horizontal?s*item.w+c*item.d:c*item.w+s*item.d;if(length<alongSize+.02)continue;
   const along=clamp(point[horizontal?0:1],(horizontal?b.minX:b.minZ)+alongSize/2+.01,(horizontal?b.maxX:b.maxZ)-alongSize/2-.01),edge=horizontal?(sign>0?b.maxZ:b.minZ):(sign>0?b.maxX:b.minX),across=edge+sign*(acrossSize/2+gap),r={...item,x:horizontal?along:across,z:horizontal?across:along,yaw,attachment:{mode:'wall',...(turns?{turns}:{})}};
   if(!placementError(r,context))out.push({r,distance:Math.hypot(r.x-point[0],r.z-point[1])});
  }
 }out.sort((a,b)=>a.distance-b.distance);return out[0]?.distance<=Math.max(1.2,item.d/2+.3,item.w/2+.3)?out[0].r:null;
}
export function topPlacement(item,point,items,supportId=null){
 const hosts=items.filter(r=>r.id!==item.id&&SUPPORT_KINDS.has(r.kind)&&r.attachment?.mode!=='top'&&(!supportId||r.id===supportId)),out=[];
 for(const host of hosts){const [x,z]=localPoint(host,...point);if(!supportId&&(Math.abs(x)>host.w/2+.1||Math.abs(z)>host.d/2+.1))continue;
  const offset=[clamp(x,-Math.max(0,host.w/2-item.w*.25-.015),Math.max(0,host.w/2-item.w*.25-.015)),clamp(z,-Math.max(0,host.d/2-item.d/2-.015),Math.max(0,host.d/2-item.d/2-.015))],r=resolveAttachments([host,{...item,kind:'tv_stand',attachment:{mode:'top',supportId:host.id,offset,yaw:item.attachment?.mode==='top'?item.attachment.yaw:0}}])[1];if(supportFits(r,host))out.push({r,distance:Math.hypot(host.x-point[0],host.z-point[1])});
 }out.sort((a,b)=>a.distance-b.distance);return out[0]?.r||null;
}
export function livePlacementError(item,context,items=[]){
 if(!item)return 'בחרו רהיט.';
 let prospective;
 try{prospective=normalizeWorkspace({schema:1,units:{[scopeKey(context.scope)]:{items:[...items.filter(r=>r.id!==item.id),item]}}}).units[scopeKey(context.scope)].items;}catch(e){return e.message;}
 const family=new Set([item.id,...prospective.filter(r=>r.attachment?.supportId===item.id).map(r=>r.id)]);
 for(const r of prospective.filter(r=>family.has(r.id))){const error=placementError(r,context);if(error)return error;if(prospective.some(o=>o.id!==r.id&&!family.has(o.id)&&verticalOverlap(r,o)&&furnitureOverlaps(r,o)))return 'הריהוט חופף לפריט אחר. הזיזו אותו למקום פנוי.';}
 const error=placementError(item,context);if(error)return error;
 if(item.attachment?.mode==='top'&&!supportFits(item,items.find(r=>r.id===item.attachment.supportId)))return 'בחרו שידה רחבה ועמוקה מספיק לרגל הטלוויזיה.';
 if(items.some(r=>r.id!==item.id&&r.attachment?.supportId!==item.id&&verticalOverlap(item,r)&&furnitureOverlaps(item,r)))return 'הריהוט חופף לפריט אחר. הזיזו אותו למקום פנוי.';
 return '';
}
export function liveCandidate({item,point,mount='floor',context,items=[],grid=.1,supportId=null}){
 if(!['w','d','h','yaw','x','z'].every(k=>Number.isFinite(item[k]))||!point.every(Number.isFinite)||item.w<=0||item.d<=0||item.h<=0)return {item,error:'הזינו מידות ומיקום תקינים.'};
 let candidate={...item,x:round(grid?Math.round(point[0]/grid)*grid:point[0]),z:round(grid?Math.round(point[1]/grid)*grid:point[1])};delete candidate.attachment;
 if(mount==='wall'){candidate=wallPlacement({...candidate,attachment:item.attachment},point,context);if(!candidate)return {item:{...item,x:point[0],z:point[1]},error:'הצביעו על קיר פנוי ורחב מספיק.'};}
 else if(mount==='top'){candidate=topPlacement({...candidate,attachment:item.attachment},point,items,supportId);if(!candidate)return {item:{...item,x:point[0],z:point[1]},error:'הצביעו על משטח של שידה מתאימה.'};}
 else candidate.y=item.y||0;
 return {item:candidate,error:livePlacementError(candidate,context,items)};
}
export function modeForItem(item){return item.attachment?.mode||(item.kind==='tv_wall'||['kitchen_wall','wall_storage','kitchen_wall_glass','kitchen_hood_cabinet','kitchen_open_shelf'].includes(item.kind)?'wall':'floor');}
export function newLiveSession(scope,existing=null){
 return {scope,template:existing?{...existing}:null,item:existing?{...existing}:null,existing:!!existing,original:existing?structuredClone(existing):null,stage:existing?'move':'categories',category:existing?categoryForKind(existing.kind):null,mount:existing?modeForItem(existing):'floor',grid:.1,moveStep:.1,collapsed:false,wallHeight:null,hasPoint:!!existing,supportId:existing?.attachment?.supportId||null,error:'',status:''};
}
export function switchLiveRoom(session,roomId,{nav,workspace,overrides=null}){
 const scope={...session.scope,roomId:roomId||''},context=unitContext(nav,scope,overrides);
 if(!context||(roomId&&!context.selectedRoom))throw Error('החדר שנבחר אינו נמצא בדירה.');
 return {context,focus:createRoomFocus(context),session:{...newLiveSession(scope),grid:session.grid,moveStep:session.moveStep,collapsed:session.collapsed,wallHeight:session.wallHeight,status:'בחרו קטגוריה או רהיט קיים. גררו את התצוגה לסיבוב המצלמה.'}};
}
export function configureLiveFurniture(session,kind,context,items){
 const template=furnitureTemplate(kind,context,items,session.template?.color);
 return {...session,template,item:null,existing:false,stage:'configure',category:categoryForKind(kind),mount:modeForItem(template),hasPoint:false,supportId:null,error:'',status:''};
}
export function backLiveSession(session){
 if(session.stage==='pick')return {...session,item:null,stage:'configure',hasPoint:false,error:'',status:''};
 if(session.existing)return catalogLiveSession(session);
 const stage=session.stage==='configure'||session.stage==='place'||session.stage==='move'?'items':'categories';
 return {...session,item:null,existing:false,hasPoint:false,stage,category:stage==='categories'?null:session.category,error:'',status:''};
}
export function autoLivePlacement(template,context,items=[],{mount=modeForItem(template),supportId=null}={}){
 if(!template||!['w','d','h','yaw'].every(k=>Number.isFinite(template[k]))||template.w<=0||template.d<=0||template.h<=0)return {item:null,error:'הזינו מידות תקינות.'};
 const points=mount==='wall'?context.walls.map(p=>p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0])):mount==='top'?items.filter(r=>SUPPORT_KINDS.has(r.kind)&&r.attachment?.mode!=='top'&&(!supportId||r.id===supportId)).map(r=>[r.x,r.z]):[[template.x,template.z]];
 if(mount==='floor'){
  const b=context.bounds,anchor=context.selectedRoom?.label||[(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2],more=[];
  for(let x=b.minX+.15;x<b.maxX;x+=.25)for(let z=b.minZ+.15;z<b.maxZ;z+=.25)more.push([round(x),round(z)]);
  more.sort((a,b)=>Math.hypot(a[0]-anchor[0],a[1]-anchor[1])-Math.hypot(b[0]-anchor[0],b[1]-anchor[1]));points.push(...more);
 }
 for(const point of points){
  if(mount==='floor'){const r={...template,x:point[0],z:point[1]};if(placementError(r,context)||context.doors.some(d=>itemPolygons(r).some(p=>polygonsOverlap(p,d.closed)||polygonsOverlap(p,d.open))))continue;}
  const result=liveCandidate({item:template,point,mount,context,items,grid:0,supportId});if(!result.error)return {...result,hasPoint:true};
 }
 return {item:null,error:mount==='top'?'בחרו שידה מתאימה בחדר.':'לא נמצא מקום פנוי במידות האלה. שנו מידות או בחרו מיקום ידני.'};
}
export function hiddenFurnitureIds(session,items){return session?.item&&session.existing?[session.item.id,...items.filter(r=>r.attachment?.supportId===session.item.id).map(r=>r.id)]:[];}
export function previewFurnitureItems(session,items){if(!session?.item)return [];return session.existing?resolveAttachments(items.map(r=>r.id===session.item.id?session.item:r)).filter(r=>r.id===session.item.id||r.attachment?.supportId===session.item.id):[session.item];}

// Saving, restoring and previewing never change the display room or the camera.
export function catalogLiveSession(session,status=''){
 return {...newLiveSession(session.scope),grid:session.grid,moveStep:session.moveStep,collapsed:false,wallHeight:session.wallHeight,status};
}
export function livePlacementContext(nav,session,overrides=null){return unitContext(nav,session.existing?{...session.scope,roomId:''}:session.scope,overrides);}
export function saveLiveFurniture(session,workspace,{nav,overrides=null}){
 const item=session.item||session.template;if(!item||!session.hasPoint)throw Error('בחרו מיקום לרהיט.');
 const key=scopeKey(session.scope),items=workspace.units[key]?.items||[];
 if(session.existing&&!items.some(r=>r.id===item.id))throw Error('הרהיט המקורי אינו קיים עוד.');
 const problem=livePlacementError(item,livePlacementContext(nav,session,overrides),items);if(problem)throw Error(problem);
 const next=normalizeWorkspace(updateUnit(workspace,key,session.existing?items.map(r=>r.id===item.id?item:r):[...items,item]),nav),error=validatePlacements(next,nav,overrides);if(error)throw Error(error);
 return {workspace:next,session:catalogLiveSession(session,session.existing?'המיקום החדש נשמר.':'הרהיט נוסף ונשמר.')};
}
export function resolveLiveScope(scope,view){
 const same=view.mode==='building'&&view.building===scope.building&&view.target===`unit:${scope.unit}:${scope.floor}`;
 return same?{...scope,roomId:view.roomFocus?.id||''}:scope;
}
