import * as T from 'three';
import {DISTRICT,buildingTransform} from './district.mjs';
export function setEditorTopView(camera,controls,box){
 const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),v=Math.tan(camera.fov*Math.PI/360),height=Math.max(size.z,size.x/Math.max(.1,camera.aspect))/(2*v)*1.15+size.y;
 camera.position.copy(center).add(new T.Vector3(0,Math.max(4,height),.001));controls.target.copy(center);camera.lookAt(center);controls.update();camera.updateMatrixWorld(true);
}
// Hide only wall pieces that intersect the camera-to-subject ray. No material
// mutations or geometry changes; restoring the view restores each piece.
export function createWallOcclusion(){
 let hidden=new Set(),last=0;
 const restore=()=>{for(const m of hidden)m.visible=true;hidden.clear();};
 return {update(root,camera,target,enabled,now=performance.now()){
  if(!enabled){restore();return;}if(now-last<120)return;last=now;restore();if(!root)return;root.updateWorldMatrix(true,true);
  const direction=target.clone().sub(camera.position),distance=direction.length();if(distance<.1)return;const ray=new T.Ray(camera.position,direction.normalize()),hit=new T.Vector3();
  root.traverse(o=>{if(!o.isMesh||!o.userData.editorWallPiece)return;const box=new T.Box3().setFromObject(o);if(ray.intersectBox(box,hit)&&hit.distanceTo(camera.position)<distance-.1){hidden.add(o);o.visible=false;}});
 },dispose:restore};
}
export function createEditorHandles(host,{getState,onPatch,onRestore,onDistance,controls}){
 const root=document.createElement('div');root.className='editor-gizmo';host.appendChild(root);let drag=null,projection=null;
 const buttons=['x','z','y','rotate'].map((axis,i)=>{const b=document.createElement('button');b.type='button';b.textContent=['↔','↕','↑','↻'][i];b.ariaLabel=['גרירת ציר רוחב','גרירת ציר עומק','גרירת גובה','גרירה לסיבוב'][i];b.className='editor-handle handle-'+axis;root.appendChild(b);
  b.addEventListener('pointerdown',e=>{const s=getState();if(!projection||!s?.item||s.item.locked)return;e.preventDefault();e.stopPropagation();drag={axis,id:e.pointerId,start:[e.clientX,e.clientY],item:structuredClone(s.item),session:s,vector:projection[axis]};b.setPointerCapture(e.pointerId);controls.enabled=false;});
  b.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const dx=e.clientX-drag.start[0],dy=e.clientY-drag.start[1];if(axis==='rotate')onPatch({...drag.item,yaw:drag.item.yaw+dx*Math.PI/180});else{const [vx,vy]=drag.vector,den=vx*vx+vy*vy;if(den<1)return;const delta=(dx*vx+dy*vy)/den;onPatch({...drag.item,[axis]:(drag.item[axis]||0)+delta});}});
  const end=e=>{if(!drag||drag.id!==e.pointerId)return;if(e.type==='pointercancel')onRestore(drag.session);drag=null;controls.enabled=true;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);return b;});
 return {get active(){return !!drag;},update(camera,elevation=0){const state=getState(),item=state?.item,active=state?.stage==='move'&&state.showHandles!==false&&!item?.locked&&state.hasPoint;root.hidden=!active;if(!active||!item)return;
  const b=DISTRICT.find(b=>b.id===state.scope.building);if(!b)return;const matrix=buildingTransform(b),base=new T.Vector3(item.x,elevation+.03+(item.y||0)+item.h/2,item.z),w=host.clientWidth,h=host.clientHeight;
  const screen=p=>{p=p.applyMatrix4(matrix).project(camera);return [(p.x+1)*w/2,(1-p.y)*h/2,p.z];},center=screen(base.clone());if(center[2]<-1||center[2]>1){root.hidden=true;return;}projection={};
  for(const [i,axis]of ['x','z','y'].entries()){const p=base.clone();p[axis]+=1;const end=screen(p),v=[end[0]-center[0],end[1]-center[1]],len=Math.hypot(...v);projection[axis]=v;const button=buttons[i];button.hidden=len<3;button.style.left=Math.max(22,Math.min(w-22,center[0]+v[0]/(len||1)*38))+'px';button.style.top=Math.max(22,Math.min(h-22,center[1]+v[1]/(len||1)*38))+'px';}
  buttons[3].style.left=Math.max(22,Math.min(w-22,center[0]-28))+'px';buttons[3].style.top=Math.max(22,Math.min(h-22,center[1]-28))+'px';
 },dispose(){if(drag)controls.enabled=true;root.remove();}};
}
