import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
// One live mirror and two bounded room probes. None replaces scene.environment.
export function createLocalReflections(renderer,scene,camera,{mobile=false,probeFactory=null,mirrorFactory=null}={}){
 const probes=new Map(),planes=new Map(),bindings=new Map(),failed=new Set();let disposed=false,reflector=null,frameTime=0,lastMirror=-Infinity,enabled=false;
 const restore=()=>{for(const [m,old]of bindings){m.envMap=old;m.needsUpdate=true;}bindings.clear();};
 function mirrorFor(root,point){
  let chosen=null,distance=4;root.updateWorldMatrix(true,true);const local=new THREE.Matrix4(),matrix=new THREE.Matrix4(),p=new THREE.Vector3();
  root.traverseVisible(o=>{if(!o.isMesh||!o.userData.mirrorSurface)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){matrix.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(i,local);matrix.multiply(local);}p.copy(centre).applyMatrix4(matrix);const d=p.distanceTo(point);if(d>=distance)continue;distance=d;const plane=matrix.clone().multiply(new THREE.Matrix4().makeTranslation(centre.x,centre.y,centre.z+size.z/2+.001)).multiply(new THREE.Matrix4().makeScale(size.x,size.y,1));chosen=plane;}});return chosen;
 }
 function makeProbe(position){
  if(probeFactory){const visible=reflector?.visible;if(reflector)reflector.visible=false;try{return probeFactory(position);}finally{if(reflector)reflector.visible=visible;}}
  const cube=new THREE.WebGLCubeRenderTarget(mobile?128:256,{type:THREE.HalfFloatType,generateMipmaps:false}),capture=new THREE.CubeCamera(.08,24,cube),generator=new THREE.PMREMGenerator(renderer),previous=renderer.shadowMap.autoUpdate,xr=renderer.xr.enabled;
  capture.position.copy(position);if(reflector)reflector.visible=false;renderer.shadowMap.autoUpdate=false;renderer.xr.enabled=false;
  try{capture.update(renderer,scene);return generator.fromCubemap(cube.texture);}finally{renderer.shadowMap.autoUpdate=previous;renderer.xr.enabled=xr;generator.dispose();cube.dispose();}
 }
 return {
  prepare(region,root){
   if(disposed||!region||!root||renderer.xr.isPresenting||failed.has(region.key))return false;
   const position=new THREE.Vector3(...region.position);position.y-=1.15;
   if(!probes.has(region.key)){let probe;try{probe=makeProbe(position);}catch{failed.add(region.key);if(failed.size>64)failed.delete(failed.values().next().value);return false;}probes.set(region.key,probe);if(probes.size>2){const [key,old]=probes.entries().next().value;restore();probes.delete(key);planes.delete(key);old.dispose();}}
   const probe=probes.get(region.key);root.traverseVisible(o=>{for(const m of [o.material].flat().filter(Boolean)){if(!m.isMeshStandardMaterial||m.userData.publicFinish==='stone')continue;const eligible=m.userData.architecturalInterior||m.userData.architecturalGlass||m.userData.publicFinish==='floor'||['wood','ceramic'].includes(m.userData.surfaceKind);if(!eligible||m.roughness>.75)continue;if(!bindings.has(m))bindings.set(m,m.envMap);if(m.envMap!==probe.texture){const changed=!m.envMap;m.envMap=probe.texture;if(changed)m.needsUpdate=true;}}});
   const plane=mirrorFor(root,camera.getWorldPosition(new THREE.Vector3()));planes.set(region.key,plane);enabled=!!plane;
   if(plane){if(!reflector){const geometry=new THREE.PlaneGeometry(1,1);try{reflector=mirrorFactory?mirrorFactory(geometry):new Reflector(geometry,{textureWidth:mobile?256:512,textureHeight:mobile?256:512,clipBias:.003,color:0xf2f2f2});}catch{geometry.dispose();enabled=false;planes.set(region.key,null);return true;}const draw=reflector.onBeforeRender;reflector.onBeforeRender=function(...args){if(!enabled||renderer.xr.isPresenting||scene.overrideMaterial||frameTime-lastMirror<(mobile?160:80))return;lastMirror=frameTime;draw.call(this,...args);};reflector.matrixAutoUpdate=false;reflector.userData={visualOnly:true,tourNonPhysical:true,part:'live-room-mirror'};scene.add(reflector);}reflector.matrix.copy(plane);reflector.updateMatrixWorld(true);lastMirror=-Infinity;}
   return true;
  },
  has:key=>probes.has(key)||failed.has(key),
  activate(key){const plane=planes.get(key);enabled=!!plane;if(plane&&reflector){reflector.matrix.copy(plane);reflector.updateMatrixWorld(true);}const probe=probes.get(key);if(probe)for(const [m]of bindings)m.envMap=probe.texture;},
  update(now,{inside=false,effects=true,xr=false}={}){frameTime=now;enabled=enabled&&inside;if(reflector)reflector.visible=enabled&&effects&&!xr;},
  reset(){restore();for(const p of probes.values())p.dispose();probes.clear();planes.clear();failed.clear();enabled=false;if(reflector)reflector.visible=false;},
  get stats(){return {probes:probes.size,mirrors:reflector?1:0};},
  dispose(){if(disposed)return;disposed=true;this.reset();reflector?.removeFromParent();reflector?.geometry.dispose();reflector?.dispose();reflector=null;}
 };
}
