import {Color,Vector3,RectAreaLight,SpotLight} from 'three';
import {resizeShadowTarget} from './shadow-target.mjs';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';

// Reuse the existing fixture positions. LTC area lights provide linear LED
// reflections; local spot fixtures provide the occluded/shadowed contribution.
// RectAreaLight itself does not cast shadow maps in Three.js.
export function createArchitecturalNight(scene,renderer){
 RectAreaLightUniformsLib.init();const lights=new Map(),emitters=new Map(),linear=new Set(),areas=[0,1].map(()=>{const l=new RectAreaLight('#ffe2b1',0,1,.025);l.userData.nightPool=true;scene.add(l);return l;}),spots=areas.map(()=>{const l=new SpotLight('#ffe2b1',0,9,Math.PI*.42,.9,2);l.castShadow=true;l.shadow.camera.layers.enable(1);l.shadow.mapSize.set(512,512);l.shadow.autoUpdate=false;l.shadow.needsUpdate=true;l.shadow.normalBias=.007;l.shadow.bias=-.00015;l.shadow.radius=2;l.userData.nightPool=true;scene.add(l,l.target);return l;}),point=new Vector3(),target=new Vector3(),warm=new Color('#ffe2b1');let dark=false;
 const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 return {
  bind(root){root.traverse(o=>{if(o.isLight&&o.userData.fixtureLight&&!lights.has(o)){lights.set(o,{color:o.color.clone()});if(dark)o.color.copy(warm);}if(!o.isMesh)return;for(const m of [o.material].flat().filter(Boolean))if(m.emissiveIntensity>0&&!emitters.has(m)){emitters.set(m,{color:m.emissive.clone(),intensity:m.emissiveIntensity});if(dark){m.emissive.copy(warm);m.emissiveIntensity=Math.min(2.5,Math.max(1.6,m.emissiveIntensity));}}if(/linear|led-strip|pergola-light/.test(o.userData.part||''))linear.add(o);});},
  update({night=false,focus=new Vector3()}={}){
   if(dark!==night){dark=night;for(const [l,old]of lights)l.color.copy(night?warm:old.color);for(const [m,old]of emitters){m.emissive.copy(night?warm:old.color);m.emissiveIntensity=night?Math.min(2.5,Math.max(1.6,old.intensity)):old.intensity;}}
   const nearest=night?[...linear].filter(visible).map(o=>({o,p:o.getWorldPosition(new Vector3())})).filter(v=>v.p.distanceToSquared(focus)<144).sort((a,b)=>a.p.distanceToSquared(focus)-b.p.distanceToSquared(focus)).slice(0,2):[];
   areas.forEach((l,i)=>{const e=nearest[i];l.intensity=e?3:0;if(e){l.position.copy(e.p).add(new Vector3(0,-.018,0));l.width=Math.min(5,Math.max(.5,e.o.geometry?.parameters?.width||1.5));l.height=.025;target.copy(l.position).add(new Vector3(0,-1,.15));l.lookAt(target);}const spot=spots[i],changed=!!e!==(spot.intensity>0)||e&&spot.position.distanceToSquared(l.position)>.0001;spot.intensity=e?4:0;if(e){spot.position.copy(l.position);spot.target.position.copy(target);}if(changed)spot.shadow.needsUpdate=true;});
  },
  invalidateShadows(){for(const l of spots)l.shadow.needsUpdate=true;},
  setQuality({capture=false}={}){for(const l of spots)resizeShadowTarget(renderer,l.shadow,capture?2048:512);},
  dispose(){for(const [l,old]of lights)l.color.copy(old.color);for(const [m,old]of emitters){m.emissive.copy(old.color);m.emissiveIntensity=old.intensity;}for(const l of areas)l.removeFromParent();for(const l of spots){l.shadow.map?.dispose();l.removeFromParent();l.target.removeFromParent();}lights.clear();emitters.clear();linear.clear();}
 };
}
