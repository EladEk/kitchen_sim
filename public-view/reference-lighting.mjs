import * as T from 'three';
export const REFERENCE_LIGHTING_KEY='homestudio-neutral-lighting';
export function readReferenceLighting(storage){try{return storage?.getItem(REFERENCE_LIGHTING_KEY)!=='off';}catch{return true;}}
export function saveReferenceLighting(storage,on){try{storage?.setItem(REFERENCE_LIGHTING_KEY,on?'on':'off');}catch{}}

// White inspection lighting, independent of the astronomical sky. The sky is
// still visible through windows. Two broad directions retain surface depth.
// Lights remain registered at zero intensity while disabled, keeping native
// shader/shadow layouts stable when the option is changed.
export function createReferenceLighting(scene,renderer,{enabled=true,environmentFactory=null}={}){
 const original={tone:renderer.toneMapping,exposure:renderer.toneMappingExposure,environment:scene.environment,intensity:scene.environmentIntensity,photo:scene.userData.photoEnvironment},materials=new Map(),lights=new Map(),sourceLights=new Set(),owned=new Set(),rig=new T.Group();rig.name='reference-lighting';
 const ambient=new T.AmbientLight('#ffffff',0),hemisphere=new T.HemisphereLight('#ffffff','#dfdfdf',0),key=new T.DirectionalLight('#ffffff',0),fill=new T.DirectionalLight('#ffffff',0),keyTarget=new T.Object3D(),fillTarget=new T.Object3D();
 key.target=keyTarget;fill.target=fillTarget;for(const light of [ambient,hemisphere,key,fill]){light.userData.referenceLighting=true;owned.add(light);rig.add(light);}rig.add(keyTarget,fillTarget);scene.add(rig);
 const width=64,height=32,data=new Uint16Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const radiance=.65+.16*Math.cos((y+.5)/height*Math.PI);data.set([radiance,radiance,radiance,1].map(T.DataUtils.toHalfFloat),(y*width+x)*4);}
 const source=new T.DataTexture(data,width,height,T.RGBAFormat,T.HalfFloatType);source.mapping=T.EquirectangularReflectionMapping;source.needsUpdate=true;
 let target,disposed=false,on=!!enabled;try{if(environmentFactory)target=environmentFactory(source);else{const generator=new T.PMREMGenerator(renderer);try{target=generator.fromEquirectangular(source);}finally{generator.dispose();}}}catch(error){source.dispose();rig.removeFromParent();throw error;}
 function beginFrame(){for(const [light,value]of lights){light.intensity=value.intensity;light.visible=value.visible;if(light.shadow)light.shadow.needsUpdate=value.shadow;}lights.clear();if(on)for(const [m,old]of materials){m.envMap=old.map;m.envMapIntensity=old.intensity;}}
 function bind(root){if(disposed||!root)return;root.traverse(o=>{if(o.isLight&&!owned.has(o))sourceLights.add(o);for(const m of [o.material].flat().filter(Boolean))if(m.isMeshStandardMaterial&&!materials.has(m))materials.set(m,{map:m.envMap,intensity:m.envMapIntensity});});}
 function apply({focus=new T.Vector3()}={}){
  if(disposed)return;
  ambient.intensity=on?.28:0;hemisphere.intensity=on?.65:0;key.intensity=on?1.25:0;fill.intensity=on?.42:0;
  if(!on){renderer.toneMapping=original.tone;return;}
  for(const o of sourceLights){lights.set(o,{intensity:o.intensity,visible:o.visible,shadow:o.shadow?.needsUpdate});o.intensity=0;if(o.parent?.name==='astronomical-light-rig')o.visible=true;if(o.shadow?.map)o.shadow.needsUpdate=false;}
  keyTarget.position.copy(focus);fillTarget.position.copy(focus);key.position.copy(focus).add(new T.Vector3(-4,7,5));fill.position.copy(focus).add(new T.Vector3(5,4,-3));
  scene.environment=target.texture;scene.environmentIntensity=.65;scene.userData.photoEnvironment=source;
  for(const [m]of materials){m.envMap=target.texture;m.envMapIntensity=.65;}
  renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1;
 }
 return {bind,beginFrame,apply,get enabled(){return on;},setEnabled(value){const next=!!value;if(next===on)return;beginFrame();on=next;if(!on)for(const o of sourceLights)if(o.shadow)o.shadow.needsUpdate=true;for(const [m]of materials)m.needsUpdate=true;},get stats(){return {materials:materials.size,targets:disposed?0:1};},dispose(){if(disposed)return;beginFrame();disposed=true;rig.removeFromParent();if(scene.environment===target.texture){scene.environment=original.environment;scene.environmentIntensity=original.intensity;scene.userData.photoEnvironment=original.photo;}target.dispose();source.dispose();source.source.data=null;materials.clear();sourceLights.clear();renderer.toneMapping=original.tone;renderer.toneMappingExposure=original.exposure;}};
}
