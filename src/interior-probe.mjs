import * as THREE from 'three';
// Fixed warm daylight room radiance. Interior materials keep this probe at doorways;
// sky/background and outdoor surfaces retain the astronomical HDR.
export function interiorProbePixels({width=1024,height=512}={}){
 const data=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const up=Math.sin(((y+.5)/height-.5)*Math.PI),phi=(x+.5)/width*Math.PI*2;
  // R177: the light-grey porcelain floor bounces more daylight than .34 implied;
  // that lower hemisphere is what lights a downward-facing ceiling.
  const wall=.64+.06*Math.cos(phi*2),ceiling=.88,floor=.46;
  const base=up>0?wall+(ceiling-wall)*up:wall+(floor-wall)*-up;
  const window=Math.pow(Math.max(0,Math.cos(phi-.6)),28)*Math.exp(-up*up*20)*1.8;
  data.set([base*1.015+window*1.05,base*.995+window*.99,base*.965+window*.91,1],(y*width+x)*4);
 }return {width,height,data};
}
export function createInteriorProbe(renderer,{mobile=false,environmentFactory=null}={}){
 const pixels=interiorProbePixels({width:mobile?512:1024,height:mobile?256:512}),source=new THREE.DataTexture(Uint16Array.from(pixels.data,THREE.DataUtils.toHalfFloat),pixels.width,pixels.height,THREE.RGBAFormat,THREE.HalfFloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 let target,disposed=false;const materials=new Map();
 try{if(environmentFactory)target=environmentFactory(source);else{const generator=new THREE.PMREMGenerator(renderer);try{target=generator.fromEquirectangular(source);}finally{generator.dispose();}}}catch(error){source.dispose();throw error;}
 // Room radiance provides diffuse fill and reflections without making the
 // paint emissive. Direct room light and contact shading retain surface depth.
 function bind(root){
  if(disposed)return;
  root.traverse(object=>{
   for(const m of [object.material].flat().filter(Boolean)){
    const d=m.userData;
    if(materials.has(m)||!m.isMeshStandardMaterial||(!d.wallCavity&&!d.architecturalCeiling&&!d.architecturalInterior&&!['fabric','door','ceramic','plaster'].includes(d.surfaceKind)))continue;
    materials.set(m,{envMap:m.envMap,intensity:m.envMapIntensity});
    m.envMap=target.texture;m.envMapIntensity=.8;m.needsUpdate=true;
   }
  });
 }
 function update(daylight=1){
  const light=Math.max(0,Math.min(1,daylight));
  for(const [m] of materials){
   const paint=m.userData.surfaceKind==='plaster'||m.userData.architecturalCeiling||m.userData.wallCavity;
   m.envMapIntensity=light*(paint?(m.userData.architecturalCeiling?1:.8):m.userData.furnitureMaterial?.7:m.userData.publicFinish==='floor'?.6:.8);
  }
 }
 function dispose(){
  if(disposed)return;disposed=true;
  for(const [m,old] of materials){
   m.envMap=old.envMap;m.envMapIntensity=old.intensity;
   m.needsUpdate=true;
  }
  materials.clear();target.dispose();source.dispose();source.source.data=null;
 }
 return {source,texture:target.texture,bind,update,dispose,get stats(){return {materials:materials.size,targets:disposed?0:1};}};
}
