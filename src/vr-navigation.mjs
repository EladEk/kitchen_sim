import * as THREE from 'three';
import {ROOM} from './model.mjs';

export function createKitchenVrNavigation(model){
 model.group.updateMatrixWorld(true);
 const boxes=model.furnishingRoots.map(root=>new THREE.Box3().setFromObject(root)).filter(b=>!b.isEmpty()&&b.min.y<1.3&&b.max.y>.1),radius=.17;
 const canStand=([x,z])=>x>=radius&&x<=ROOM.long*.001-radius&&z>=radius&&z<=ROOM.short*.001-radius&&boxes.every(b=>{const dx=x-Math.max(b.min.x,Math.min(b.max.x,x)),dz=z-Math.max(b.min.z,Math.min(b.max.z,z));return dx*dx+dz*dz>=radius*radius;});
 const move=(position,delta)=>{let p=[...position];const steps=Math.max(1,Math.ceil(Math.hypot(...delta)/.04));for(let i=0;i<steps;i++){const x=[p[0]+delta[0]/steps,p[1]];if(canStand(x))p=x;const z=[p[0],p[1]+delta[1]/steps];if(canStand(z))p=z;}return p;};
 const candidates=[];for(let z=.9;z<3.1;z+=.15)for(let x=.85;x<5.3;x+=.15)if(canStand([x,z]))candidates.push([x,z]);
 candidates.sort((a,b)=>Math.hypot(a[0]-2.725,a[1]-1.1)-Math.hypot(b[0]-2.725,b[1]-1.1));
 return {move,canStand,start:candidates[0]||[2.725,1.1]};
}
