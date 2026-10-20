import * as THREE from 'three';
import {HOUSE,ROOMS,WINDOWS,WALLS,KITCHEN_ANCHOR,openingPoint,point} from './home-model.mjs';
import {OBSERVED_ELEMENTS} from './home-photo-reference.mjs';
import {createKitchenHvac} from './kitchen-hvac.js';

// Permanent, photo-observed fittings remain visible when furniture is hidden.
// All vertical sizes below are explicit estimates, independent of plan x/z.
export function buildObservedArchitecture({group,box,cylinder,mat,resources,wallHeight}){
 const buildingGroups=new Map();
 for(const e of OBSERVED_ELEMENTS){
  if(wallHeight<e.bottom)continue;
  const p=new THREE.Group(),data={action:'building',buildingId:e.id};
  p.userData={buildingId:e.id,source:'site-photos',page:e.page,dimensionsInferred:true};
  group.add(p);buildingGroups.set(e.id,p);
  const white=mat('#efeee8'),[w,d,h]=e.dimensions;
  if(e.kind==='kitchen-bulkhead'){
   p.position.set(KITCHEN_ANCHOR[0],0,KITCHEN_ANCHOR[1]);p.rotation.y=Math.PI;
   const hvac=createKitchenHvac({box,mat,data});for(const child of [...hvac.children])p.add(child);
  }else if(e.kind==='hall-ceiling'||e.kind==='master-ceiling'){
   const poly=e.kind==='hall-ceiling'?ROOMS.find(r=>r.id==='hall').polygon:[[719.4,635.32],[815.76,635.32],[815.76,743.02],[719.4,743.02]].map(v=>point(...v));
   const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:HOUSE.height-e.bottom,bevelEnabled:false,steps:1});geometry.rotateX(Math.PI/2);resources.push(geometry);
   const mesh=new THREE.Mesh(geometry,white);mesh.position.y=HOUSE.height;mesh.castShadow=mesh.receiveShadow=true;mesh.userData=data;p.add(mesh);
   // Register this non-box mesh with the same pick helper, without duplicating geometry.
   p.userData.pickMeshes=[mesh];
  }else if(e.kind==='safe-filter'){
   const o=WINDOWS.find(o=>o.id==='safe-window'),wall=WALLS.find(w=>w.id===o.wallId),[x,z]=openingPoint(o);
   p.position.set(x-.09,0,z-wall.thickness/2-d/2-.015);p.rotation.y=Math.PI;
   box(0,e.bottom+h/2,0,w,h,d,white,p,data,.09);
   box(0,e.bottom+h*.45,d/2+.003,w*.64,h*.64,.012,mat('#dedfd8'),p,data,.025);
   for(const y of [e.bottom+h*.65,e.bottom+h*.32]){const knob=cylinder(0,y,d/2+.018,.022,.012,mat('#606e69'),p,data);knob.rotation.x=Math.PI/2;}
   for(let i=0;i<5;i++)box(-.08+i*.04,e.bottom+.045,d/2+.01,.024,.004,.004,mat('#8c9690'),p,data);
  }
 }
 return buildingGroups;
}
