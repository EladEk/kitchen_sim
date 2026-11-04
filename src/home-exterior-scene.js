import * as THREE from 'three';
import {installStoneCourses} from './building-finish-shaders.mjs';
import {EXTERIOR_LAYOUT as E,HOUSE,WALLS,DOORS,WINDOWS} from './home-model.mjs';

export function buildExteriorDetails({group,box,cylinder,floor,lines,mat,surface=(kind,color,options)=>mat(color,options),resources,settings,mode}){
 const groups=new Map(),full=mode==='walk'||!settings.cutaway,h=full?HOUSE.height:.86;
 const stone=surface('limestone','#d4cbb9'),joint=mat('#b5ac99'),metal=mat('#68716c',{metalness:.45}),dark=mat('#414a46'),body=mat('#e0e1d5');
 installStoneCourses(stone);
 const node=(id,view)=>{const p=new THREE.Group();p.userData={buildingId:id,source:'exterior-details',dimensionsInferred:true,inspectionView:view};group.add(p);groups.set(id,p);return p;};
 const P=E.porch,C=E.court,pc=(P.minX+P.maxX)/2,cc=(C.minX+C.maxX)/2;
 const porch=node(P.id,{from:[pc,HOUSE.eyeHeight,P.maxZ+1.8],target:[pc,1.2,P.minZ]}),court=node(C.id,{from:[cc,HOUSE.eyeHeight,C.maxZ+1.1],target:[cc,1.6,C.minZ]});
 const tag=id=>({action:'building',buildingId:id}),porchTag=tag(P.id),courtTag=tag(C.id);
 floor(P.polygon,surface('terrace','#857058'),.012,porch,{...porchTag,part:'observed-porch-paving'});
 const tiles=[];for(let x=P.minX+.15;x<P.maxX;x+=.15)tiles.push([x,.014,P.minZ],[x,.014,P.maxZ]);for(let z=P.minZ+.6;z<P.maxZ;z+=.6)tiles.push([P.minX,.014,z],[P.maxX,.014,z]);lines(tiles,'#b5a089',.48,porch);
 floor(C.polygon,surface('soil','#aa9271'),.003,court,{...courtTag,part:'open-kitchen-court-ground'});
 // Overlay only solid parts of existing walls: never fill a window or door.
 function clad(wallId,side,parent,id){
  const w=WALLS.find(w=>w.id===wallId),v=Math.abs(w.a[0]-w.b[0])<.001,lo=w.a[v?1:0],hi=w.b[v?1:0],normal=w.a[v?0:1]+side*(w.thickness/2+.007),holes=[...DOORS.filter(d=>!d.hostDoorId),...WINDOWS].filter(o=>o.wallId===wallId).sort((a,b)=>a.start-b.start);
  function panel(a,b,bottom,top){if(b-a<.001||top-bottom<.001)return;const data={...tag(id),part:'exterior-stone-cladding',wallId,span:[a,b,bottom,top]};
   v?box(normal,(top+bottom)/2,(a+b)/2,.014,top-bottom,b-a,stone,parent,data):box((a+b)/2,(top+bottom)/2,normal,b-a,top-bottom,.014,stone,parent,data);
  }
  let at=lo;for(const o of holes){panel(at,o.start,0,h);panel(o.start,o.end,0,Math.min(o.sill,h));panel(o.start,o.end,o.sill+o.height,h);at=o.end;}panel(at,hi,0,h);
 }
 clad('utility-south',1,porch,P.id);clad('service-porch-return',-1,porch,P.id);clad('wet-east',1,porch,P.id);
 clad('service-porch-return',1,court,C.id);clad('utility-east',1,court,C.id);clad('kitchen-south',1,court,C.id);
 box(E.returnWall.worldX,h/2,P.maxZ+.007,.2,h,.014,stone,porch,{...porchTag,part:'return-wall-end'});
 // Jambs and sill emphasize a frame set within a substantial stone wall.
 if(full)for(const id of ['kitchen-window','utility-window']){
  const o=WINDOWS.find(o=>o.id===id),w=WALLS.find(w=>w.id===o.wallId),v=o.vertical,depth=w.thickness/2+.035,y=o.sill+o.height/2,normal=w.a[v?0:1]+depth/2;
  for(const q of [o.start+.008,o.end-.008])v?box(normal,y,q,depth,o.height,.015,stone,court,{...courtTag,part:'stone-window-jamb',openingId:id}):box(q,y,normal,.015,o.height,depth,stone,court,{...courtTag,part:'stone-window-jamb',openingId:id});
  for(const yy of [o.sill-.014,o.sill+o.height+.014])v?box(normal,yy,(o.start+o.end)/2,depth,.025,o.width+.06,stone,court,courtTag):box((o.start+o.end)/2,yy,normal,o.width+.06,.025,depth,stone,court,courtTag);
 }
 if(full){
  box(pc,P.ceiling+P.slab/2,(P.minZ+P.maxZ)/2,P.width+.22,P.slab,P.depth+.1,stone,porch,{...porchTag,part:'service-porch-ceiling',heightInferred:true});
  const pipe=cylinder(P.minX+.11,P.ceiling/2,P.maxZ-.12,.055,P.ceiling,metal,porch,{...porchTag,part:'observed-downpipe'});
  for(const y of [.3,1.5,2.35])box(pipe.position.x,y,pipe.position.z-.045,.14,.035,.12,metal,porch,porchTag);
 }
 for(const a of E.units){
  const p=node(a.id,{from:[a.body.maxX+1,HOUSE.eyeHeight,a.z+.1],target:[a.x,a.bottom+a.h*.5,a.z]}),data=tag(a.id),y=a.bottom+a.h/2;
  box(a.x,y,a.z,a.d,a.h,a.w,body,p,{...data,part:'ac-body',acId:a.id},.012);
  // Separate rear coil, wall brackets and front fan / concentric guard rings.
  box(a.body.minX-.006,y,a.z,.012,a.h-.07,a.w-.06,dark,p,data);
  for(let z=a.z-a.w/2+.05;z<a.z+a.w/2-.03;z+=.055)box(a.body.minX-.014,y,z,.014,a.h-.08,.012,metal,p,data);
  for(const z of [a.z-a.w*.31,a.z+a.w*.31]){
   box(a.x-.04,a.bottom-.035,z,a.d+.12,.045,.045,metal,p,{...data,part:'ac-bracket'});
   box(a.body.minX-a.wallGap+.02,a.bottom+.13,z,.04,.36,.045,metal,p,data);
  }
  const r=Math.min(a.w*.36,a.h*.36),frontX=a.x+a.d/2+.018,fanY=a.bottom+a.h*.54;
  const disk=cylinder(frontX,fanY,a.z,r,.014,dark,p,{...data,part:'ac-fan'});disk.rotation.z=Math.PI/2;
  for(let i=1;i<=6;i++){const geo=new THREE.TorusGeometry(r*i/6,.003,5,40);resources.push(geo);const ring=new THREE.Mesh(geo,metal);ring.rotation.y=Math.PI/2;ring.position.set(frontX+.012,fanY,a.z);p.add(ring);}
  cylinder(frontX+.023,fanY,a.z,.036,.025,metal,p,data).rotation.z=Math.PI/2;
  const spokes=[];for(let i=0;i<12;i++){const t=i*Math.PI/6;spokes.push([frontX+.015,fanY,a.z],[frontX+.015,fanY+Math.cos(t)*r,a.z+Math.sin(t)*r]);}lines(spokes,'#9ba49b',.9,p);
  for(const yy of [a.bottom+.09,a.bottom+a.h-.09])box(a.body.minX+.04,yy,a.z-a.w/2-.004,.12,.012,.012,joint,p,data);
  const reserve=floor(a.front.polygon,mat('#bb9651',{transparent:true,opacity:.1,depthWrite:false}),.004,p,{...data,part:'ac-front-planning-reserve'});reserve.userData.manufacturerVerified=false;
  const pts=a.front.polygon.flatMap((q,i)=>{const b=a.front.polygon[(i+1)%4];return [[q[0],.018,q[1]],[b[0],.018,b[1]]];});lines(pts,'#ae8b4a',.55,p);
 }
 return groups;
}
