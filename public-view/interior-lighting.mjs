import {AmbientLight,HemisphereLight,SpotLight,Object3D} from 'three';
import {inside} from './navigation.mjs';

export function interiorAt(data,location,overrides){
 if(!location?.building)return false;
 const f=data?.floors.find(f=>f.level===location.floor),p=[location.position.x,location.position.z];
 if(!f)return false;
 const override=overrides?.get(`${location.building}:${location.floor}:${location.unit||''}`);
 if(override)return override.polygons.some(poly=>inside(p,poly));
 if(f.units.some(u=>inside(p,u.polygon)))return true;
 return inside(p,f.core)||data.destinations.some(d=>!d.unit&&d.floor===location.floor&&d.polygon&&inside(p,d.polygon));
}

// Stable neutral bounce plus ONE bounded ceiling fill shadow. Unlike the R104
// room cubemaps this never changes scene.environment or renders another scene.
export function createInteriorLighting(scene,renderer,{mobile=false}={}){
 // Downward-facing white ceilings receive this ground hemisphere directly.
 // Keep its diffuse bounce neutral instead of colouring the plaster brown.
 const bounce=new HemisphereLight('#f1f1ee','#dddcd8',0),walls=new AmbientLight('#efefeb',0);
 const ceiling=new SpotLight('#fff7ec',0,10,Math.PI/3,.85,2),target=new Object3D();
 ceiling.name='tour-interior-shadow';ceiling.target=target;ceiling.castShadow=true;ceiling.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);ceiling.shadow.bias=-.00015;ceiling.shadow.normalBias=.007;ceiling.shadow.autoUpdate=false;ceiling.shadow.camera.near=.08;
 bounce.name='tour-floor-bounce';walls.name='tour-wall-bounce';scene.add(bounce,walls,ceiling,target);
 let amount=0,exposure=.98,room=null,wanted=null,shadowAmount=0,elapsed=0,interval=80,disposed=false;
 return {
  update({inside=false,walking=false,solar,dt=.016,region=null}={}){
   if(disposed)return {amount:0,exposure,bounce:0,walls:0,shadow:0};
   const daylight=solar?.dark?0:Math.max(0,solar?.daylight||0),weight=1-Math.exp(-Math.min(.1,dt)/(inside?1.15:.8));
   amount+=((walking&&inside?1:0)-amount)*weight;
   bounce.intensity=amount*Math.sqrt(daylight)*.3;walls.intensity=amount*Math.sqrt(daylight)*.08;
   bounce.visible=bounce.intensity>.0001;walls.visible=walls.intensity>.0001;
   wanted=walking&&inside?region:null;
   const same=wanted&&room===wanted.key;shadowAmount+=((same?1:0)-shadowAmount)*(1-Math.exp(-Math.min(.1,dt)/(same?.5:.14)));
   if(!same&&shadowAmount<.015){room=wanted?.key||null;if(wanted){ceiling.position.fromArray(wanted.position);target.position.fromArray(wanted.target);ceiling.shadow.needsUpdate=true;}}
   ceiling.intensity=9*shadowAmount*Math.sqrt(daylight);ceiling.visible=ceiling.intensity>.001;elapsed+=dt*1000;
   if(ceiling.visible&&elapsed>=interval){ceiling.shadow.needsUpdate=true;elapsed=0;}
   const exposureTarget=.98+(daylight>.02?.22:0)*amount;
   exposure+=(exposureTarget-exposure)*weight;renderer.toneMappingExposure=exposure;
   return {amount,exposure,bounce:bounce.intensity,walls:walls.intensity,shadow:ceiling.intensity};
  },
  setQuality({tier=0,shadowInterval=0}={}){interval=Math.max(80,shadowInterval);const size=mobile?(tier>=2?256:512):(tier>=2?512:1024);if(ceiling.shadow.mapSize.x!==size){ceiling.shadow.map?.dispose();ceiling.shadow.map=null;ceiling.shadow.mapSize.set(size,size);ceiling.shadow.needsUpdate=true;}},
  trim(){ceiling.shadow.map?.dispose();ceiling.shadow.map=null;ceiling.shadow.needsUpdate=true;},
  dispose(){if(disposed)return;disposed=true;ceiling.shadow.map?.dispose();for(const light of [bounce,walls,ceiling,target])light.removeFromParent();renderer.toneMappingExposure=.98;}
 };
}
