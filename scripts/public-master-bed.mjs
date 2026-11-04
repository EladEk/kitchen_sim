import * as THREE from 'three';
import {point} from '../src/home-model.mjs';
import {groundTransform} from '../src/ground-apartments.mjs';
import {GROUND_APARTMENT_FURNITURE} from '../src/apartment-furniture-layout.mjs';

// Restore the pre-annotation master sleeping zone; preserve public generic furniture.
// Keep generic public dimensions/materials; never copy the owner's furnishings.
export function publicMasterBedAdjustment(){
 const bed=GROUND_APARTMENT_FURNITURE.find(r=>r.unit===1&&r.master&&r.roomId==='master'),t=groundTransform(1),[a,b,c,d]=t.matrix;
 const registration=new THREE.Matrix4().set(a,0,b,t.offset[0],0,1,0,0,c,0,d,t.offset[1],0,0,0,1);
 const original=new THREE.Matrix4().makeTranslation(bed.x,0,bed.z).multiply(new THREE.Matrix4().makeRotationY(bed.angle)).premultiply(registration.invert());
 return {id:bed.id,delta:new THREE.Matrix4().makeTranslation(point(680,803.11)[0],0,point(680,803.11)[1]).multiply(new THREE.Matrix4().makeRotationY(0)).multiply(original.invert())};
}
