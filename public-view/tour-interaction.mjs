// A click acts on the first visible surface, so closed walls and glass still
// occlude doors. Dragging or a canceled/multiple-pointer gesture never acts.
export function createTourTap(){
 let gesture=null;
 return {down(e){if(e.button!==undefined&&e.button!==0){gesture=null;return;}if(gesture){gesture=null;return;}gesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};},move(e){if(gesture&&e.pointerId===gesture.id&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7)gesture.moved=true;},up(e){const g=gesture;gesture=null;return !!g&&g.id===e.pointerId&&!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<=7;},cancel(){gesture=null;}};
}
export function pickTourSurface(ray,root,{far=6}={}){
 root.updateWorldMatrix(true,true);const previous=ray.far;ray.far=far;
 try{return ray.intersectObject(root,true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible||o.userData.sceneUi||o.userData.tourNonPhysical&&!o.userData.renderFixture)return false;const m=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;return m?.visible!==false&&m?.opacity!==0&&m?.colorWrite!==false;})||null;}finally{ray.far=previous;}
}
export function tourActionData(object){for(let o=object;o;o=o.parent)if(o.userData.action)return o.userData;return null;}
