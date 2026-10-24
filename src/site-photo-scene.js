import * as THREE from 'three';
import {ENTRY_GARDENS,BURIED_BINS as B,RESERVOIR as R} from './site-photo-layout.mjs';
export function buildPhotoSite({group,resources,picks,cut=false,ceilingVisible=true,settings={}}){
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});resources.push(m);return m;};
 const stone=material('#ddd7ca'),soil=material('#a18a6e',{side:THREE.DoubleSide}),leaf=material('#60764a'),metal=material('#929995',{metalness:.72,roughness:.36}),dark=material('#303b3c'),concrete=material('#c1c0b9');
 const cube=new THREE.BoxGeometry(1,1,1),shrub=new THREE.IcosahedronGeometry(1,1);resources.push(cube,shrub);
 function box(part,x,y,z,w,h,d,m,id=null){const o=new THREE.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;o.name=part;o.userData={part,source:'building-plan-and-oct24-photos',dimensionsInferred:true,buildingFloor:0,...(id?{action:'building',buildingId:id}:{})};group.add(o);if(id)picks.push(o);return o;}
 function edge(a,b,y,h,d,m,part){const dx=b[0]-a[0],dz=b[1]-a[1],o=box(part,(a[0]+b[0])/2,y,(a[1]+b[1])/2,Math.hypot(dx,dz),h,d,m);o.rotation.y=-Math.atan2(dz,dx);}
 for(const bed of ENTRY_GARDENS){
  const shape=new THREE.Shape();bed.polygon.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=new THREE.ShapeGeometry(shape);geo.rotateX(Math.PI/2);resources.push(geo);const floor=new THREE.Mesh(geo,soil);floor.position.y=.025;floor.receiveShadow=true;floor.userData={part:'entry-garden-soil',buildingFloor:0};group.add(floor);
  bed.polygon.forEach((a,i)=>edge(a,bed.polygon[(i+1)%bed.polygon.length],.10,.20,.12,stone,'entry-garden-curb'));
  const xs=bed.polygon.map(p=>p[0]),zs=bed.polygon.map(p=>p[1]),lo=Math.min(...xs),hi=Math.max(...xs),z=(Math.min(...zs)+Math.max(...zs))/2;
  for(let x=lo+.5;x<hi-.25;x+=.70){const o=new THREE.Mesh(shrub,leaf);o.position.set(x,.27,z+.16*Math.sin(x*3));o.scale.set(.36,.30,.37);o.castShadow=o.receiveShadow=true;o.userData={part:'entry-garden-shrub',illustrative:true,buildingFloor:0};group.add(o);}
 }
 // Pair of stainless intake towers on individual flush underground-bin plates.
 box('buried-bin-pad',B.position[0],.025,B.position[1],B.width,.07,B.depth,concrete,B.id);
 for(const [x,z] of B.centres){
  box('buried-bin-access-plate',x,.075,z,1.38,.035,1.65,metal,B.id);
  box('buried-bin-intake',x,.64,z,B.bodyWidth,1.14,B.bodyDepth,metal,B.id);
  const hood=box('buried-bin-sloped-hood',x,1.24,z,.98,.11,.99,dark,B.id);hood.rotation.x=-.18;
  box('buried-bin-mouth',x,.99,z+.438,.63,.30,.025,dark,B.id);
  const flap=box('buried-bin-flap',x,1.04,z+.465,.64,.17,.024,metal,B.id);flap.rotation.x=-.18;
  box('buried-bin-handle',x,1.04,z+.50,.28,.025,.04,dark,B.id);
 }
 // The source labels a reservoir beside the pump room, not an open room floor.
 const cx=(R.minX+R.maxX)/2,cz=(R.minZ+R.maxZ)/2,w=R.maxX-R.minX,d=R.maxZ-R.minZ,h=cut?.8:R.height;
 for(const x of [R.minX+R.wall/2,R.maxX-R.wall/2])box('reservoir-shell',x,h/2,cz,R.wall,h,d,concrete,R.id);
 for(const z of [R.minZ+R.wall/2,R.maxZ-R.wall/2])box('reservoir-shell',cx,h/2,z,w,h,R.wall,concrete,R.id);
 box('reservoir-base',cx,.10,cz,w,.18,d,concrete,R.id);
 if(!cut&&ceilingVisible)box('reservoir-cap',cx,R.height-.06,cz,w,.12,d,concrete,R.id);
 // Small service opening indicated on the pump-facing wall; profile estimated.
 if(!cut){box('reservoir-service-hatch',14.94,1.15,R.maxZ+.012,.85,.70,.025,metal,R.id);box('reservoir-hatch-handle',15.20,1.15,R.maxZ+.039,.025,.13,.04,dark,R.id);}
 // Photographed entrance porch: two round downlights, wall sconces,
 // dark intercom and mail bank. Locations/heights are registered estimates.
 if(!cut){const on=settings.lampsOn!==false,glow=material('#f2f0e7',{emissive:'#fff1d8',emissiveIntensity:on?.8:0});
  const disk=new THREE.CylinderGeometry(.09,.09,.025,20);resources.push(disk);
  for(const z of [-4.72,-3.12]){const o=new THREE.Mesh(disk,glow);o.position.set(22.68,2.68,z);o.userData={part:'entry-porch-round-light',buildingFloor:0};group.add(o);}
  for(const z of [-5.60,-2.22])box('entry-wall-sconce',23.76,2.25,z,.13,.11,.40,glow);
  box('entry-intercom',22.0,1.4,-5.53,.035,.34,.19,dark);
  box('entry-mail-bank',22.85,1.3,-5.54,1.05,.95,.12,dark);
  for(let x=22.43;x<23.3;x+=.21)for(let y=.94;y<1.75;y+=.16)box('entry-mail-slot',x,y,-5.466,.17,.012,.008,metal);
 }
 // Dark frame/top-light over the exterior main entry as in the lobby video.
 if(!cut){for(let y=2.34;y<2.64;y+=.065)box('entry-transom-louver',21.65,y,-4.32,.08,.028,1.22,dark);}
}
