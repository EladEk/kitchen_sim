import * as THREE from 'three';

// Keep moving branches separate from static district and apartment batches.
// Their geometry/materials stay shared; only transforms and instance buffers
// belong to these lightweight display copies.
export function motionAncestor(object,stop=null){
 for(let p=object;p&&p!==stop;p=p.parent)if(p.userData.tourMotionId)return p;
 return null;
}
export function motionRoots(template){
 const roots=[];template.traverse(o=>{if(o.userData.tourMotionId&&!motionAncestor(o.parent,template))roots.push(o);});return roots;
}
export function createMotionCopy(source,template){
 const group=new THREE.Group(),clone=source.clone(true),bindings=[],instances=[];
 group.userData={level:source.userData.level??0,exterior:source.userData.exterior??false};
 const bind=(a,b)=>{if(a.userData.tourMotionId)bindings.push([a,b]);if(b.isInstancedMesh)instances.push(b);a.children.forEach((child,i)=>bind(child,b.children[i]));};bind(source,clone);group.add(clone);
 const sync=()=>{template.updateWorldMatrix(true,false);source.parent.updateWorldMatrix(true,false);group.matrixAutoUpdate=false;group.matrix.copy(template.matrixWorld).invert().multiply(source.parent.matrixWorld);for(const [a,b] of bindings){b.position.copy(a.position);b.quaternion.copy(a.quaternion);b.scale.copy(a.scale);b.updateMatrix();}group.updateMatrixWorld(true);};
 sync();return {group,sync,dispose(){instances.forEach(o=>o.dispose());instances.length=bindings.length=0;group.removeFromParent();group.clear();}};
}
