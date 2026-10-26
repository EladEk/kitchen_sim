import * as THREE from 'three';
import {BUILDING} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {buildingNumberPlate} from './building-signage.js';

export function buildElevators({root,resources,picks,limit=9,shown=true,cube,settings={}}){
 const power=settings.lampsOn!==false?1:0;
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.5,...extra});resources.push(m);return m;};
 const steel=material('#87918e',{metalness:.62}),dark=material('#323e3b'),wall=material('#ddd9cc'),floor=material('#777f77'),button=material('#9acfb8',{emissive:'#448568',emissiveIntensity:.6*power});
 function box(parent,w,h,d,x,y,z,mat,part,data={}){const mesh=new THREE.Mesh(cube,mat);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={part,source:'building-plan',buildingFloor:data.landing??parent.userData.level??0,...data};parent.add(mesh);if(data.action)picks.push(mesh);return mesh;}
 const hallDoors=[],cars=[];
 for(const f of BUILDING_INTERIORS.floors){
  if(f.level>limit)continue;
  const landing=new THREE.Group();landing.userData={part:"lift-landing",level:f.level};root.add(landing);
  for(const l of f.lifts){
   const [x,z]=l.doorCenter,y=f.level*BUILDING.storey;
   box(landing,.11,2.27,.045,x+.06,y+1.13,z-.48,steel,'lift-hall-frame');box(landing,.11,2.27,.045,x+.06,y+1.13,z+.48,steel,'lift-hall-frame');box(landing,.11,.09,1.01,x+.06,y+2.24,z,steel,'lift-hall-frame');
   for(const sign of [-1,1])box(landing,.16,2.25,.18,x,y+1.125,z+sign*.56,wall,'lift-structural-jamb');
   const leaves=[-1,1].map(sign=>box(landing,.045,2.18,.45,x+.035,y+1.09,z+sign*.225,steel,'lift-hall-door',{action:'elevator-call',elevatorId:l.id,landing:f.level}));
   hallDoors.push({level:f.level,id:l.id,z,leaves});
   box(landing,.035,.26,.13,x+.13,y+1.16,z+.83,dark,'lift-call-panel',{action:'elevator-call',elevatorId:l.id,landing:f.level});box(landing,.043,.075,.075,x+.16,y+1.16,z+.83,button,'lift-call-button',{action:'elevator-call',elevatorId:l.id,landing:f.level});
  }
 }
 for(const l of BUILDING_INTERIORS.floors[0].lifts){
  const node=new THREE.Group();node.name=`elevator-car-${l.id}`;node.userData={part:'elevator-car',elevatorId:l.id,source:'building-plan',equipmentInferred:true};root.add(node);
  const x0=l.minX,x1=l.doorCenter[0],z0=l.minZ,z1=l.maxZ,cx=(x0+x1)/2,cz=(z0+z1)/2;
  box(node,x1-x0,.06,z1-z0,cx,-.03,cz,floor,'lift-car-floor');box(node,x1-x0,.06,z1-z0,cx,2.26,cz,wall,'lift-car-ceiling');
  box(node,.055,2.25,z1-z0,x0,1.125,cz,steel,'lift-car-back');for(const z of [z0,z1])box(node,x1-x0,2.25,.055,cx,1.125,z,wall,'lift-car-side');
  box(node,.08,.035,z1-z0-.18,x0+.075,1.02,cz,steel,'lift-car-handrail');
  box(node,.04,.38,.17,x0+.07,1.32,z1-.13,dark,'lift-car-control',{action:'elevator-controls',elevatorId:l.id});
  for(let floorNumber=0;floorNumber<9;floorNumber++){
   const y=.98+Math.floor(floorNumber/3)*.20,z=z1-.25-(floorNumber%3)*.23;
   const data={action:'elevator-ride',elevatorId:l.id,target:floorNumber};
   box(node,.045,.15,.18,x0+.08,y,z,dark,'lift-floor-button',data);
   const plate=buildingNumberPlate(floorNumber,resources);if(plate){plate.scale.set(.75,.75,.75);plate.position.set(x0+.108,y,z);plate.rotation.y=Math.PI/2;plate.userData={part:'lift-floor-number',...data};node.add(plate);picks.push(plate);}
  }
  const glow=material('#fff3e5',{emissive:'#fff1df',emissiveIntensity:1.4*power});box(node,.65,.025,.5,cx,2.225,cz,glow,'lift-car-lamp');
  const light=new THREE.PointLight('#fff1df',7*power,3.5,2);light.userData={fixtureLight:true,kelvin:4000,simulation:true};light.position.set(cx,2.08,cz);node.add(light);
  const leaves=[-1,1].map(sign=>box(node,.045,2.18,.45,x1-.015,1.09,cz+sign*.225,steel,'lift-car-door'));
  cars.push({id:l.id,node,z:cz,leaves});
 }
 return {cars,hallDoors,update(states){
  for(const c of cars){const state=states[c.id];if(!state)continue;c.node.position.y=state.y;c.node.visible=shown&&state.y<=limit*BUILDING.storey+.1;c.leaves.forEach((leaf,i)=>leaf.position.z=c.z+(i?1:-1)*(.225+.45*state.door));}
  for(const h of hallDoors){const c=states[h.id],open=c&&Math.abs(c.y-h.level*BUILDING.storey)<.015?c.door:0;h.leaves.forEach((leaf,i)=>leaf.position.z=h.z+(i?1:-1)*(.225+.45*open));}
 }};
}
