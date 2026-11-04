import * as THREE from 'three';
import {roundedRect} from './kitchen-sink.mjs';

// Photo-based ceramic forms. Only the nominal catalogue/order envelope is
// documented; all bowl slopes, radii and thicknesses are visual estimates.
export function createCeramicBowl(resources,{productId,w,d,top,depth,innerW,innerD,innerZ=.025,radius=.02,innerRadius=.025,lowerScale=.8,tapHole=null,drainX=0,drainZ=.015}){
 const group=new THREE.Group();group.userData={productId,shapeBasis:'catalog-product-image',detailsInferred:true};
 const ceramic=new THREE.MeshPhysicalMaterial({color:'#f5f4ef',roughness:.09,clearcoat:1,clearcoatRoughness:.08,ior:1.5,metalness:0,side:THREE.DoubleSide}),metal=new THREE.MeshStandardMaterial({color:'#b9c1be',roughness:.23,metalness:.88,side:THREE.DoubleSide}),dark=new THREE.MeshStandardMaterial({color:'#525d59',roughness:.6});ceramic.userData={surfaceKind:'ceramic',architecturalInterior:true};resources.push(ceramic,metal,dark);
 const add=(geometry,material,part)=>{resources.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.userData={productId,part,detailsInferred:true};mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const outline=(width,dd,r,z=0,path=new THREE.Shape())=>roundedRect(path,width,dd,Math.min(r,width/2-.001,dd/2-.001),0,z);
 const cap=(shape,y,thickness,material,part)=>{const g=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:12});g.rotateX(Math.PI/2);g.translate(0,y,0);return add(g,material,part);};
 const rim=outline(w,d,radius);rim.holes.push(outline(innerW,innerD,innerRadius,innerZ,new THREE.Path()));
 if(tapHole){const hole=new THREE.Path();hole.absarc(tapHole[0],tapHole[1],.017,0,Math.PI*2,true);rim.holes.push(hole);}
 cap(rim,top,.013,ceramic,'ceramic-rim');
 function loft(rings,part){
  const p=[];
  for(let j=0;j<rings.length-1;j++){
   const a=rings[j],b=rings[j+1];
   for(let i=0;i<a.points.length-1;i++){const aa=a.points[i],ab=a.points[i+1],ba=b.points[i],bb=b.points[i+1];p.push(aa.x,a.y,aa.y,ba.x,b.y,ba.y,ab.x,a.y,ab.y,ab.x,a.y,ab.y,ba.x,b.y,ba.y,bb.x,b.y,bb.y);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();add(g,ceramic,part);
 }
 const ring=(width,dd,r,z,y)=>({points:outline(width,dd,r,z).getPoints(12),y});
 loft([ring(w,d,radius,0,top-.012),ring(w*lowerScale,d*lowerScale,radius,0,top-depth-.018)],'ceramic-outer-body');
 const bw=innerW*.84,bd=innerD*.78,by=top-depth;
 loft([ring(innerW,innerD,innerRadius,innerZ,top-.012),ring(bw,bd,innerRadius,innerZ,by)],'ceramic-bowl-wall');
 const bowlFloor=outline(bw,bd,innerRadius,innerZ),hole=new THREE.Path();hole.absarc(drainX,drainZ,.019,0,Math.PI*2,true);bowlFloor.holes.push(hole);cap(bowlFloor,by,.012,ceramic,'ceramic-bowl-floor');
 cap(outline(w*lowerScale,d*lowerScale,radius),top-depth-.019,.01,ceramic,'ceramic-underside');
 const drain=new THREE.RingGeometry(.013,.023,36);drain.rotateX(-Math.PI/2);drain.translate(drainX,by+.001,drainZ);add(drain,metal,'ceramic-drain-ring');
 const waste=new THREE.CircleGeometry(.012,24);waste.rotateX(-Math.PI/2);waste.translate(drainX,by-.003,drainZ);add(waste,dark,'ceramic-waste');
 if(productId==='guest-basin'){
  const overflow=new THREE.CylinderGeometry(.007,.007,.004,20);overflow.rotateX(Math.PI/2);overflow.translate(0,top-.036,innerZ-innerD/2+.008);add(overflow,metal,'basin-overflow');
 }
 return group;
}

export function createSkyToilet(resources,f){
 const group=createCeramicBowl(resources,{productId:'toilet',w:f.w,d:f.d,top:.424,depth:.205,innerW:f.w-.105,innerD:f.d-.15,innerZ:.035,radius:.135,innerRadius:.10,lowerScale:.73,drainZ:.035});
 const seatMaterial=new THREE.MeshPhysicalMaterial({color:'#f8f7f2',roughness:.16,clearcoat:.65,clearcoatRoughness:.12,side:THREE.DoubleSide}),gapMaterial=new THREE.MeshStandardMaterial({color:'#5c635f',roughness:.7});resources.push(seatMaterial,gapMaterial);
 for(const [y,thickness,material,part] of [[.434,.007,gapMaterial,'sky-seat-gap'],[.451,.015,seatMaterial,'sky-slim-lid']]){
  const shape=roundedRect(new THREE.Shape(),f.w-.014,f.d-.008,.13),g=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.002,bevelThickness:.001,curveSegments:14});g.rotateX(Math.PI/2);g.translate(0,y,0);resources.push(g);const mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={productId:'toilet',part,cataloguePage:26,depth:.52};group.add(mesh);
 }
 return group;
}
