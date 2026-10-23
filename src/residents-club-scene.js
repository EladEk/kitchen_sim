import * as THREE from 'three';
import {RESIDENTS_CLUB as C} from './residents-club.mjs';
import {lightColour} from './lighting-controls.mjs';

export function buildResidentsClub({parent,resources,settings,cut=false,ceilingVisible=false}){
 const root=new THREE.Group();root.name='residents-club';root.userData={part:'residents-club',source:'residents-club-video',planPage:3,dimensionsInferred:true};parent.add(root);
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});resources.push(m);return m;};
 const white=material('#f2f0e9'),trim=material('#c9c3b6'),dark=material('#333b3d'),steel=material('#929995',{metalness:.55,roughness:.38}),floor=material('#c9c3b6',{roughness:.66}),grout=material('#b6b1a7');
 const cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);
 function box(name,x,y,z,w,h,d,mat=white){const m=new THREE.Mesh(cube,mat);m.name=name;m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;m.userData={part:name,source:'residents-club-video',dimensionsInferred:true};root.add(m);return m;}
 function disk(name,x,y,z,r,h,mat){const g=new THREE.CylinderGeometry(r,r,h,24);resources.push(g);const m=new THREE.Mesh(g,mat);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.userData={part:name,source:'residents-club-video',dimensionsInferred:true};root.add(m);return m;}
 // Thin finish layer on the exact room polygon, never over the lobby/doorway.
 const shape=new THREE.Shape();C.polygon.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
 const fg=new THREE.ShapeGeometry(shape);fg.rotateX(Math.PI/2);resources.push(fg);floor.side=THREE.DoubleSide;const fm=new THREE.Mesh(fg,floor);fm.position.y=.012;fm.name='club-floor';fm.receiveShadow=true;root.add(fm);
 // Neutral matt tiles: product and module are not established in this video.
 for(let x=.6;x<5.75;x+=.6)box('club-floor-joint',x,.014,-6.324,.0015,.001,6.649,grout);
 for(let z=-9.049;z<-3;z+=.6)box('club-floor-joint',2.875,.014,z,5.75,.001,.0015,grout);
 const h=cut?.85:C.ceiling;
 // Interior plaster on the three stone exterior faces; native walls own structure.
 box('club-interior-plaster',2.925,h/2,-9.641,5.85,h,.014);
 box('club-interior-plaster',2.875,h/2,-3.008,5.75,h,.014);
 for(const [a,b] of [[-9.649,-9.199],[-6.4,-4.4992],[-3.2998,-3]])box('club-interior-plaster',.008,h/2,(a+b)/2,.014,h,b-a);
 for(const [a,b] of [[-9.199,-6.4],[-4.4992,-3.2998]]){
  box('club-window-inner-sill-wall',.008,Math.min(1,h)/2,(a+b)/2,.014,Math.min(1,h),b-a);
  if(h>2.3)box('club-window-inner-head',.008,(h+2.3)/2,(a+b)/2,.014,h-2.3,b-a);
  if(!cut){
   box('club-window-inner-reveal',-.07,1.65,a+.008,.16,1.3,.016);box('club-window-inner-reveal',-.07,1.65,b-.008,.16,1.3,.016);
   box('club-window-sill',-.07,.98,(a+b)/2,.33,.035,b-a+.04,trim);
  }
 }
 box('club-skirting',2.875,.05,-3.024,5.75,.08,.022,trim);box('club-skirting',2.925,.05,-9.624,5.85,.08,.022,trim);box('club-skirting',.026,.05,-6.324,.022,.08,6.649,trim);
 if(cut)return root;
 // Rolled shutter visible above the wide window; both window spans stay closed.
 for(let y=2.08;y<2.30;y+=.044)box('club-window-shutter',-.14,y,-7.7995,.045,.038,2.72,dark);
 // White split indoor unit. Exact manufacturer and wall offset are unconfirmed.
 box('club-ac-body',2.65,2.39,-9.45,1.08,.32,.30);
 box('club-ac-outlet',2.65,2.28,-9.292,.97,.065,.018,dark);
 for(let y=2.263;y<2.31;y+=.017)box('club-ac-vane',2.65,y,-9.278,.94,.008,.017,steel);
 box('club-ac-cover-seam',2.65,2.40,-9.294,1,.006,.008,trim);
 box('club-ac-trunk',3.21,2.02,-9.60,.035,.62,.035);
 // Recess next to the small window: photographed white access door and grey riser.
 const c=C.cabinet,z=(c.minZ+c.maxZ)/2;
 box('club-service-back',.035,1.20,z,.035,2.4,.90,dark);
 box('club-service-jamb',.20,1.20,c.minZ,.31,2.4,.035);
 box('club-service-jamb',.20,1.20,c.maxZ,.31,2.4,.035);
 box('club-service-head',.20,2.39,z,.31,.035,.94);
 disk('club-service-riser',.16,1.16,z,.055,2.30,steel);
 for(const y of [.35,1.1,1.9])disk('club-service-pipe-collar',.16,y,z,.065,.04,steel);
 const door=box('club-service-access-door',.46,1.19,z+.22,.035,2.34,.46);door.rotation.y=-.35;
 // Round luminaires observed in the pan. Layout/diameter/ceiling height estimated.
 const on=settings.lampsOn!==false,colour=lightColour(4000),diffuser=material('#fffaf0',{emissive:colour,emissiveIntensity:on?1.2:0});
 for(const [i,[x,z]] of C.lamps.entries()){
  disk('club-ceiling-light-rim',x,C.ceiling-.035,z,.14,.035,white);
  disk('club-ceiling-light-diffuser',x,C.ceiling-.06,z,.123,.015,diffuser);
  if(on){const light=new THREE.SpotLight(colour,22,8,Math.PI*.44,.55,2);light.position.set(x,C.ceiling-.09,z);light.target.position.set(x,.1,z);light.userData={fixtureLight:true,kelvin:4000,source:'residents-club-video',positionInferred:true};light.castShadow=i<2;light.shadow.mapSize.set(256,256);light.shadow.camera.near=.05;light.shadow.bias=-.0002;light.shadow.normalBias=.01;resources.push({dispose:()=>light.shadow.dispose()});root.add(light,light.target);}
 }
 // The selected room overview leaves its ceiling open; walk/full-building close it.
 if(ceilingVisible){const cg=fg.clone();resources.push(cg);const cm=white.clone();cm.side=THREE.DoubleSide;resources.push(cm);const ceiling=new THREE.Mesh(cg,cm);ceiling.position.y=C.ceiling;ceiling.name='club-ceiling';ceiling.castShadow=ceiling.receiveShadow=true;root.add(ceiling);}
 return root;
}
