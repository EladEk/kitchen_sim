import {installStoneCourses,installFloorCourses} from './building-finish-shaders.mjs';
import {serviceSlabHoles} from './service-access.mjs';
import {buildApartmentFurniture} from './apartment-furniture-scene.js';
import {createSurfacePalette} from './surface-materials.mjs';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';
import {laundryScreens} from './laundry-screens.mjs';
import {buildCommonSpaces} from './common-spaces-scene.js';
import {clubWindowProfile} from './residents-club.mjs';
import {buildResidentsClub} from './residents-club-scene.js';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS,BUILDING_ROOF,BUILDING_SITE,BUILDING_CENTER,normalizeBuildingLevel} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {onDetailedGround,segmentDistance,parseDestination,isDoorOpening,gardenFenceEdge} from './building-navigation.mjs';
import {connectedWallRuns,doorWallOpening,exposedBalconySegments,commonStairRails,duplexFlightRails,duplexLandingGuards} from './building-geometry.mjs';
import {duplexOnFloor,duplexStair,duplexStairOpening} from './building-duplexes.mjs';
import {COMMON_ENTRY_DOORS} from './building-site.mjs';
import {buildElevators} from './building-elevators.js';
import {buildingNumberPlate} from './building-signage.js';
import {buildGroundApartments} from './ground-apartments-scene.js';
import {buildSiteContext} from './building-site-scene.js';
import {wrapPublicDoor} from './public-door-motion.mjs';

