import {Vector3} from 'three';
import {getOpening,normalizeOpenParts} from './openings.mjs';
import {getModule} from './model.mjs';
// Opening geometry may initially be baked open. Store both poses once so all
// later clicks update transforms only, including telescopic rails/lift arms.
export function createKitchenKinematics(openingObjects,initialSettings){
 const initial=new Set(normalizeOpenParts(initialSettings.openParts)),bindings=[];
 for(const [id,objects]of openingObjects){
  const opening=getOpening(id),module=getModule(opening.cabinetId),wasOpen=initial.has(id),key=opening.key;
  for(const object of objects){
   const delta=new Vector3(),rotation=object.rotation.clone(),position=object.position.clone();let axis=null,angle=0;
   if(opening.type==='door'){
    if(key==='oven-door'){axis='x';angle=Math.PI*.46;}
    else if(module.type==='dishwasher'){axis='x';angle=Math.PI*.47;}
    else{axis='y';const front=object.children.find(o=>['hinged-front','fridge-door'].includes(o.userData.part));angle=(front?.position.x<0?1:-1)*Math.PI*(front?.userData.part==='fridge-door'?.42:.43);}
   }else if(key==='lift-up'){
    if(object.userData.part==='HL-lift-arm'){axis='x';angle=-.6;}else delta.set(0,.38,.12);
   }else if(key==='mixer-lift')delta.set(0,.51,.4);
   else delta.z=opening.type==='rack'?.26:opening.type==='basket'?.29:key.startsWith('bin-')?.25:key.startsWith('internal-')?.3:module.type==='pullout'?.36:.28;
   if(axis)rotation[axis]-=wasOpen?angle:0;else position.addScaledVector(delta,wasOpen?-1:0);
   const extras=[];object.traverse(child=>{if(child.userData.slideRail||child.userData.mixerLiftArm)extras.push({object:child,position:child.position.clone(),scale:child.scale.clone(),rail:child.userData.slideRail,arm:child.userData.mixerLiftArm});});
   bindings.push({id,object,delta,position,rotation,axis,angle,wasOpen,extras});
  }
 }
 return settings=>{
  const open=new Set(normalizeOpenParts(settings.openParts));
  for(const b of bindings){const active=open.has(b.id),fraction=Number(active)-Number(b.wasOpen);b.object.position.copy(b.position).addScaledVector(b.delta,Number(active));b.object.rotation.copy(b.rotation);if(b.axis)b.object.rotation[b.axis]+=active?b.angle:0;
   for(const e of b.extras){e.object.position.copy(e.position);e.object.scale.copy(e.scale);if(e.rail){e.object.position.z-=fraction*b.delta.z/2;e.object.scale.z*=(.51+Number(active)*b.delta.z)/(.51+Number(b.wasOpen)*b.delta.z);}if(e.arm){e.object.position.y-=fraction*.255;e.object.position.z-=fraction*.4;e.object.scale.y*=(active?.78:.27)/(b.wasOpen?.78:.27);}}
   b.object.updateMatrix();
  }
 };
}
