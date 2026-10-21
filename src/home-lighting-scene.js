import {lightOutput} from './lighting-controls.mjs';
import * as THREE from 'three';
import {LIGHTING_STYLE,lightingVisible} from './home-lighting.mjs';

export function buildLightingPoints({group,box,cylinder,mat,resources,settings,points,picks,interactive=true,selectedRoom}){
 const groups=new Map(),ivory=mat('#f5f3e9',{roughness:.48}),dark=mat('#807d71');
 const focus=points.find(p=>p.roomId===selectedRoom)?.position||[3,2.75,8];
 // Bound shadow samplers on mobile. All lamps emit; the six closest to the
 // inspected room cast detailed shadows, including walls between nearby rooms.
 const shadows=new Set([...points].filter(p=>lightOutput(settings,p.id).power>0).sort((a,b)=>Math.hypot(a.position[0]-focus[0],a.position[2]-focus[2])-Math.hypot(b.position[0]-focus[0],b.position[2]-focus[2])).slice(0,6).map(p=>p.id));
 for(const e of points){
  if(!lightingVisible(e,settings))continue;
  const output=lightOutput(settings,e.id),glow=mat('#f8f7f0',{emissive:output.color,emissiveIntensity:output.power*1.6});
  const p=new THREE.Group(),[x,y,z]=e.position;p.position.set(x,y,z);
  const n=e.normal,wall=e.mount==='wall',target=[x,y-(wall?0:e.drop),z],from=wall?[x+n[0]*1.6,y-.65,z+n[1]*1.6]:[x+.65,y-1.1,z+1.1];
  p.userData={buildingId:e.id,lightingId:e.id,simulation:!!e.simulation,dimensionsInferred:true,inspectionView:{target,from}};group.add(p);groups.set(e.id,p);
  const data=interactive?{action:'building',buildingId:e.id,lightingId:e.id}:null;
  const part=(mesh,name)=>{mesh.userData={...mesh.userData,...data,part:name};if(interactive&&!picks.includes(mesh))picks.push(mesh);return mesh;};
  if(wall){
   p.rotation.y=Math.atan2(n[0],n[1]);
   for(const [depth,radius,h,material] of [[0,.105,.035,ivory],[.022,.09,.018,glow]]){const disk=cylinder(0,0,depth,radius,h,material,p,data);disk.rotation.x=Math.PI/2;part(disk,'observed-wall-light');}
  }else if(e.simulation||e.recessed){
   part(cylinder(0,-.025,0,e.recessed?.085:.16,.05,ivory,p,data),e.recessed?'observed-recessed-light':'simulator-ceiling-fixture');
   part(cylinder(0,-.055,0,e.recessed?.073:.145,.018,glow,p,data),e.recessed?'observed-recessed-diffuser':'simulator-ceiling-diffuser');
  }else{
   part(cylinder(0,-.012,0,.048,.024,ivory,p,data),'observed-ceiling-rose');
   part(cylinder(0,-e.drop/2,0,.003,e.drop-.04,dark,p,data),'observed-light-cable');
   part(cylinder(0,-e.drop,0,.021,.075,ivory,p,data),'observed-lamp-holder');
   part(cylinder(0,-e.drop-.039,0,.014,.003,output.power?glow:dark,p,data),'observed-lamp-holder-opening');
   const bulbGeometry=new THREE.SphereGeometry(.044,16,12);resources.push(bulbGeometry);const bulb=new THREE.Mesh(bulbGeometry,glow);bulb.position.y=-e.drop-.084;bulb.scale.set(1,1.25,1);p.add(bulb);part(bulb,'installed-simulator-bulb');
  }
  // Small marker only; no floating text or oversized hit target over the room.
  const geo=new THREE.RingGeometry(wall ? .12 : e.simulation?.18:.073,wall ? .132 : e.simulation?.195:.087,32);resources.push(geo);const ring=new THREE.Mesh(geo,mat(e.simulation?'#8a65ac':LIGHTING_STYLE.color,{side:THREE.DoubleSide,depthWrite:false}));
  if(wall)ring.position.z=.045;else{ring.rotation.x=Math.PI/2;ring.position.y=-.03;}
  // Visibility is owned by applySceneUiVisibility, including initial clean saves
  // and scene rebuilds while controls are hidden; restoring must show the ring.
  ring.userData={...data,part:'lighting-marker'};p.add(ring);if(interactive)picks.push(ring);
  if(output.power>0){
   const light=wall?new THREE.PointLight(output.color,6*output.power,5,2):new THREE.SpotLight(output.color,18*output.power,8,Math.PI*.46,.5,2);
   light.userData={lightingId:e.id,fixtureLight:true,kelvin:output.kelvin,simulation:!!e.simulation};light.position.set(0,wall?0:-e.drop-.15,wall?.18:0);p.add(light);
   if(!wall){const target=new THREE.Object3D();target.position.set(0,-3,0);p.add(target);light.target=target;}
   light.castShadow=shadows.has(e.id);light.shadow.mapSize.set(wall?256:512,wall?256:512);light.shadow.camera.near=.03;light.shadow.normalBias=.008;light.shadow.bias=-.00015;
  }
 }
 return groups;
}
