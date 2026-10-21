import {lightOutput} from './lighting-controls.mjs';
import * as THREE from 'three';
import {LIGHTING_STYLE,lightingVisible} from './home-lighting.mjs';

export function buildLightingPoints({group,box,cylinder,mat,resources,settings,points,picks,interactive=true}){
 const groups=new Map(),ivory=mat('#f5f3e9',{roughness:.48}),dark=mat('#807d71');
 for(const e of points){
  if(!lightingVisible(e,settings))continue;
  const output=lightOutput(settings,e.id),glow=mat('#fff2cc',{emissive:output.color,emissiveIntensity:output.power*.65});
  const p=new THREE.Group(),[x,y,z]=e.position;p.position.set(x,y,z);
  const n=e.normal,wall=e.mount==='wall',target=[x,y-(wall?0:e.drop),z],from=wall?[x+n[0]*1.6,y-.65,z+n[1]*1.6]:[x+.65,y-1.1,z+1.1];
  p.userData={buildingId:e.id,lightingId:e.id,dimensionsInferred:true,inspectionView:{target,from}};group.add(p);groups.set(e.id,p);
  const data=interactive?{action:'building',buildingId:e.id,lightingId:e.id}:null;
  const part=(mesh,name)=>{mesh.userData={...mesh.userData,...data,part:name};if(interactive&&!picks.includes(mesh))picks.push(mesh);return mesh;};
  if(wall){
   p.rotation.y=Math.atan2(n[0],n[1]);
   for(const [depth,radius,h,material] of [[0,.105,.035,ivory],[.022,.09,.018,glow]]){const disk=cylinder(0,0,depth,radius,h,material,p,data);disk.rotation.x=Math.PI/2;part(disk,'observed-wall-light');}
  }else{
   part(cylinder(0,-.012,0,.048,.024,ivory,p,data),'observed-ceiling-rose');
   part(cylinder(0,-e.drop/2,0,.003,e.drop-.04,dark,p,data),'observed-light-cable');
   part(cylinder(0,-e.drop,0,.021,.075,ivory,p,data),'observed-lamp-holder');
   part(cylinder(0,-e.drop-.039,0,.014,.003,output.power?glow:dark,p,data),'observed-lamp-holder-opening');
  }
  // Small marker only; no floating text or oversized hit target over the room.
  const geo=new THREE.RingGeometry(wall ? .12 : .073,wall ? .132 : .087,32);resources.push(geo);const ring=new THREE.Mesh(geo,mat(LIGHTING_STYLE.color,{side:THREE.DoubleSide,depthWrite:false}));
  if(wall)ring.position.z=.045;else{ring.rotation.x=Math.PI/2;ring.position.y=-.03;}
  // Visibility is owned by applySceneUiVisibility, including initial clean saves
  // and scene rebuilds while controls are hidden; restoring must show the ring.
  ring.userData={...data,part:'lighting-marker'};p.add(ring);if(interactive)picks.push(ring);
  if(output.power>0){const light=new THREE.PointLight(output.color,(wall ? .6 : 1.1)*output.power,wall?4:6,2);light.userData.lightingId=e.id;light.position.set(0,wall?0:-e.drop-.08,wall?.18:0);p.add(light);}
 }
 return groups;
}
