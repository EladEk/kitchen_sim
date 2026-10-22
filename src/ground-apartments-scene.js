import * as THREE from 'three';
import {groundBaseProfile,groundTransform,groundBaseServices,baseOpeningPosition,GROUND_KITCHEN} from './ground-apartments.mjs';
import {point} from './home-model.mjs';
import {createSurfacePalette,metricSurfaceUVs} from './surface-materials.mjs';
import {buildObservedArchitecture} from './home-observed-scene.js';
import {buildElectricalPoints,buildWaterPoints} from './home-electrical-scene.js';
import {lightOutput} from './lighting-controls.mjs';

// One shared base geometry, three rigid placements. Gardens, ordered products,
// movable owner furniture and the owner's kitchen never enter this builder.
export function buildGroundApartments({root,resources,picks,settings,cut=false,mode='building'}){
 const profile=groundBaseProfile(),template=new THREE.Group(),h=cut?.85:profile.height,mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,...extra});resources.push(m);return m;},surface=createSurfacePalette(resources);
 const paint=surface('paint','#eeece5'),stone=surface('limestone','#d9d2c5'),neutralFloor=surface('porcelain','#d0cdc5'),wetFloor=surface('cement','#c4c3bd'),white=mat('#f0f0e9'),metal=mat('#343e3d',{metalness:.35,roughness:.4}),glass=mat('#acc2ca',{transparent:true,opacity:.28,depthWrite:false,roughness:.18}),wood=surface('paint','#dedbd1');
 const cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);let interactive=false;
 const box=(x,y,z,w,hh,d,m,parent=template,data=null)=>{const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,hh,d);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={...(data||{}),baseline:true};parent.add(mesh);if(interactive&&data?.action)picks.push(mesh);return mesh;};
 const cylinder=(x,y,z,r,hh,m,parent=template,data=null)=>{const g=new THREE.CylinderGeometry(r,r,hh,20);resources.push(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.userData={...(data||{}),baseline:true};mesh.castShadow=true;parent.add(mesh);if(interactive&&data?.action)picks.push(mesh);return mesh;};
 const polygon=(poly,y,m,parent=template,depth=0)=>{const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shape);geo.rotateX(Math.PI/2);metricSurfaceUVs(geo);resources.push(geo);const mesh=new THREE.Mesh(geo,m);mesh.position.y=y;mesh.receiveShadow=true;mesh.castShadow=!!depth;parent.add(mesh);return mesh;};
 for(const room of profile.rooms){const floor=polygon(room.polygon,.012,['bathroom','wc','utility'].includes(room.kind)?wetFloor:neutralFloor);floor.userData={part:'ground-base-room',roomId:room.id,baseline:true};if(!cut&&mode==='walk')polygon(room.polygon,profile.height,paint);}
 for(const wall of profile.walls){
  const vertical=Math.abs(wall.a[0]-wall.b[0])<.001,lo=wall.a[vertical?1:0],hi=wall.b[vertical?1:0],holes=[...profile.doors,...profile.windows].filter(o=>o.wallId===wall.id).sort((a,b)=>a.start-b.start);
  const segment=(a,b,bottom,hh)=>{if(b-a<.002||hh<.002)return;const m=box(vertical?wall.a[0]:(a+b)/2,bottom+hh/2,vertical?(a+b)/2:wall.a[1],vertical?wall.thickness:b-a,hh,vertical?b-a:wall.thickness,wall.external?stone:paint);m.userData={part:'ground-base-wall',baseWallId:wall.id,blockPick:true,baseline:true};};
  let cursor=lo;for(const o of holes){segment(cursor,o.start,0,h);if(o.sill)segment(o.start,o.end,0,Math.min(h,o.sill));if(h>o.sill+o.height)segment(o.start,o.end,o.sill+o.height,h-o.sill-o.height);cursor=o.end;}segment(cursor,hi,0,h);
  if(!cut&&wall.external)segment(lo,hi,profile.height,3.1-profile.height);
 }
 for(const o of [...profile.windows,...profile.doors]){
  const y=o.sill||0,hh=Math.min(o.height,h-y);if(hh<=0)continue;const [x,z]=baseOpeningPosition(o),p=new THREE.Group();p.position.set(x,y,z);p.rotation.y=o.vertical?Math.PI/2:0;template.add(p);p.userData={part:'ground-base-opening',baseOpeningId:o.id};
  for(const xx of [-o.width/2,o.width/2])box(xx,hh/2,0,.035,hh,.09,metal,p);if(!cut)box(0,hh,0,o.width,.035,.09,metal,p);
  if(o.type==='window'||o.type==='slider'){
   if(o.type==='window'){box(0,hh/2,0,o.width-.05,hh-.05,.012,glass,p);box(0,hh/2,0,.03,hh,.07,metal,p);box(0,-.035,0,o.width+.08,.055,.25,stone,p);}
   else{box(o.width/4,hh/2,0,o.width/2-.04,hh-.03,.012,glass,p);box(0,hh/2,0,.035,hh,.09,metal,p);}
   if(!cut&&o.type==='window'&&o.id!=='ensuite-window'&&o.id!=='utility-window'){box(0,hh+.13,0,o.width+.08,.22,.18,paint,p);}
  }
 }
 // Generic white ceramic shapes at the plan's wet-room fixture positions.
 // No owner-selected brand or catalogue product is assigned to neighbours.
 if(settings.furniture!==false)for(const f of profile.furniture){
  const p=new THREE.Group();p.position.set(f.position[0],0,f.position[1]);p.rotation.y=f.rotation;p.userData={part:'ground-base-fixture',baseFixtureId:f.id,baseline:true};template.add(p);
  if(f.kind==='wc'){box(0,.37,0,f.w,.16,f.d,white,p);box(0,.2,-.1,.24,.3,.28,white,p);box(0,.46,-.02,f.w-.025,.025,f.d-.06,wood,p);}
  else if(f.kind==='tub'||f.kind==='basin'){box(0,f.h/2,0,f.w,f.h,f.d,white,p);box(0,f.h+.004,0,f.w-.12,.009,f.d-.11,wetFloor,p);cylinder(f.w*.3,f.h+.015,0,.025,.012,metal,p);if(f.kind==='basin')box(0,f.h+.11,-f.d/2+.04,.025,.22,.025,metal,p);}
  else if(f.kind==='shower'){box(0,.025,0,f.w,.045,f.d,wetFloor,p);if(!cut)box(f.w/2-.02,1,0,.012,2,f.d,glass,p);}
  else if(f.kind==='washer'){box(0,f.h/2,0,f.w,f.h,f.d,white,p);const door=cylinder(0,.4,f.d/2+.012,.19,.018,metal,p);door.rotation.x=Math.PI/2;}
 }
 if(settings.furniture!==false){
  const p=new THREE.Group();p.userData={part:'ground-base-kitchen',source:'house-plan',page:1,proposed:true};template.add(p);
  const counter=GROUND_KITCHEN.counterPdf.map(p=>point(...p));polygon(counter,.87,wood,p,.85);polygon(counter,.91,white,p,.035);
  const hob=point(1103.16,340.60),sink=point(1185.30,341.20);box(hob[0],.92,hob[1],.54,.015,.54,metal,p);for(const x of [-.14,.14])for(const z of [-.14,.14])cylinder(hob[0]+x,.932,hob[1]+z,.075,.005,wetFloor,p);box(sink[0],.922,sink[1],.40,.014,.35,wetFloor,p);cylinder(sink[0],.933,sink[1],.026,.008,metal,p);box(sink[0],1.03,sink[1]+.2,.025,.23,.025,metal,p);
  const fridge=GROUND_KITCHEN.fridgePdf.map(p=>point(...p)),xs=fridge.map(p=>p[0]),zs=fridge.map(p=>p[1]);box((Math.min(...xs)+Math.max(...xs))/2,.95,(Math.min(...zs)+Math.max(...zs))/2,Math.max(...xs)-Math.min(...xs),1.9,Math.max(...zs)-Math.min(...zs),wood,p);
 }
 buildObservedArchitecture({group:template,box,cylinder,mat,resources,wallHeight:h});
 const groups=new Map();
 for(const unit of [1,2,3]){
  const node=template.clone(true),t=groundTransform(unit),[a,b,c,d]=t.matrix;
  node.matrixAutoUpdate=false;node.matrix.set(a,0,b,t.offset[0],0,1,0,0,c,0,d,t.offset[1],0,0,0,1);node.name=`garden-apartment-${unit}-base`;node.userData={part:'ground-base-apartment',unit,derived:true,reflected:t.reflected,source:'building-plan',page:3};root.add(node);groups.set(unit,node);
  node.traverse(o=>{o.userData={...o.userData,unit,derived:true,buildingFloor:0};delete o.userData.action;delete o.userData.buildingId;delete o.userData.pickMeshes;if(o.userData.blockPick)picks.push(o);});
  const services=groundBaseServices(unit),worldGroup=new THREE.Group();worldGroup.name=`garden-apartment-${unit}-services`;root.add(worldGroup);interactive=true;
  const flags={...settings,selectedElectricalId:null,electricalPresentation:'fixtures'};
  const electric=services.filter(p=>p.serviceKind==='electrical'),water=services.filter(p=>p.serviceKind==='water');
  buildElectricalPoints({group:worldGroup,box,cylinder,mat,resources,settings:flags,points:electric});buildWaterPoints({group:worldGroup,box,cylinder,mat,resources,settings:flags,points:water});
  // One switched room light in a neighbouring unit bounds mobile light count.
  // All derived lamps retain a purple simulator ring awaiting documentation.
  for(const e of services.filter(p=>p.serviceKind==='lighting'&&settings.showLighting!==false)){
   const [x,y,z]=e.position,output=lightOutput(settings,e.baseId),glow=mat('#f3f1e9',{emissive:output.color,emissiveIntensity:output.power}),p=new THREE.Group(),data={action:'building',buildingId:e.id,part:'ground-derived-light',derived:true,simulation:true};p.position.set(x,y,z);worldGroup.add(p);
   if(e.mount==='wall'){p.rotation.y=Math.atan2(e.normal[0],e.normal[1]);const face=new THREE.Group();face.rotation.x=Math.PI/2;p.add(face);cylinder(0,.025,0,.105,.05,white,face,data);cylinder(0,.06,0,.09,.018,glow,face,data);}else{cylinder(0,-.04,0,.13,.06,white,p,data);cylinder(0,-.075,0,.115,.012,glow,p,data);}
   if(settings.showLighting!==false){const ringGeo=new THREE.RingGeometry(.14,.153,24);resources.push(ringGeo);const ring=new THREE.Mesh(ringGeo,mat('#8a65ac',{side:THREE.DoubleSide}));ring.rotation.x=Math.PI/2;ring.position.y=-.085;ring.userData={...data,part:'lighting-marker'};p.add(ring);}
   if(mode==='walk'&&settings.tourDestination===`unit:${unit}:0`&&e.roomId==='living'&&e.mount==='ceiling'&&output.power>0){const light=new THREE.PointLight(output.color,7*output.power,10,2);light.position.y=-.2;light.userData={fixtureLight:true,simulation:true,unit,kelvin:output.kelvin};p.add(light);}
  }
  worldGroup.traverse(o=>{o.userData.buildingFloor=0;});
 }
 return groups;
}
