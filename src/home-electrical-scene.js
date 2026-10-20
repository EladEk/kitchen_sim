import * as THREE from 'three';
import {ELECTRICAL_LAYOUT} from './home-model.mjs';
import {ELECTRICAL_KINDS,electricalVisible} from './home-electrical.mjs';
import {waterVisible,WATER_STYLE} from './home-water.mjs';

export function buildElectricalPoints({group,box,cylinder,mat,resources,settings,points=ELECTRICAL_LAYOUT.points}){
 const groups=new Map(),fixtures=settings.electricalPresentation==='fixtures',ivory=mat('#f7f7f3',{roughness:.34}),rim=mat('#d7dad5',{roughness:.5}),ink=mat('#28312d');
 for(const e of points){
  if(!electricalVisible(e,settings))continue;
  const p=new THREE.Group();p.position.set(...e.position);p.rotation.y=Math.atan2(e.normal[0],e.normal[1]);
  const [x,y,z]=e.position,n=e.normal;
  const from=e.inspectionOffset?[x+e.inspectionOffset[0],y+e.inspectionOffset[1],z+e.inspectionOffset[2]]:[x+n[0]*1.15,Math.max(1.1,y+.25),z+n[1]*1.15];
  p.userData={buildingId:e.id,electricalId:e.id,dimensionsInferred:true,inspectionView:{from,target:[x,y,z]}};
  group.add(p);groups.set(e.id,p);const data={action:'building',buildingId:e.id,electricalId:e.id,part:'electrical-marker'},style=ELECTRICAL_KINDS[e.kind];
  const coded=mat(style.color,{roughness:.46});
  box(0,0,0,e.width,e.boxHeight,e.depth,coded,p,{...data,part:'electrical-faceplate'});
  box(0,0,.0105,e.width-.01,e.boxHeight-.01,.003,coded,p,{...data,part:'electrical-inset'});
  if(e.kind==='outlet')for(const cx of e.width>.12?[-.033,.033]:[0]){
   const recess=cylinder(cx,0,.013,.026,.002,rim,p,{...data,part:'electrical-socket-recess'});recess.rotation.x=Math.PI/2;
   const face=cylinder(cx,0,.0145,.0235,.002,ivory,p,{...data,part:'electrical-socket-face'});face.rotation.x=Math.PI/2;
   for(const [dx,dy] of [[-.0105,.008],[.0105,.008],[0,-.013]]){const hole=cylinder(cx+dx,dy,.0165,.0037,.002,ink,p,{...data,part:'electrical-socket-hole'});hole.rotation.x=Math.PI/2;}
  }
  else if(e.kind==='control')box(0,0,.015,.035,.052,.007,ivory,p,{...data,part:'electrical-switch-rocker'});
  else {box(0,0,.014,e.width*.55,.043,.004,ivory,p,{...data,part:'electrical-connection-cover'});const aperture=cylinder(0,-.008,.017,.006,.003,ink,p,{...data,part:'electrical-unidentified-opening'});aperture.rotation.x=Math.PI/2;}
  if(!fixtures||settings.selectedElectricalId===e.id){
   const color=mat(style.color,{emissive:style.color,emissiveIntensity:fixtures?0:.12,side:THREE.DoubleSide,depthTest:fixtures,depthWrite:false});
   const ring=(start,length)=>{const g=new THREE.RingGeometry(fixtures ? .052 : .068,fixtures ? .054 : .088,32,1,start,length);resources.push(g);const m=new THREE.Mesh(g,color);m.userData={...data,part:'electrical-highlight'};m.position.z=.025;m.renderOrder=fixtures?1:30;p.add(m);};
   if(e.roomInferred)for(let i=0;i<8;i++)ring(i*Math.PI/4,Math.PI/6);else ring(0,Math.PI*2);
  }
  const pick=cylinder(0,0,.021,.064,.006,mat(style.color,{transparent:true,opacity:fixtures?0:.13,depthWrite:false,depthTest:fixtures}),p,{...data,part:'electrical-annotation-hit'});pick.rotation.x=Math.PI/2;pick.renderOrder=fixtures?0:30;pick.castShadow=false;
 }
 return groups;
}

export function buildWaterPoints({group,box,cylinder,mat,resources,settings,points}){
 const groups=new Map(),blue=mat(WATER_STYLE.color,{roughness:.4,metalness:.15}),steel=mat('#bac3c5',{metalness:.75,roughness:.27}),dark=mat('#163b61'),fixtures=settings.electricalPresentation==='fixtures';
 for(const e of points){
  if(!waterVisible(e,settings))continue;
  const p=new THREE.Group(),[x,y,z]=e.position,n=e.normal,data={action:'building',buildingId:e.id,electricalId:e.id,waterId:e.id};
  p.position.set(x,y,z);p.rotation.y=Math.atan2(n[0],n[1]);p.userData={...data,inspectionView:{from:[x+n[0]*1.15,Math.max(1.1,y+.25),z+n[1]*1.15],target:[x,y,z]}};group.add(p);groups.set(e.id,p);
  const round=(z,r,h,material,part,cx=0)=>{const m=cylinder(cx,0,z,r,h,material,p,{...data,part});m.rotation.x=Math.PI/2;return m;};
  for(const cx of e.clusterSpacing?[-e.clusterSpacing,e.clusterSpacing]:[0]){round(0,.032,.009,blue,'water-escutcheon',cx);round(.018,.014,.035,steel,'water-valve-body',cx);round(.038,.018,.012,dark,'water-valve-outlet',cx);box(cx,.022,.021,.052,.011,.016,blue,p,{...data,part:'water-valve-handle'});}
  if(!fixtures||settings.selectedElectricalId===e.id){const geo=new THREE.RingGeometry(.052,.055,32);resources.push(geo);const material=mat(WATER_STYLE.color,{side:THREE.DoubleSide,depthTest:fixtures,depthWrite:false}),ring=new THREE.Mesh(geo,material);ring.position.z=.049;ring.renderOrder=fixtures?1:30;ring.userData={...data,part:'electrical-highlight'};p.add(ring);}
  const pick=round(.025,.064,.006,mat(WATER_STYLE.color,{transparent:true,opacity:0,depthTest:fixtures,depthWrite:false}),'electrical-annotation-hit');pick.castShadow=false;
 }
 return groups;
}
