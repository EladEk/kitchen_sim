import {itemPolygons,polygonBounds,itemInRoom,scopeKey,updateUnit,normalizeWorkspace} from './apartment-editing.mjs';
import {verticalOverlap} from './furniture-attachments.mjs';
import {furnitureClearances} from './furniture-clearances.mjs';
import {livePlacementError} from './live-furniture.mjs';
export const EDITOR_PREFERENCES={showMeasurements:true,smartSnap:true,autoWalls:false,ghostFurniture:false,showHandles:true};
export function editorPreferences(session){return Object.fromEntries(Object.entries(EDITOR_PREFERENCES).map(([k,v])=>[k,session?.[k]??v]));}
export function moveToClearance(item,guide,centimetres){
 const distance=Number(centimetres)/100;if(!guide||!Number.isFinite(distance)||distance<0||distance>50)throw Error('הזינו מרחק תקין בסנטימטרים.');
 const delta=guide.gap-distance;
 if(guide.axis==='vertical')return {...item,y:(item.y||0)+(guide.direction==='above'?delta:-delta)};
 const dx=guide.to[0]-guide.from[0],dz=guide.to[1]-guide.from[1],length=Math.hypot(dx,dz);if(length<1e-7)throw Error('אין כיוון מדידה זמין למרחק הזה.');
 return {...item,x:item.x+dx/length*delta,z:item.z+dz/length*delta};
}
// Snap only a short, valid move. Invalid candidates remain free for correction.
export function smartFurnitureSnap(item,context,items,threshold=.10){
 if(livePlacementError(item,context,items))return {item,hints:[]};
 let out=item;const hints=[];
 for(let pass=0;pass<2;pass++){
  const guides=furnitureClearances(out,context,items)?.horizontalGuides||[];
  const g=guides.filter(g=>['wall','furniture'].includes(g.type)&&g.gap>.016&&g.gap<=threshold).sort((a,b)=>a.gap-b.gap)[0];if(!g)break;
  const candidate=moveToClearance(out,g,1.5);if(livePlacementError(candidate,context,items))break;out=candidate;hints.push(g.type==='wall'?'לקיר':'לרהיט');
 }
 for(const axis of ['x','z']){
  const b=polygonBounds(itemPolygons(out)),keys=axis==='x'?['minX','maxX']:['minZ','maxZ'],values=[b[keys[0]],out[axis],b[keys[1]]];let best=null;
  for(const other of items){if(other.id===item.id||!verticalOverlap(out,other))continue;const ob=polygonBounds(itemPolygons(other));if(Math.hypot(out.x-other.x,out.z-other.z)>Math.max(out.w,out.d,other.w,other.d)+2)continue;
   for(const target of [ob[keys[0]],other[axis],ob[keys[1]]])for(const value of values){const delta=target-value;if(Math.abs(delta)>.001&&Math.abs(delta)<.06&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta};}
  }
  if(best){const candidate={...out,[axis]:out[axis]+best.delta};if(!livePlacementError(candidate,context,items)){out=candidate;hints.push('יישור');}}
 }
 return {item:out,hints:[...new Set(hints)]};
}
export function restoreRoomAlternative(workspace,saved,context){
 const key=scopeKey(context.scope),current=workspace.units[key]?.items||[],snapshot=saved.units[key]?.items||[];
 if(!context.selectedRoom)return updateUnit(workspace,key,structuredClone(snapshot));
 const members=records=>{const ids=new Set(records.filter(r=>itemInRoom(r,context)).map(r=>r.id));for(const r of records)if(ids.has(r.attachment?.supportId))ids.add(r.id);return ids;},oldIds=members(current),newIds=members(snapshot),restored=snapshot.filter(r=>newIds.has(r.id)),keep=current.filter(r=>!oldIds.has(r.id)&&!newIds.has(r.id));
 return normalizeWorkspace(updateUnit(workspace,key,[...keep,...structuredClone(restored)]));
}
export function pushHistory(history,workspace){return [...history,workspace].slice(-50);}
