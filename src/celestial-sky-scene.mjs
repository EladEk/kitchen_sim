import * as THREE from 'three';
import {createCelestialDisks} from './celestial-disks.mjs';
import {celestialState,skyPixels} from './celestial-sky.mjs';
// Background is an infinite equirectangular sky: identical celestial direction
// in both XR eyes, with the same HDR supplied to progressive path tracing.
export function installCelestialSky({renderer,scene,camera,getSettings=()=>({}),onDaylight=null,kitchen=false,mobile=false,ownSun=false,environmentFactory=null}){
 const original={background:scene.background,environment:scene.environment,photo:scene.userData.photoEnvironment};
 let key='',state=null,source=null,filtered=null,disposed=false,lastSettings=null;
 const disks=createCelestialDisks();scene.add(disks.mesh);
 const lightRig=new THREE.Group();lightRig.name='astronomical-light-rig';scene.add(lightRig);
 const target=new THREE.Object3D();lightRig.add(target);
 const moon=new THREE.DirectionalLight('#c4d5ff',0);moon.target=target;moon.userData={part:'astronomical-moonlight',daylight:true};lightRig.add(moon);
 let sun,fill;
 if(ownSun){sun=new THREE.DirectionalLight('#fff4e1',0);sun.target=target;sun.castShadow=true;sun.shadow.mapSize.set(mobile?2048:4096,mobile?2048:4096);sun.shadow.bias=-.00015;sun.shadow.normalBias=.018;sun.shadow.radius=2;lightRig.add(sun);}
 fill=new THREE.HemisphereLight('#d6e5ff','#5b5142',0);fill.userData={part:'astronomical-sky-fill',daylight:true};lightRig.add(fill);
 function update({now=new Date(),focus=camera.position,shadowRadius=55}={}){
  if(disposed)return null;
  const settings=getSettings()||{},minute=Math.floor(now.getTime()/60000),nextKey=JSON.stringify([settings.solar,settings.light,settings.solar?.live===true?minute:null]);
  if(nextKey!==key){
   const nextState=celestialState(settings,now,{kitchen}),pixels=skyPixels(nextState,{width:mobile?1024:2048,height:mobile?512:1024});
   const texture=new THREE.DataTexture(pixels.data,pixels.width,pixels.height,THREE.RGBAFormat,THREE.FloatType);texture.mapping=THREE.EquirectangularReflectionMapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
   let nextFiltered;
   try{if(environmentFactory)nextFiltered=environmentFactory(texture);else{const generator=new THREE.PMREMGenerator(renderer);try{nextFiltered=generator.fromEquirectangular(texture);}finally{generator.dispose();}}}catch(error){texture.dispose();throw error;}
   source?.dispose();filtered?.dispose();source=texture;filtered=nextFiltered;state=nextState;key=nextKey;lastSettings=state.settings;
  }
  if(!state)return null;
  onDaylight?.(lastSettings);disks.update(state);
  scene.background=source;scene.environment=state.dark?null:filtered.texture;scene.environmentIntensity=state.environmentIntensity;scene.userData.photoEnvironment=source;
  if(scene.fog)scene.fog.color.set(state.dark||state.sun.elevation<-6?'#050914':state.sun.elevation<3?'#665b67':'#d2dfea');
  const anchor=focus.clone(),sunDirection=new THREE.Vector3(...state.sun.direction);
  if(sun){
   // Snap the shadow coverage in light space to avoid crawling shadow texels
   // while orbiting. Both light and target move together: astronomy is unchanged.
   const right=new THREE.Vector3(0,1,0).cross(sunDirection);if(right.lengthSq()<1e-8)right.set(1,0,0);right.normalize();
   const up=sunDirection.clone().cross(right).normalize(),texel=shadowRadius*2/sun.shadow.mapSize.x;
   for(const axis of [right,up]){const at=anchor.dot(axis);anchor.addScaledVector(axis,Math.round(at/texel)*texel-at);}
  }
  target.position.copy(anchor);moon.position.copy(anchor).addScaledVector(new THREE.Vector3(...state.moon.direction),100);moon.intensity=state.moonIntensity;moon.visible=moon.intensity>0;
  fill.intensity=state.dark?0:ownSun?state.daylight*1.15+state.twilight*.12+.015:state.daylight>0?0:.015;fill.visible=fill.intensity>0;
  if(sun){const distance=Math.max(100,shadowRadius*2+60);sun.intensity=state.sunIntensity;sun.visible=sun.intensity>0;sun.color.set(state.sun.elevation<15?'#ffcf95':'#fff4e1');sun.position.copy(anchor).addScaledVector(sunDirection,distance);Object.assign(sun.shadow.camera,{left:-shadowRadius,right:shadowRadius,top:shadowRadius,bottom:-shadowRadius,near:.1,far:Math.max(220,distance+shadowRadius*2+80)});sun.shadow.camera.updateProjectionMatrix();}
  return state;
 }
 return {update,get state(){return state;},dispose(){disposed=true;scene.remove(disks.mesh);disks.dispose();source?.dispose();filtered?.dispose();sun?.shadow.map?.dispose();scene.remove(lightRig);scene.background=original.background;scene.environment=original.environment;scene.userData.photoEnvironment=original.photo;}};
}
