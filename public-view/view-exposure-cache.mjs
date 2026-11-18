import {Vector3} from 'three';

// Retain the evaluated positions, so many sub-threshold movements eventually
// trigger a new lookup. Reuse the result and vectors across animation frames.
export function createViewExposureCache(insideAt,{distance=.02}={}){
 const camera=new Vector3(),target=new Vector3(),result={cameraInside:false,targetInside:false};
 const threshold=distance*distance;
 let initialized=false,lastWalking,lastFocused;
 return (position,aim,{walking=false,focused=false}={})=>{
  const changed=!initialized||walking!==lastWalking||focused!==lastFocused;
  if(changed||camera.distanceToSquared(position)>threshold){
   result.cameraInside=!!insideAt(position);camera.copy(position);
  }
  if(!walking&&focused){
   if(changed||target.distanceToSquared(aim)>threshold){
    result.targetInside=!!insideAt(aim);target.copy(aim);
   }
  }else result.targetInside=false;
  initialized=true;lastWalking=walking;lastFocused=focused;
  return result;
 };
}
