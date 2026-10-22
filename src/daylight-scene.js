import * as THREE from 'three';
import {daylightState} from './solar-lighting.mjs';
export function buildDaylight({group,settings,resources,center=[3,0,8],radius=15,distance=35,kitchen=false}){
 const sky=new THREE.HemisphereLight('#e9f1ff','#827461',0);sky.userData.daylight=true;group.add(sky);
 const sun=new THREE.DirectionalLight('#fff4e1',0),target=new THREE.Object3D();target.position.set(...center);group.add(target);sun.target=target;sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,near:.1,far:Math.max(80,distance+radius*2)});sun.shadow.normalBias=.012;sun.shadow.bias=-.00015;sun.shadow.radius=2;group.add(sun);
 let disk;
 if(!kitchen){const g=new THREE.SphereGeometry(.55,16,12),m=new THREE.MeshBasicMaterial({color:'#fff2bc',toneMapped:false});resources.push(g,m);disk=new THREE.Mesh(g,m);disk.userData={part:'sun-position-marker',daylight:true};group.add(disk);}
 // Update only the light rig while dragging the clock, preserving geometry,
 // camera position, textures and open-door animations.
 const update=value=>{
  const state=daylightState(value),[dx,dy,dz]=state.sun.direction,v=kitchen?[-dx,dy,-dz]:[dx,dy,dz];
  sky.intensity=state.sky;sky.visible=state.sky>0;sun.intensity=state.intensity;sun.visible=state.intensity>0;sun.color.set(state.sun.elevation<15?'#ffce91':'#fff4e1');sun.position.set(center[0]+v[0]*distance,center[1]+v[1]*distance,center[2]+v[2]*distance);sun.userData={daylight:true,part:'solar-directional-light',azimuth:state.sun.azimuth,elevation:state.sun.elevation};
  if(disk){disk.visible=state.intensity>0;disk.position.copy(sun.position);}return state;
 };
 update(settings);return update;
}
// Environment reflections are themselves illumination and must be removed in
// lamps-only mode. Keep the texture alive for switching back to daylight.
const savedEnvironment=new WeakMap();
export function applyDaylightPresentation(scene,settings){
 if(!savedEnvironment.has(scene)&&scene.environment)savedEnvironment.set(scene,scene.environment);
 const d=daylightState(settings);scene.environment=d.environment>0?savedEnvironment.get(scene)||null:null;scene.environmentIntensity=d.environment;scene.background?.set(d.background);return d;
}
