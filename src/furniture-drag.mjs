const gestures=new WeakMap();
function location(event,scale){
 const svg=event.currentTarget.ownerSVGElement,matrix=svg?.getScreenCTM();if(!matrix)return null;
 const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const local=p.matrixTransform(matrix.inverse());return [local.x/scale,local.y/scale];
}
export function furnitureDragHandlers({item,scale,enabled,onSelect,onMove}){
 const end=event=>{const g=gestures.get(event.currentTarget);if(!g||g.pointerId!==event.pointerId)return;gestures.delete(event.currentTarget);if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
 return {
  onPointerDown(event){if(!enabled||event.isPrimary===false||(event.button!=null&&event.button!==0))return;const p=location(event,scale);if(!p)return;event.preventDefault();event.stopPropagation();onSelect?.(item.id);gestures.set(event.currentTarget,{pointerId:event.pointerId,from:p,position:[...item.position]});event.currentTarget.setPointerCapture(event.pointerId);},
  onPointerMove(event){const g=gestures.get(event.currentTarget);if(!enabled||!g||g.pointerId!==event.pointerId)return;const p=location(event,scale);if(!p)return;event.preventDefault();event.stopPropagation();onMove?.(item.id,p.map((n,i)=>Math.round((g.position[i]+n-g.from[i])*100)/100));},
  onPointerUp:end,onPointerCancel:end,onLostPointerCapture:event=>{if(gestures.get(event.currentTarget)?.pointerId===event.pointerId)gestures.delete(event.currentTarget);}
 };
}
