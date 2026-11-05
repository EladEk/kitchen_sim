import {Vector3} from 'three';

// Static architecture needs a new shadow only after a source/occluder change
// or a meaningful camera displacement, not on every animation frame.
export function createShadowRefresh({distance=1}={}){
 let key=null,dirty=true,last=-Infinity;const anchor=new Vector3();
 return {
  update(focus,nextKey,now,{interval=0}={}){
   const changed=dirty||key!==nextKey;
   if(!changed&&(anchor.distanceToSquared(focus)<distance*distance||now-last<interval))return false;
   anchor.copy(focus);key=nextKey;last=now;dirty=false;return true;
  },
  get anchor(){return anchor;},invalidate(){dirty=true;}
 };
}
