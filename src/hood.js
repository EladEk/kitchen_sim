import {lightColour} from './lighting-controls.mjs';
import * as THREE from 'three';
import {HOOD} from './appliances.mjs';
const M=.001;

// BOXIN LX/IX/A/90, Elica drawing 4625, pages 3–4. The origin is the
// lowest frame plane, centred in width, with z=0 at the rear. Dimensions
// and offsets come from the drawing; small undimensioned details follow
// Elica's 90 cm product photo rather than being asserted as CAD tolerances.
export function createBoxinHood({box,cylinder,part,mat,resources,settings,steel,black}){
 const root=new THREE.Group();part(root,'hood-appliance');root.userData.model='BOXIN LX/IX/A/90';
 const frame=new THREE.Group();part(frame,'hood-base');root.add(frame);
 const w=HOOD.width,d=HOOD.depth,t=1.2,edge=HOOD.frameEdge,band=HOOD.frontBandDepth;
 const stainless=mat('#b8bdbb',{metalness:.72,roughness:.34});
 const inset=mat('#2b302e',{roughness:.78}),darkMetal=mat('#7e8783',{metalness:.65,roughness:.5});
 const add=(x,y,z,ww,hh,dd,material=stainless,parent=frame,kind=null)=>{
  const mesh=box(x,y,z,ww,hh,dd,material,HOOD.cabinetId,parent);if(kind)part(mesh,kind);return mesh;
 };
 // 894 mm external frame, 862 mm mounting pan. The 25 mm exposed lower
 // skirt is below the cabinet; the 35 mm upper pan fits between its sides.
 add(0,t/2,edge/2,w,t,edge);
 const lampZ=d-band/2;
 const frontShape=new THREE.Shape();frontShape.moveTo(-w/2,d-band);frontShape.lineTo(w/2,d-band);frontShape.lineTo(w/2,d);frontShape.lineTo(-w/2,d);frontShape.closePath();
 for(const [x,r] of [[-w*.3,25],[0,17],[w*.3,25]]){const hole=new THREE.Path();hole.absarc(x,lampZ,r,0,Math.PI*2,true);frontShape.holes.push(hole);}
 const faceGeo=new THREE.ExtrudeGeometry(frontShape,{depth:t,bevelEnabled:false,curveSegments:32});faceGeo.rotateX(Math.PI/2);faceGeo.translate(0,t,0);faceGeo.scale(M,M,M);resources.push(faceGeo);
 const fascia=new THREE.Mesh(faceGeo,stainless);fascia.userData.id=HOOD.cabinetId;part(fascia,'hood-front-fascia');frame.add(fascia);
 for(const x of [-w/2+edge/2,w/2-edge/2])add(x,t/2,(edge+d-band)/2,edge,t,d-band-edge);
 for(const x of [-w/2+t/2,w/2-t/2])add(x,HOOD.trimHeight/2,d/2,t,HOOD.trimHeight,d);
 for(const z of [t/2,d-t/2])add(0,HOOD.trimHeight/2,z,w,HOOD.trimHeight,t);
 const panY=HOOD.trimHeight+HOOD.panHeight/2;
 for(const x of [-HOOD.mountingWidth/2+t/2,HOOD.mountingWidth/2-t/2])add(x,panY,d/2,t,HOOD.panHeight,d);
 for(const z of [t/2,d-t/2])add(0,panY,z,HOOD.mountingWidth,HOOD.panHeight,t);
 add(0,HOOD.bodyHeight-t/2,d/2,HOOD.mountingWidth,t,d);
 // Folded seams and the ergonomic front visor in its stowed position.
 add(0,1.3,d-HOOD.frontLip,w-2*edge,1.2,1.5,darkMetal,frame,'hood-visor-seam');
 add(0,2,d-HOOD.frontLip/2,w-2*edge,1.2,HOOD.frontLip,stainless,frame,'hood-front-visor');
 for(const x of [-w/2+8,w/2-8])add(x,8,d/2,1,14,d-8,steel,frame,'hood-side-protection');

 // Two separate, framed aluminium grease-filter cassettes, as on the
 // 90 cm product. Diamond mesh has open alpha holes and a second weave.
 const filterDepth=d-band-edge,divider=10,filterWidth=(w-2*edge-divider)/2;
 add(0,t/2,edge+filterDepth/2,divider,t,filterDepth,stainless);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,64,64);ctx.strokeStyle='#ffffff';ctx.lineWidth=2.2;
 for(let q=-64;q<=128;q+=16){ctx.beginPath();ctx.moveTo(q,0);ctx.lineTo(q+64,64);ctx.moveTo(q,0);ctx.lineTo(q-64,64);ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(filterWidth/24,filterDepth/24);texture.anisotropy=4;resources.push(texture);
 const meshMaterial=mat('#bcc3bf',{map:texture,alphaTest:.32,side:THREE.DoubleSide,metalness:.68,roughness:.5});
 for(const [i,cx] of [-1,1].map((sign,i)=>[i,sign*(divider/2+filterWidth/2)])){
  const filter=new THREE.Group();part(filter,'hood-filter');filter.userData.filterIndex=i;root.add(filter);
  add(cx,7,edge+filterDepth/2,filterWidth-3,3,filterDepth-3,inset,filter);
  const rail=4;
  for(const x of [cx-filterWidth/2+rail/2,cx+filterWidth/2-rail/2])add(x,1.5,edge+filterDepth/2,rail,3,filterDepth,stainless,filter);
  for(const z of [edge+rail/2,edge+filterDepth-rail/2])add(cx,1.5,z,filterWidth,3,rail,stainless,filter);
  const geometry=new THREE.PlaneGeometry((filterWidth-8)*M,(filterDepth-8)*M);resources.push(geometry);
  for(const [yy,xx] of [[.7,0],[1.9,.8]]){
   const weave=new THREE.Mesh(geometry,meshMaterial);weave.rotation.x=Math.PI/2;weave.position.set((cx+xx)*M,yy*M,(edge+filterDepth/2)*M);weave.userData.id=HOOD.cabinetId;part(weave,'hood-filter-mesh');filter.add(weave);
  }
  // Recessed spring-release handle and its small metal pull, one per filter.
  const latchZ=d-band-15;
  const latch=new THREE.Group();part(latch,'hood-filter-latch');filter.add(latch);
  for(const x of [cx-21.75,cx+21.75])add(x,1.1,latchZ,8.5,2.2,27,stainless,latch);
  add(cx,1.1,latchZ-9,35,2.2,9,stainless,latch);add(cx,1.1,latchZ+10,35,2.2,7,stainless,latch);
  add(cx,.8,latchZ+1,35,.6,11,black,latch);
  add(cx,.6,latchZ+5,31,1.2,3,steel,latch);
 }
 // Round recessed LEDs with metal bezels, placed in the front 77.6 mm strip.
 const enabled=settings.led&&settings.lampsOn!==false,light=mat(enabled?lightColour(4000):'#d7d9d3',{emissive:lightColour(4000),emissiveIntensity:enabled?settings.intensity/100*2.1:0,roughness:.35});
 for(const x of [-w*.3,w*.3]){
  const bezel=new THREE.Group();part(bezel,'hood-led-bezel');root.add(bezel);
  const rimGeo=new THREE.RingGeometry(.0205,.025,48);rimGeo.rotateX(Math.PI/2);resources.push(rimGeo);const rim=new THREE.Mesh(rimGeo,steel);rim.position.set(x*M,0,lampZ*M);bezel.add(rim);
  const sideGeo=new THREE.CylinderGeometry(.025,.025,.0036,48,1,true);resources.push(sideGeo);const side=new THREE.Mesh(sideGeo,steel);side.position.set(x*M,.0018,lampZ*M);bezel.add(side);
  const led=cylinder(x,.65,lampZ,20.5,1.3,light,root);part(led,'hood-led');led.userData.id=HOOD.cabinetId;
 }
 const control=cylinder(0,2.4,lampZ,17,3.6,darkMetal,root);part(control,'hood-control');control.userData.id=HOOD.cabinetId;
 cylinder(0,1.2,lampZ,13.8,1.6,stainless,root);
 add(-4,.25,lampZ+4,1.1,.5,10,black,root,'hood-control-pointer');
 // Tiny detents around the rotary selector; unlabelled so no invented controls.
 for(let i=0;i<7;i++){const a=(-150+i*50)*Math.PI/180;add(Math.sin(a)*21,.2,lampZ+Math.cos(a)*21,1.3,.4,1.3,darkMetal,root);}

 // The motor is 305 mm wide, NOT the 862 mm pan. The outlet is offset
 // 102.7 mm from the rear, rather than centred in the depth of the motor.
 const motor=new THREE.Group();part(motor,'hood-motor');root.add(motor);
 const my=HOOD.bodyHeight+HOOD.motorHeight/2,mz=HOOD.motorRearOffset+HOOD.motorDepth/2;
 for(const x of [-HOOD.motorWidth/2+t/2,HOOD.motorWidth/2-t/2])add(x,my,mz,t,HOOD.motorHeight,HOOD.motorDepth,stainless,motor);
 add(0,my,HOOD.motorRearOffset+t/2,HOOD.motorWidth,HOOD.motorHeight,t,stainless,motor);
 add(0,my,HOOD.motorRearOffset+HOOD.motorDepth-t/2-.5,HOOD.motorWidth,HOOD.motorHeight,t,stainless,motor);
 const roofShape=new THREE.Shape(),a=-HOOD.motorWidth/2,b=HOOD.motorWidth/2,z0=HOOD.motorRearOffset,z1=z0+HOOD.motorDepth;
 roofShape.moveTo(a,z0);roofShape.lineTo(b,z0);roofShape.lineTo(b,z1);roofShape.lineTo(a,z1);roofShape.closePath();
 const outletHole=new THREE.Path();outletHole.absarc(0,HOOD.ductRearOffset,HOOD.ductDiameter/2,0,Math.PI*2,true);roofShape.holes.push(outletHole);
 const roofGeo=new THREE.ExtrudeGeometry(roofShape,{depth:t,bevelEnabled:false,curveSegments:32});roofGeo.rotateX(Math.PI/2);roofGeo.translate(0,HOOD.height,0);roofGeo.scale(M,M,M);resources.push(roofGeo);
 const roof=new THREE.Mesh(roofGeo,stainless);part(roof,'hood-motor-roof');roof.userData.id=HOOD.cabinetId;motor.add(roof);
 // Flush folded front cover, side seams and screw heads, all within the envelope.
 add(0,my,mz+HOOD.motorDepth/2-.4,HOOD.motorWidth-7,HOOD.motorHeight-7,.8,steel,motor);
 for(const x of [-HOOD.motorWidth/2+4,HOOD.motorWidth/2-4])add(x,my,mz+HOOD.motorDepth/2-.9,1.2,HOOD.motorHeight-8,.8,darkMetal,motor);
 for(const x of [-HOOD.motorWidth/2+9,HOOD.motorWidth/2-9])for(const y of [HOOD.bodyHeight+10,HOOD.height-10]){
  const screw=cylinder(x,y,mz+HOOD.motorDepth/2-.8,1.7,1.2,steel,motor);screw.rotation.x=Math.PI/2;part(screw,'hood-cover-screw');
 }
 const badgeCanvas=document.createElement('canvas');badgeCanvas.width=256;badgeCanvas.height=88;const bg=badgeCanvas.getContext('2d');bg.fillStyle='#d7dcda';bg.fillRect(0,0,256,88);bg.fillStyle='#343a36';bg.font='bold 64px Arial';bg.textAlign='center';bg.fillText('elica',128,65);
 const badgeTexture=new THREE.CanvasTexture(badgeCanvas);badgeTexture.colorSpace=THREE.SRGBColorSpace;resources.push(badgeTexture);
 const badge=add(0,my-55,mz+HOOD.motorDepth/2-.3,32,11,.6,mat('#ffffff',{map:badgeTexture,roughness:.5,metalness:.2}),motor,'hood-maker-badge');
 badge.userData.brand='elica';
 // Top outlet collar, with a genuine open bore rather than a solid cylinder.
 const collarGeo=new THREE.CylinderGeometry(HOOD.ductDiameter*M/2,HOOD.ductDiameter*M/2,HOOD.collarHeight*M,64,1,true);resources.push(collarGeo);
 const collar=new THREE.Mesh(collarGeo,mat('#a4aaa6',{metalness:.6,roughness:.42,side:THREE.DoubleSide}));
 collar.position.set(0,(HOOD.height+HOOD.collarHeight/2)*M,HOOD.ductRearOffset*M);part(collar,'hood-outlet');collar.userData.id=HOOD.cabinetId;root.add(collar);
 return root;
}
