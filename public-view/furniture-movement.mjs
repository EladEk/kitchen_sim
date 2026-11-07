import {furnitureFootprintBoxes} from '../src/furniture-shape.mjs';
import * as T from 'three';
import {buildingTransform,DISTRICT} from './district.mjs';
import {liveCandidate} from './live-furniture.mjs';
export function furnitureMovementAxes(camera,scope){
 camera.updateMatrixWorld(true);const inverse=buildingTransform(DISTRICT.find(b=>b.id===scope.building)).invert(),right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),forward=new T.Vector3();camera.getWorldDirection(forward);right.y=0;forward.y=0;if(forward.lengthSq()<1e-8){forward.setFromMatrixColumn(camera.matrixWorld,1);forward.y=0;}right.normalize().transformDirection(inverse);forward.normalize().transformDirection(inverse);return {right:[right.x,right.z],up:[forward.x,forward.z]};
}
export function nudgeFurniture(session,direction,{context,items,axes={right:[1,0],up:[0,-1]},distance=session.moveStep||.1}){
 const item=session.item||session.template;if(!item||item.locked)return null;const axis=direction==='left'||direction==='right'?axes.right:axes.up,sign=direction==='left'||direction==='down'?-1:1;
 return {...session,...liveCandidate({item,point:[item.x+axis[0]*distance*sign,item.z+axis[1]*distance*sign],mount:session.mount,context,items,grid:0,supportId:session.supportId}),stage:'move',hasPoint:true};
}
export function furnitureGrab(ray,item,scope,elevation=0){
 const transform=buildingTransform(DISTRICT.find(b=>b.id===scope.building)),base=new T.Matrix4().makeTranslation(item.x,elevation+.03+(item.y||0),item.z).multiply(new T.Matrix4().makeRotationY(item.yaw)),local=ray.ray.clone().applyMatrix4(transform.clone().multiply(base).invert());
 if(!furnitureFootprintBoxes(item).some(([x,z,w,d])=>local.intersectBox(new T.Box3(new T.Vector3(x-w/2,0,z-d/2),new T.Vector3(x+w/2,item.h,z+d/2)),new T.Vector3())))return null;
 const floorRay=ray.ray.clone().applyMatrix4(transform.invert()),point=floorRay.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-elevation-.03),new T.Vector3());return point?[item.x-point.x,item.z-point.z]:null;
}
export function createFurnitureDrag({getSession,grab,preview,commit,restore,cameraEnabled,capture,release}){
 let active=null;
 const end=(e,cancel=false,restoreOriginal=true)=>{const g=active;if(!g||e&&e.pointerId!==g.id)return false;active=null;cameraEnabled(true);release(g.id);if(cancel){if(restoreOriginal&&getSession()?.item?.id===g.session.item.id)restore(g.session);return true;}if(g.moved){const next=preview(e,g.offset);if(next&&!next.error)commit(next);}return true;};
 return {get active(){return !!active;},down(e){const session=getSession();if(active||session?.stage!=='move'||!session.item||session.item.locked||e.button!==0)return false;const offset=grab(e,session);if(!offset)return false;active={id:e.pointerId,x:e.clientX,y:e.clientY,offset,session,moved:false};cameraEnabled(false);capture(e.pointerId);return true;},move(e){if(!active||e.pointerId!==active.id)return false;if(Math.hypot(e.clientX-active.x,e.clientY-active.y)>3)active.moved=true;if(active.moved)preview(e,active.offset);return true;},up:e=>end(e),cancel:(e,restoreOriginal=true)=>end(e,true,restoreOriginal)};
}
