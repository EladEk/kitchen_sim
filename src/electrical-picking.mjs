import * as THREE from 'three';
import {nearestElectricalAnchors} from './electrical-ui.mjs';

// Pick the nearest visible fixture in screen pixels. No large floating target
// is drawn, and opaque cabinets/walls still block a hidden socket.
export function pickKitchenElectrical({model,camera,bounds,clientX,clientY,radius=22}){
 const groups=model?.serviceGroups||model?.electricalGroups;
 if(!groups?.size)return null;
 const candidates=[];
 for(const [id,group] of groups){
  const world=group.getWorldPosition(new THREE.Vector3()),p=world.clone().project(camera);
  if(p.z<=-1||p.z>=1)continue;
  candidates.push({id,x:(p.x*.5+.5)*bounds.width,y:(-p.y*.5+.5)*bounds.height,world,group});
 }
 const near=nearestElectricalAnchors({x:clientX-bounds.left,y:clientY-bounds.top},candidates,radius),ray=new THREE.Raycaster();
 for(const p of near){
  const delta=p.world.clone().sub(camera.position);ray.set(camera.position,delta.clone().normalize());ray.near=.01;ray.far=delta.length()-.025;
  if(ray.intersectObjects(model.electricalOccluders||[],false).length)continue;
  const object=p.group.children.find(o=>o.userData.part==='electrical-faceplate'||o.userData.part==='water-escutcheon');
  if(object)return {object,point:p.world,distance:delta.length()};
 }
 return null;
}
