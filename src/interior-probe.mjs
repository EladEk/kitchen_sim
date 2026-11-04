import * as THREE from 'three';
// Fixed neutral room radiance. Interior materials keep this probe at doorways;
// sky/background and outdoor surfaces retain the astronomical HDR.
export function interiorProbePixels({width=1024,height=512}={}){
 const data=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const up=Math.sin(((y+.5)/height-.5)*Math.PI),phi=(x+.5)/width*Math.PI*2;
  const wall=.47+.07*Math.cos(phi*2),ceiling=.68,floor=.25;
  const base=up>0?wall+(ceiling-wall)*up:wall+(floor-wall)*-up;
  const window=Math.pow(Math.max(0,Math.cos(phi-.6)),28)*Math.exp(-up*up*20)*1.8;
  data.set([base+window,base*.99+window*.99,base*.965+window*.96,1],(y*width+x)*4);
 }return {width,height,data};
}
export function createInteriorProbe(renderer,{mobile=false,environmentFactory=null}={}){
 const pixels=interiorProbePixels({width:mobile?512:1024,height:mobile?256:512}),source=new THREE.DataTexture(Uint16Array.from(pixels.data,THREE.DataUtils.toHalfFloat),pixels.width,pixels.height,THREE.RGBAFormat,THREE.HalfFloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 let target,disposed=false;const materials=new Map();
 try{if(environmentFactory)target=environmentFactory(source);else{const generator=new THREE.PMREMGenerator(renderer);try{target=generator.fromEquirectangular(source);}finally{generator.dispose();}}}catch(error){source.dispose();throw error;}
 return {source,texture:target.texture,bind(root){if(disposed)return;root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean)){if(materials.has(m)||!m.isMeshStandardMaterial||!m.userData.architecturalInterior&&!['fabric','door','ceramic','plaster'].includes(m.userData.surfaceKind))continue;materials.set(m,{envMap:m.envMap,intensity:m.envMapIntensity});m.envMap=target.texture;m.envMapIntensity=.5;m.needsUpdate=true;}});},update(daylight=1){for(const [m]of materials)m.envMapIntensity=Math.max(0,daylight)*.58;},get stats(){return {materials:materials.size,targets:disposed?0:1};},dispose(){if(disposed)return;disposed=true;for(const[m,old]of materials){m.envMap=old.envMap;m.envMapIntensity=old.intensity;m.needsUpdate=true;}materials.clear();target.dispose();source.dispose();source.source.data=null;}};
}