// Shared instanced cubes keep nine storeys affordable on phones. Physical
// shadow geometry remains present while the apartment is viewed as a cutaway;
// its invisible materials do not write depth or cover apartment controls.
export function buildBuildingContext({group,resources,settings,mode='overview',picks=[],kitchenAnchor=null,apartmentOutline=null,interactiveDoors=false}){
 const walking=mode==='walk',unitView=mode==='unit',shown=mode==='building'||walking||unitView,selected=parseDestination(settings.tourDestination),limit=walking?9:unitView?selected.floor:shown?normalizeBuildingLevel(settings.buildingLevel):9;
 if(!shown&&settings.buildingShadows===false)return {group:null,floors:new Map(),shadowOnly:true};
 const root=new THREE.Group();root.name='building-4102';root.userData={part:'whole-building',building:4102,source:'building-plan',shadowOnly:!shown};group.add(root);
 if(kitchenAnchor){root.position.set(kitchenAnchor[0],0,kitchenAnchor[1]);root.rotation.y=Math.PI;}
 const floors=new Map(),cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);
 function material(color,extra={}){const m=shown?new THREE.MeshStandardMaterial({color,roughness:.8,...extra}):new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,opacity:0});resources.push(m);return m;}
 const surface=shown?createSurfacePalette(resources):null,finish=(kind,color,extra={})=>shown?surface(kind,color,extra):material(color,extra);
 const limestone=finish('limestone','#e2ddd3',{roughness:.83}),concrete=finish('cement','#d5d2ca'),deck=finish('porcelain','#d8d2c5'),metal=material('#303b3e',{roughness:.42,metalness:.45}),glass=shown?new THREE.MeshPhysicalMaterial({color:'#d2e1df',roughness:.075,metalness:0,ior:1.5,specularIntensity:1,envMapIntensity:1.15,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}):material('#d2e1df'),voidMat=material('#485052',{roughness:.4}),roofMat=finish('cement','#ddd9cc'),insideWall=finish('plaster','#f1efe9',{roughness:.9}),doorMat=finish('door','#d8d0c3',{roughness:.55}),interiorFloor=finish('porcelain','#dcd7ce',{roughness:.56}),soffit=finish('plaster','#f4f2eb',{roughness:.91}),fascia=finish('paint','#606665',{roughness:.72}),trimMat=finish('paint','#eeece5',{roughness:.62}),handleMat=material('#a9afad',{metalness:.8,roughness:.27});
 if(shown){
  // Metre-scale stone courses, restrained grain and staggered vertical joints.
  // Colours/profile follow the supplied facade photos; this is no scan claim.
  resources.push(glass);installStoneCourses(limestone);installFloorCourses(interiorFloor);
  limestone.userData.publicFinish="stone";interiorFloor.userData.publicFinish="floor";
  interiorFloor.userData={...interiorFloor.userData,finishInferred:true,tile:[.8,.8],productId:null};
  for(const mat of [limestone,concrete,deck,roofMat,insideWall,doorMat,interiorFloor,soffit,fascia,trimMat])installBuildingSurfaceUVs(mat);

 }
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 const entranceFinish=finish('door','#536c66',{roughness:.5}),corridorFinish=finish('plaster','#cddbd2',{roughness:.94});if(shown)for(const mat of [entranceFinish,corridorFinish])installBuildingSurfaceUVs(mat);
 function batch(parent,mat,items,part,level,cast=true){
  if(!items.length)return;const mesh=new THREE.InstancedMesh(cube,mat,items.length);mesh.name=part;mesh.userData={part,buildingFloor:level,source:'building-plan',heightInferred:true,...(shown&&level!==null?{action:'building-floor'}:{})};
  items.forEach(([x,y,z,w,h,d,angle=0],i)=>{rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle);position.set(x,y,z);scale.set(Math.max(.001,w),Math.max(.001,h),Math.max(.001,d));matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);});
  mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();resources.push(mesh);parent.add(mesh);if(mesh.userData.action)picks.push(mesh);return mesh;
 }
 function slab(poly,y,thickness,mat,parent,part,level,holes=[]){
  if(poly.length<3)return;const s=new THREE.Shape();poly.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();for(const poly of holes){const hole=new THREE.Path();poly.forEach(([x,z],i)=>i?hole.lineTo(x,z):hole.moveTo(x,z));hole.closePath();s.holes.push(hole);}const geo=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false});geo.rotateX(Math.PI/2);resources.push(geo);const mesh=new THREE.Mesh(geo,mat);mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;mesh.userData={part,buildingFloor:level,source:'building-plan'};parent.add(mesh);return mesh;
 }
 function segment(a,b,y,h,thickness,into){const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.008||h<.008)return;into.push([(a[0]+b[0])/2,y+h/2,(a[1]+b[1])/2,length,h,thickness,-Math.atan2(dz,dx)]);}
 function closedWallLoop(poly,y,h,thickness,into){for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),u=b.map((n,k)=>(n-a[k])/len),overlap=thickness/2+.002;segment(a.map((n,k)=>n-u[k]*overlap),b.map((n,k)=>n+u[k]*overlap),y,h,thickness,into);}}
 function stairHandrails(paths,base,parent,level,part){
  const g=new THREE.CylinderGeometry(.018,.018,1,10),items=[];resources.push(g);
  for(const path of paths){const a=new THREE.Vector3(path.a[0],base+path.a[1]+.98,path.a[2]),b=new THREE.Vector3(path.b[0],base+path.b[1]+.98,path.b[2]);items.push([a,b]);const length=a.distanceTo(b),count=Math.max(1,Math.ceil(length/.65));for(let i=0;i<=count;i++){const top=a.clone().lerp(b,i/count);items.push([new THREE.Vector3(top.x,top.y-.98,top.z),top]);}items.push([a.clone().add(new THREE.Vector3(0,-.48,0)),b.clone().add(new THREE.Vector3(0,-.48,0))]);}
  const mesh=new THREE.InstancedMesh(g,metal,items.length),q=new THREE.Quaternion(),m=new THREE.Matrix4();items.forEach(([a,b],i)=>{const delta=b.clone().sub(a);q.setFromUnitVectors(THREE.Object3D.DEFAULT_UP,delta.clone().normalize());m.compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(1,delta.length(),1));mesh.setMatrixAt(i,m);});mesh.castShadow=mesh.receiveShadow=true;mesh.userData={part,buildingFloor:level,dimensionsInferred:true,source:'building-plan'};mesh.computeBoundingSphere();resources.push(mesh);parent.add(mesh);
 }
 const nearApartment=(a,b)=>{const p=[(a[0]+b[0])/2,(a[1]+b[1])/2];return p[0]<11.98&&p[0]>-.7&&p[1]>-.35&&p[1]<16.05;};
 const onGroundReplica=p=>BUILDING_FLOORS[0].units.some(u=>u.number!==4&&(pointInPolygon(p,u.polygon)||u.polygon.some((a,i)=>segmentDistance(p,a,u.polygon[(i+1)%u.polygon.length])<.24)));
 for(const def of BUILDING_FLOORS){
  if(def.level>limit)continue;
  const node=new THREE.Group();node.name=def.id;node.userData={part:'building-storey',level:def.level,page:def.page,source:'building-plan'};root.add(node);floors.set(def.level,node);
  const cut=settings.cutaway===true&&shown&&!walking&&limit<9&&def.level===limit,base=def.elevation,h=cut?.85:BUILDING.storey,walls=[],frames=[],panes=[],dark=[],rails=[],decks=[],interiorWalls=[],trims=[],handles=[],corridorFaces=[],fascias=[],source=BUILDING_INTERIORS.floors[def.level];
  const [sa,sb]=source.stairs.rect,rect=(a,b)=>[[a[0],a[1]],[b[0],a[1]],[b[0],b[1]],[a[0],b[1]]],holes=[rect(sa,sb),...source.lifts.map(l=>rect([l.minX-.12,l.minZ-.05],[l.doorCenter[0]-.04,l.maxZ+.05]))];
  const addCorridorFace=(a,b,y,height,width)=>{const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.008||height<.008)return;const nx=-dz/length,nz=dx/length,middle=[(a[0]+b[0])/2,(a[1]+b[1])/2];for(const sign of [-1,1]){const sample=[middle[0]+nx*sign*(width/2+.06),middle[1]+nz*sign*(width/2+.06)];if(pointInPolygon(sample,def.core)&&!def.units.some(u=>pointInPolygon(sample,u.polygon)))segment([a[0]+nx*sign*(width/2+.004),a[1]+nz*sign*(width/2+.004)],[b[0]+nx*sign*(width/2+.004),b[1]+nz*sign*(width/2+.004)],y,height,.006,corridorFaces);}};
  const ceilingHoles=[...holes],duplex=duplexOnFloor(def.level),privateStair=duplexStair(duplex);
  if(privateStair)(def.level===duplex.entryFloor?ceilingHoles:holes).push(duplexStairOpening(privateStair));
  if(def.level===0)holes.push(...serviceSlabHoles());
  for(const path of def.envelope){
   slab(path.polygon,base-.015,BUILDING.slab,concrete,node,'building-floor-slab',def.level,holes.filter(h=>pointInPolygon(h[0],path.polygon)));
   path.polygon.forEach((a,i)=>{
    const b=path.polygon[(i+1)%path.polygon.length];if(def.level===0&&(nearApartment(a,b)||shown&&onGroundReplica(a.map((n,k)=>(n+b[k])/2))))return; // detailed ground profiles own their openings
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],at=t=>[a[0]+u[0]*t,a[1]+u[1]*t],span=o=>[o.a,o.b].map(p=>(p[0]-a[0])*u[0]+(p[1]-a[1])*u[1]).sort((a,b)=>a-b);
    const holes=path.openings.filter(o=>o.edge===i&&!isDoorOpening(o.a,o.b,source)).map(o=>({...o,span:span(o)})).sort((a,b)=>a.span[0]-b.span[0]);let cursor=0;
    for(const o of holes){const [l,r]=o.span,profile=clubWindowProfile(def.level,o),kind=profile?.kind||o.kind,sill=profile?.sill??(kind==='slider'?0:1),oh=profile?.height??(kind==='slider'?2.3:1.25);segment(at(l),at(r),base,Math.min(h,sill),.3,walls);if(h>sill+oh)segment(at(l),at(r),base+sill+oh,h-sill-oh,.3,walls);
     if(!cut){
      const angle=-Math.atan2(u[1],u[0]),mid=at((l+r)/2),width=r-l;
      const paneCenter=kind==='slider'?at(l+width/4):mid;
      panes.push([paneCenter[0],base+sill+oh/2,paneCenter[1],(kind==='slider'?width/2:width)-.05,oh-.05,.018,angle]);
      for(const q of [l+.018,r-.018,(l+r)/2])frames.push([at(q)[0],base+sill+oh/2,at(q)[1],.035,oh,.085,angle]);
      for(const yy of [sill,sill+oh])frames.push([mid[0],base+yy,mid[1],width,.04,.085,angle]);
      if(kind==='window'){segment(at(l-.04),at(r+.04),base+sill-.045,.06,.42,decks);dark.push([mid[0],base+sill+oh+.11,mid[1],width+.12,.17,.17,angle]);}
     }cursor=r;
    }
   });
  }
  for(const w of connectedWallRuns(source,def,def.level===0?COMMON_ENTRY_DOORS:[])){
   const ownership=w.sourceWallIndex==null?w:source.walls[w.sourceWallIndex],mid=ownership.a.map((n,i)=>(n+ownership.b[i])/2);if(def.level===0&&(onDetailedGround(mid)||shown&&onGroundReplica(mid)))continue;
   const exterior=def.envelope.some(path=>path.polygon.some((a,i)=>segmentDistance(mid,a,path.polygon[(i+1)%path.polygon.length])<.25));
   segment(w.a,w.b,base,h,w.width,exterior?walls:interiorWalls);if(!exterior)addCorridorFace(w.a,w.b,base,h,w.width);
   if(shown&&!exterior){const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;for(const sign of [-1,1])segment([w.a[0]+nx*sign*(w.width/2+.007),w.a[1]+nz*sign*(w.width/2+.007)],[w.b[0]+nx*sign*(w.width/2+.007),w.b[1]+nz*sign*(w.width/2+.007)],base+.01,.075,.014,trims);}
  }
  if(shown){
   for(const entry of source.entries){const door=source.doors.find(d=>d.id===entry.doorId),plate=buildingNumberPlate(entry.unit,resources);if(!plate||!door)continue;const length=Math.hypot(door.opened[0]-door.hinge[0],door.opened[1]-door.hinge[1]),normal=door.opened.map((n,i)=>(door.hinge[i]-n)/length),middle=door.hinge.map((n,i)=>(n+door.closed[i])/2);plate.position.set(middle[0]+normal[0]*.11,base+1.68,middle[1]+normal[1]*.11);plate.rotation.y=Math.atan2(normal[0],normal[1]);plate.userData={part:'building-unit-label',action:def.level===0&&entry.unit===4?'door':'building-door',doorId:def.level===0&&entry.unit===4?'entry':door.id,unit:entry.unit,buildingFloor:def.level};node.add(plate);picks.push(plate);}
   for(const unit of def.units){if(def.level===0)continue;slab(unit.polygon,base+.005,.025,interiorFloor,node,'building-unit-finish',def.level,holes.filter(h=>pointInPolygon(h[0],unit.polygon)));}
   for(const door of source.doors){
    if(def.level===0&&['bd-0-4','bd-0-5'].includes(door.id)){const opening=doorWallOpening(source,door);if(h>1.15)segment(opening.a,opening.b,base+1.15,h-1.15,opening.width,interiorWalls);continue;}
    if(def.level===0&&(onDetailedGround(door.hinge)||interactiveDoors&&onGroundReplica(door.hinge)))continue;
    const open=!settings.closedBuildingDoors?.includes(door.id),end=open?door.opened:door.closed,items=[],doorLeaves=[],doorHandles=[],dh=cut?.82:2.18,construction=doorWallOpening(source,door),entry=source.entries.some(e=>e.doorId===door.id);
    if(door.balconyDoor){
     const length=Math.hypot(end[0]-door.hinge[0],end[1]-door.hinge[1]),u=end.map((v,i)=>(v-door.hinge[i])/length),angle=-Math.atan2(u[1],u[0]);
     for(const t of [.025,length-.025])items.push([door.hinge[0]+u[0]*t,base+dh/2,door.hinge[1]+u[1]*t,.045,dh,.075,angle]);
     segment(door.hinge,end,base,.045,.075,items);segment(door.hinge,end,base+dh-.045,.045,.075,items);
     const panes=[];segment(door.hinge.map((v,i)=>v+u[i]*.05),end.map((v,i)=>v-u[i]*.05),base+.055,dh-.11,.016,panes);
     const glassLeaf=batch(node,glass,panes,'building-balcony-door-glazing',def.level,false);if(glassLeaf){doorLeaves.push(glassLeaf);glassLeaf.userData={part:'building-balcony-door-glazing',source:'building-plan',action:'building-door',doorId:door.id,balconyDoor:true,buildingFloor:def.level};picks.push(glassLeaf);}
    }else segment(door.hinge,end,base,dh,.045,items);
    const dx=door.closed[0]-door.hinge[0],dz=door.closed[1]-door.hinge[1],width=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);for(const at of [door.hinge,door.closed])trims.push([at[0],base+dh/2,at[1],.052,dh,.14,angle]);if(!cut){segment(door.hinge,door.closed,base+2.18,.055,.14,trims);const lx=end[0]-door.hinge[0],lz=end[1]-door.hinge[1],ll=Math.hypot(lx,lz),normal=[-lz/ll,lx/ll],handle=door.hinge.map((n,i)=>n+(end[i]-n)*Math.max(.1,(ll-.12)/ll));for(const sign of [-1,1]){doorHandles.push([handle[0]+normal[0]*sign*.034,base+1.02,handle[1]+normal[1]*sign*.034,.035,.085,.018,-Math.atan2(lz,lx)]);segment([handle[0]+normal[0]*sign*.055,handle[1]+normal[1]*sign*.055],[handle[0]-lx/ll*.10+normal[0]*sign*.055,handle[1]-lz/ll*.10+normal[1]*sign*.055],base+1.03,.018,.019,doorHandles);}}
    const mesh=batch(node,door.balconyDoor?metal:entry?entranceFinish:doorMat,items,'building-apartment-door',null);mesh.userData={part:'building-apartment-door',source:'building-plan',action:'building-door',doorId:door.id,unit:door.unit,balconyDoor:!!door.balconyDoor,buildingFloor:def.level};picks.push(mesh);doorLeaves.push(mesh);if(interactiveDoors){doorLeaves.push(batch(node,handleMat,doorHandles,'building-door-hardware',def.level));wrapPublicDoor(node,doorLeaves,{door,level:def.level,base,opened:open,kind:entry?'entry':door.balconyDoor?'glazed':'interior'});}else handles.push(...doorHandles);
    if(h>2.2&&!(def.level===0&&onGroundReplica(door.hinge))){segment(construction.a,construction.b,base+2.18,h-2.18,construction.width,door.balconyDoor?walls:interiorWalls);if(!door.balconyDoor)addCorridorFace(construction.a,construction.b,base+2.18,h-2.18,construction.width);}
   }
  }
  // The low rail courses in the photographs have glass infill, dark top rails
  // and grey balcony fascias. Their vertical sizes are illustrative.
  for(const poly of def.balconies){
   slab(poly,base-.012,BUILDING.slab,deck,node,'building-balcony-slab',def.level);
   if(shown)slab(poly,base-.016-BUILDING.slab,.012,soffit,node,'building-balcony-soffit',def.level);

  }
  for(const {a,b} of exposedBalconySegments(def)){
   const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);segment(a,b,base-BUILDING.slab,.24,.20,fascias);segment(a,b,base+1.08,.045,.05,rails);
   if(!cut){segment(a,b,base+.05,1.02,.015,panes);for(let j=0,n=Math.max(1,Math.ceil(len/1.25));j<=n;j++){const t=j/n;rails.push([a[0]+dx*t,base+.55,a[1]+dz*t,.035,1.1,.035]);}}
  }
  // Actual PDF flight footprints and directions; vertical rise is estimated.
  if(shown){
   const steps=[],[a,b]=source.stairs.rect,mx=(a[0]+b[0])/2,n=a[1]+1.55,s=b[1]-1.14,pitch=(s-n)/9;
   slab([[a[0],a[1]],[b[0],a[1]],[b[0],n],[a[0],n]],base-.01,.14,concrete,node,'building-stair-floor-landing',def.level);
   if(def.level<8)for(let j=0;j<9;j++){
    const sy=(j+1)*BUILDING.storey/18,sy2=BUILDING.storey/2+sy;
    if(!cut||sy<=h)steps.push([(a[0]+mx-.12)/2,base+sy/2,n+(j+.5)*pitch,mx-a[0]-.12,sy,pitch]);
    if(!cut||sy2<=h)steps.push([(b[0]+mx+.12)/2,base+sy2/2,s-(j+.5)*pitch,b[0]-mx-.12,sy2,pitch]);
   }
   if(def.level<8&&!cut)steps.push([mx,base+BUILDING.storey/2-.07,(s+b[1])/2,b[0]-a[0],.14,b[1]-s]);
   batch(node,concrete,steps,'building-common-stair',def.level);
   if(!cut&&def.level<8)stairHandrails(commonStairRails(source,BUILDING.storey),base,node,def.level,'building-stair-guard');
   if(!cut&&def.level===duplex?.entryFloor)stairHandrails(duplexFlightRails(privateStair,BUILDING.storey),base,node,def.level,'building-duplex-guard');
   if(!cut&&def.level===duplex?.upperFloor)stairHandrails(duplexLandingGuards(privateStair).map(s=>({a:[s.a[0],0,s.a[1]],b:[s.b[0],0,s.b[1]]})),base,node,def.level,'building-duplex-landing-guard');

   if(def.level===duplex?.entryFloor){const d=privateStair,[a,b]=d.longFlightRect,[c,e]=d.shortFlightRect,[la,lb]=d.cornerLandingRect,stairs=[];
    for(let j=0;j<12;j++){const rise=(j+1)/16*BUILDING.storey;if(!cut||rise<=h)stairs.push([(a[0]+b[0])/2,base+rise/2,b[1]-(j+.5)*(b[1]-a[1])/12,b[0]-a[0],rise,(b[1]-a[1])/12]);}
    if(!cut)stairs.push([(la[0]+lb[0])/2,base+BUILDING.storey*.75-.07,(la[1]+lb[1])/2,lb[0]-la[0],.14,lb[1]-la[1]]);
    for(let j=0;j<3;j++){const rise=(13+j)/16*BUILDING.storey;if(!cut||rise<=h)stairs.push([e[0]-(j+.5)*(e[0]-c[0])/3,base+rise/2,(c[1]+e[1])/2,(e[0]-c[0])/3,rise,e[1]-c[1]]);}
    batch(node,concrete,stairs,'building-duplex-32-stair',def.level);
   }
  }
  // Owner photos 307552/307556: continuous dark louvers over the service
  // recess, from the first-floor soffit to the last repeated storey.
  const louvres=[];
  if(def.level>0&&def.level<=6&&!cut){
   for(const screen of laundryScreens(def.level)){
    const {a,b}=screen,dx=b[0]-a[0],dz=b[1]-a[1],width=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,height=BUILDING.storey;
    // Actual slat gaps remain open: no opaque backing plate across the recess.
    for(const q of [a,b])louvres.push([q[0],base+height/2,q[1],.045,height,.08,angle]);
    for(let y=.04;y<height;y+=.08)louvres.push([x,base+y,z,width,.045,.105,angle]);
    fascias.push([x,base-.06,z,width,.12,.13,angle]);
   }
  }
  const screenMesh=batch(node,metal,louvres,'building-laundry-screen',def.level);if(screenMesh)screenMesh.userData.screens=laundryScreens(def.level);
  batch(node,trimMat,trims,'building-interior-trim',def.level);batch(node,handleMat,handles,'building-door-hardware',def.level);batch(node,fascia,fascias,'building-balcony-fascia',def.level);
  batch(node,corridorFinish,corridorFaces,'building-corridor-finish',def.level);batch(node,limestone,walls,'building-facade-wall',def.level);batch(node,insideWall,interiorWalls,'building-interior-wall',def.level);batch(node,metal,frames,'building-window-frame',def.level);batch(node,glass,panes,'building-glazing',def.level,false);batch(node,voidMat,dark,'building-fascia-and-service-screen',def.level);batch(node,metal,rails,'building-rail-and-louvres',def.level);batch(node,limestone,decks,'building-stone-sill',def.level);
  if(shown)buildApartmentFurniture({parent:node,resources,level:def.level,base,settings,surfaces:surface});
  if(def.level===0&&shown)buildCommonSpaces({parent:node,resources,settings,cut});
  if(def.level===0&&shown)buildResidentsClub({parent:node,resources,settings,cut,ceilingVisible:walking||limit>0});
  if(def.level===0&&shown)buildGroundApartments({root:node,resources,picks,settings,cut,mode,floorMaterial:interiorFloor,interactiveDoors});
  if(shown&&!cut&&(walking||def.level<limit||limit===9)){
   // A visible closing slab must meet the full storey-height walls. Placing
   // its upper face at the interior clear height hid the rooms while leaving
   // 35cm of every partition above it, making unchecked views look sliced.
   // The source slab helper extrudes downward from its supplied top level.
   for(const path of def.envelope)slab(path.polygon,base+BUILDING.storey,BUILDING.slab,soffit,node,'building-storey-ceiling',def.level,ceilingHoles.filter(h=>pointInPolygon(h[0],path.polygon)));
  }
 }
 if(limit===9){
  const node=new THREE.Group();node.name='building-roof';node.userData={part:'building-roof',level:9,page:11};root.add(node);floors.set(9,node);
  slab(BUILDING_ROOF.polygon,BUILDING_ROOF.elevation-.015,BUILDING.slab,roofMat,node,'building-main-roof',9);
  const parapets=[],heads=[];
  closedWallLoop(BUILDING_ROOF.polygon,BUILDING_ROOF.elevation,.38,.16,parapets);
  for(const poly of BUILDING_ROOF.heads){closedWallLoop(poly,BUILDING_ROOF.elevation,BUILDING.roofHead,.2,heads);slab(poly,BUILDING_ROOF.elevation+BUILDING.roofHead,.18,roofMat,node,'building-roof-head-cap',9);}
  batch(node,limestone,parapets,'building-roof-parapet',9);batch(node,limestone,heads,'building-lift-stair-head',9);
 }
 let elevators=null;
 if(shown){
  elevators=buildElevators({root,resources,picks,limit,shown,cube,settings});
  // Independently traced ground gardens, including the curved unit-2 plot.
  const lawn=material('#8d9d71'),fence=material('#394843');
  for(const garden of BUILDING_FLOORS[0].gardens||[]){
   if(garden.unit===4)continue;
   slab(garden.polygon,-.035,.025,lawn,root,'building-garden-ground',0);
   const bars=[];
   garden.plot.forEach((a,i)=>{const b=garden.plot[(i+1)%garden.plot.length];if(!gardenFenceEdge(a,b))return;const length=Math.hypot(b[0]-a[0],b[1]-a[1]);segment(a,b,.09,.045,.055,bars);segment(a,b,1.05,.045,.055,bars);for(let j=0,n=Math.ceil(length/.13);j<=n;j++)bars.push([a[0]+(b[0]-a[0])*j/n,.56,a[1]+(b[1]-a[1])*j/n,.025,1.05,.025]);});
   batch(root,fence,bars,'building-garden-fence',0);
  }
  slab(BUILDING_SITE,-.09,.14,material('#b5baa1'),root,'building-site-base',null,serviceSlabHoles());
  buildSiteContext({root,resources,picks,settings,ceilingVisible:walking||limit>0,cut:settings.cutaway===true&&!walking&&limit===0});
  // Highlight the original apartment footprint with an unobtrusive outline.
  // No large room labels cover the facade or its controls.
  const poly=apartmentOutline||BUILDING_FLOORS[0].units.find(u=>u.number===4).polygon,geo=new THREE.BufferGeometry().setFromPoints([...poly,poly[0]].map(([x,z])=>new THREE.Vector3(x,.08,z))),m=new THREE.LineBasicMaterial({color:'#e5a64b',transparent:true,opacity:.9});resources.push(geo,m);const line=new THREE.Line(geo,m);line.name='apartment-4-outline';line.userData.part='building-apartment-highlight';root.add(line);
 }
 return {group:root,floors,shadowOnly:!shown,elevators};
}

function pointInPolygon([x,y],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
