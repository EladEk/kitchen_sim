import {createArchitecturalNight} from '../src/architectural-night.mjs';
import {AmbientLight,PointLight,DirectionalLight,HemisphereLight,SpotLight,Object3D} from 'three';
import {setArchitecturalGlassQuality,dimAlphaGlazing} from '../src/architectural-glass.mjs';
import {createInteriorProbe} from '../src/interior-probe.mjs';
import {refreshShadowTarget,resizeShadowTarget} from '../src/shadow-target.mjs';
import {RectAreaLight,Vector3} from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
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

export function coveredInteriorAt(data,location){
 if(!data||!location?.position||!location.building)return false;
 const floor=location.floor??0,elevation=data.floors?.find(f=>f.level===floor)?.elevation??floor*data.storey,localY=location.position.y-elevation;
 // Use the covered plan, excluding display polygons for gardens/terraces.
 return localY>=0&&localY<2.85&&interiorAt(data,location);
}

// Stable warm daylight bounce plus ONE bounded ceiling fill shadow. Unlike the R104
// room cubemaps this never changes scene.environment or renders another scene.
export function createInteriorLighting(scene,renderer,{mobile=false,environmentFactory=null,manageExposure=true}={}){
 // Downward-facing white ceilings receive this ground hemisphere directly.
 // R179: neutral-cool daylight. The owner's survey-155 photos show white walls
 // and ceilings with no warm cast; the warm fills read cream/peach.
 const night=createArchitecturalNight(scene,renderer);const glass=new Set();let glassTier=0,lastXR=false,captureGlass=false;const updateGlass=()=>{for(const m of glass)setArchitecturalGlassQuality(m,{mobile:mobile&&!captureGlass,tier:glassTier,xr:lastXR});};let probe=null;RectAreaLightUniformsLib.init();const area=new RectAreaLight('#f7f9fc',0,1.2,.5);area.name='tour-local-area';scene.add(area);const areaTarget=new Vector3();
 const windowFill=new DirectionalLight('#f4f8ff',0),windowTarget=new Object3D();
 windowFill.name='tour-window-bounce';windowFill.target=windowTarget;
 scene.add(windowFill,windowTarget);
 const grazing=new PointLight('#f6f8fb',0,8,2);grazing.name='tour-grazing-fill';scene.add(grazing);
 const bounce=new HemisphereLight('#f7f9fc','#e2e2df',0),walls=new AmbientLight('#f5f7f9',0);
 const ceiling=new SpotLight('#f8fafd',0,10,Math.PI/3,.85,2),target=new Object3D();
 ceiling.name='tour-interior-shadow';ceiling.target=target;ceiling.castShadow=true;ceiling.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);ceiling.shadow.bias=-.00015;ceiling.shadow.normalBias=.007;ceiling.shadow.autoUpdate=false;ceiling.shadow.needsUpdate=true;ceiling.shadow.camera.near=.08;ceiling.shadow.camera.layers.enable(1);
 // A visible manual-update shadow must own a comparison depth texture on the
 // FIRST outdoor frame, even while its light intensity is zero.
 ceiling.position.set(0,2.55,0);target.position.set(0,0,0);
 bounce.name='tour-floor-bounce';walls.name='tour-wall-bounce';scene.add(bounce,walls,ceiling,target);
 let amount=0,exposure=.98,room=null,wanted=null,shadowAmount=0,disposed=false;
 return {
  bind:root=>{night.bind(root);probe??=createInteriorProbe(renderer,{mobile,environmentFactory});probe.bind(root);root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))if(m.userData.architecturalGlass)glass.add(m);else dimAlphaGlazing(m);});updateGlass();},
  update({inside=false,walking=false,solar,dt=.016,region=null,focus=null,xr=false,neutral=false}={}){
   if(disposed)return {amount:0,exposure,bounce:0,walls:0,shadow:0};
   if(lastXR!==xr){lastXR=xr;updateGlass();}
   const daylight=neutral?1:solar?.dark?0:Math.max(0,solar?.daylight||0),weight=1-Math.exp(-Math.min(.1,dt)/(inside?1.15:.8));
   night.update({night:!neutral&&daylight<.03,focus:focus||(region?new Vector3(...region.position):new Vector3())});
   ceiling.color.set(daylight<.03?'#ffe2b1':'#f8fafd');
   amount+=((walking&&inside?1:0)-amount)*weight;probe?.update(daylight);
   const areaOn=walking&&inside&&region&&room===region.key&&['kitchen','bathroom','wc'].includes(region.kind);area.intensity=areaOn?amount*shadowAmount*Math.sqrt(daylight)*1.4:0;area.visible=true;if(areaOn){area.position.fromArray(region.position);area.position.y-=.12;area.lookAt(areaTarget.fromArray(region.target));}
   bounce.intensity=amount*Math.sqrt(daylight)*.75;walls.intensity=amount*Math.sqrt(daylight)*.12;
   windowFill.intensity=amount*Math.sqrt(daylight)*2.1;
   grazing.intensity=amount*Math.sqrt(daylight)*3.5;if(region)grazing.position.fromArray(region.position).add(new Vector3(.3,-.12,0));
   if(region){windowTarget.position.fromArray(region.target).add(new Vector3(0,1.2,0));windowFill.position.copy(windowTarget.position).add(new Vector3(-1.5,2,-4));}
   bounce.visible=true;walls.visible=true;
   wanted=walking&&inside?region:null;
   const same=wanted&&room===wanted.key;shadowAmount+=((same?1:0)-shadowAmount)*(1-Math.exp(-Math.min(.1,dt)/(same?.5:.14)));
   if(!same&&shadowAmount<.015){room=wanted?.key||null;if(wanted){ceiling.position.fromArray(wanted.position);target.position.fromArray(wanted.target);ceiling.shadow.needsUpdate=true;}}
   ceiling.intensity=shadowAmount*(daylight<.03?14:6*Math.sqrt(daylight));ceiling.visible=true;
   if(!ceiling.shadow.map)ceiling.shadow.needsUpdate=true;
   const exposureTarget=.98+(daylight>.02?.37:0)*amount;
   exposure+=(exposureTarget-exposure)*weight;if(manageExposure)renderer.toneMappingExposure=exposure;
   return {amount,exposure,bounce:bounce.intensity,walls:walls.intensity,shadow:ceiling.intensity};
  },
  invalidateShadows(){ceiling.shadow.needsUpdate=true;night.invalidateShadows();},
  setQuality({tier=0,capture=false}={}){night.setQuality({capture});if(glassTier!==tier||captureGlass!==capture){glassTier=tier;captureGlass=capture;updateGlass();}const size=capture?2048:mobile?(tier>=2?256:512):(tier>=2?512:1024);resizeShadowTarget(renderer,ceiling.shadow,size);},
  trim(){refreshShadowTarget(renderer,ceiling.shadow);},
  dispose(){if(disposed)return;disposed=true;night.dispose();probe?.dispose();glass.clear();area.removeFromParent();ceiling.shadow.map?.dispose();for(const light of [bounce,walls,ceiling,target,windowFill,windowTarget,grazing])light.removeFromParent();renderer.toneMappingExposure=.98;}
 };
}
