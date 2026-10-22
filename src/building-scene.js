import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS,BUILDING_ROOF,BUILDING_SITE,BUILDING_CENTER,normalizeBuildingLevel} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {onDetailedGround,segmentDistance,parseDestination,isDoorOpening,gardenFenceEdge} from './building-navigation.mjs';
import {buildElevators} from './building-elevators.js';
import {buildingNumberPlate} from './building-signage.js';
import {buildGroundApartments} from './ground-apartments-scene.js';
import {buildSiteContext} from './building-site-scene.js';

// Shared instanced cubes keep nine storeys affordable on phones. Physical
// shadow geometry remains present while the apartment is viewed as a cutaway;
// its invisible materials do not write depth or cover apartment controls.
export function buildBuildingContext({group,resources,settings,mode='overview',picks=[],kitchenAnchor=null,apartmentOutline=null}){
 const walking=mode==='walk',unitView=mode==='unit',shown=mode==='building'||walking||unitView,selected=parseDestination(settings.tourDestination),limit=walking?9:unitView?selected.floor:shown?normalizeBuildingLevel(settings.buildingLevel):9;
 if(!shown&&settings.buildingShadows===false)return {group:null,floors:new Map(),shadowOnly:true};
 const root=new THREE.Group();root.name='building-4102';root.userData={part:'whole-building',building:4102,source:'building-plan',shadowOnly:!shown};group.add(root);
 if(kitchenAnchor){root.position.set(kitchenAnchor[0],0,kitchenAnchor[1]);root.rotation.y=Math.PI;}
 const floors=new Map(),cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);
 function material(color,extra={}){const m=shown?new THREE.MeshStandardMaterial({color,roughness:.8,...extra}):new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,opacity:0});resources.push(m);return m;}
 const limestone=material('#d9d2c5'),concrete=material('#b4b1a7'),deck=material('#c5bcaa'),metal=material('#303b3e',{roughness:.42,metalness:.45}),glass=material('#a2c0cd',{roughness:.18,metalness:.2,transparent:true,opacity:.39,depthWrite:false}),voidMat=material('#485052',{roughness:.4}),roofMat=material('#ddd9cc'),insideWall=material('#ece9e0'),doorMat=material('#c3b59f',{roughness:.66}),interiorFloor=material('#d1cabe');
 if(shown){
  // Metre-scale stone courses, restrained grain and staggered vertical joints.
  // Colours/profile follow the supplied facade photos; this is no scan claim.
  limestone.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 bw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nbw=instanceMatrix*bw;\n#endif\nvBuildingWorld=(modelMatrix*bw).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;').replace('#include <color_fragment>',`#include <color_fragment>
    float course=floor(vBuildingWorld.y/.48);
    vec3 n=normalize(cross(dFdx(vBuildingWorld),dFdy(vBuildingWorld)));
    float horizontal=abs(n.x)>abs(n.z)?vBuildingWorld.z:vBuildingWorld.x;
    float row=abs(fract(vBuildingWorld.y/.48+.5)-.5)*.48;
    float col=abs(fract((horizontal+mod(course,2.0)*.46)/.94+.5)-.5)*.94;
    float joint=max(1.0-smoothstep(.001,.004,row),1.0-smoothstep(.001,.003,col));
    float grain=fract(sin(dot(vBuildingWorld.xz+vBuildingWorld.yy,vec2(127.1,311.7)))*43758.5453);
    diffuseColor.rgb*=mix(.99+grain*.025,.77,joint*.6);
   `);
  };limestone.customProgramCacheKey=()=> 'building-stone-courses-r44';
 }
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 function batch(parent,mat,items,part,level,cast=true){
  if(!items.length)return;const mesh=new THREE.InstancedMesh(cube,mat,items.length);mesh.name=part;mesh.userData={part,buildingFloor:level,source:'building-plan',heightInferred:true,...(shown&&level!==null?{action:'building-floor'}:{})};
  items.forEach(([x,y,z,w,h,d,angle=0],i)=>{rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle);position.set(x,y,z);scale.set(Math.max(.001,w),Math.max(.001,h),Math.max(.001,d));matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);});
  mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();resources.push(mesh);parent.add(mesh);if(mesh.userData.action)picks.push(mesh);return mesh;
 }
 function slab(poly,y,thickness,mat,parent,part,level,holes=[]){
  if(poly.length<3)return;const s=new THREE.Shape();poly.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();for(const poly of holes){const hole=new THREE.Path();poly.forEach(([x,z],i)=>i?hole.lineTo(x,z):hole.moveTo(x,z));hole.closePath();s.holes.push(hole);}const geo=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false});geo.rotateX(Math.PI/2);resources.push(geo);const mesh=new THREE.Mesh(geo,mat);mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;mesh.userData={part,buildingFloor:level,source:'building-plan'};parent.add(mesh);return mesh;
 }
 function segment(a,b,y,h,thickness,into){const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.008||h<.008)return;into.push([(a[0]+b[0])/2,y+h/2,(a[1]+b[1])/2,length,h,thickness,-Math.atan2(dz,dx)]);}
 const nearApartment=(a,b)=>{const p=[(a[0]+b[0])/2,(a[1]+b[1])/2];return p[0]<11.98&&p[0]>-.7&&p[1]>-.35&&p[1]<16.05;};
 const onGroundReplica=p=>BUILDING_FLOORS[0].units.some(u=>u.number!==4&&(pointInPolygon(p,u.polygon)||u.polygon.some((a,i)=>segmentDistance(p,a,u.polygon[(i+1)%u.polygon.length])<.24)));
 for(const def of BUILDING_FLOORS){
  if(def.level>limit)continue;
  const node=new THREE.Group();node.name=def.id;node.userData={part:'building-storey',level:def.level,page:def.page,source:'building-plan'};root.add(node);floors.set(def.level,node);
  const cut=settings.cutaway===true&&shown&&!walking&&limit<9&&def.level===limit,base=def.elevation,h=cut?.85:BUILDING.storey,walls=[],frames=[],panes=[],dark=[],rails=[],decks=[],interiorWalls=[],source=BUILDING_INTERIORS.floors[def.level];
  const [sa,sb]=source.stairs.rect,rect=(a,b)=>[[a[0],a[1]],[b[0],a[1]],[b[0],b[1]],[a[0],b[1]]],holes=[rect(sa,sb),...source.lifts.map(l=>rect([l.minX-.12,l.minZ-.05],[l.doorCenter[0]-.04,l.maxZ+.05]))];
  if(source.duplexStair){const d=source.duplexStair,[a,b]=d.longFlightRect,[c,e]=d.shortFlightRect;holes.push([[c[0],c[1]],[b[0],c[1]],[b[0],b[1]],[a[0],b[1]],[a[0],e[1]],[c[0],e[1]]]);}
  for(const path of def.envelope){
   slab(path.polygon,base-.015,BUILDING.slab,concrete,node,'building-floor-slab',def.level,holes.filter(h=>pointInPolygon(h[0],path.polygon)));
   path.polygon.forEach((a,i)=>{
    const b=path.polygon[(i+1)%path.polygon.length];if(def.level===0&&(nearApartment(a,b)||shown&&onGroundReplica(a.map((n,k)=>(n+b[k])/2))))return; // detailed ground profiles own their openings
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],at=t=>[a[0]+u[0]*t,a[1]+u[1]*t],span=o=>[o.a,o.b].map(p=>(p[0]-a[0])*u[0]+(p[1]-a[1])*u[1]).sort((a,b)=>a-b);
    const holes=path.openings.filter(o=>o.edge===i&&!isDoorOpening(o.a,o.b,source)).map(o=>({...o,span:span(o)})).sort((a,b)=>a.span[0]-b.span[0]);let cursor=0;
    for(const o of holes){const [l,r]=o.span,sill=o.kind==='slider'?0:1,oh=o.kind==='slider'?2.3:1.25;segment(at(l),at(r),base,Math.min(h,sill),.3,walls);if(h>sill+oh)segment(at(l),at(r),base+sill+oh,h-sill-oh,.3,walls);
     if(!cut){
      const angle=-Math.atan2(u[1],u[0]),mid=at((l+r)/2),width=r-l;
      const paneCenter=o.kind==='slider'?at(l+width/4):mid;
      panes.push([paneCenter[0],base+sill+oh/2,paneCenter[1],(o.kind==='slider'?width/2:width)-.05,oh-.05,.018,angle]);
      for(const q of [l+.018,r-.018,(l+r)/2])frames.push([at(q)[0],base+sill+oh/2,at(q)[1],.035,oh,.085,angle]);
      for(const yy of [sill,sill+oh])frames.push([mid[0],base+yy,mid[1],width,.04,.085,angle]);
      if(o.kind==='window'){segment(at(l-.04),at(r+.04),base+sill-.045,.06,.42,decks);dark.push([mid[0],base+sill+oh+.11,mid[1],width+.12,.17,.17,angle]);}
     }cursor=r;
    }
   });
  }
  for(const w of source.walls){
   const mid=w.a.map((n,i)=>(n+w.b[i])/2);if(def.level===0&&(onDetailedGround(mid)||shown&&onGroundReplica(mid)))continue;
   const exterior=def.envelope.some(path=>path.polygon.some((a,i)=>segmentDistance(mid,a,path.polygon[(i+1)%path.polygon.length])<.25));
   segment(w.a,w.b,base,h,w.width,exterior?walls:interiorWalls);
  }
  if(shown){
   for(const entry of source.entries){const door=source.doors.find(d=>d.id===entry.doorId),plate=buildingNumberPlate(entry.unit,resources);if(!plate||!door)continue;const length=Math.hypot(door.opened[0]-door.hinge[0],door.opened[1]-door.hinge[1]),normal=door.opened.map((n,i)=>(door.hinge[i]-n)/length),middle=door.hinge.map((n,i)=>(n+door.closed[i])/2);plate.position.set(middle[0]+normal[0]*.11,base+1.68,middle[1]+normal[1]*.11);plate.rotation.y=Math.atan2(normal[0],normal[1]);plate.userData={part:'building-unit-label',action:def.level===0&&entry.unit===4?'door':'building-door',doorId:def.level===0&&entry.unit===4?'entry':door.id,unit:entry.unit,buildingFloor:def.level};node.add(plate);picks.push(plate);}
   for(const unit of def.units){if(def.level===0)continue;slab(unit.polygon,base+.005,.025,interiorFloor,node,'building-unit-finish',def.level,holes.filter(h=>pointInPolygon(h[0],unit.polygon)));}
   for(const door of source.doors){
    if(def.level===0&&onDetailedGround(door.hinge))continue;
    const open=!settings.closedBuildingDoors?.includes(door.id),end=open?door.opened:door.closed,items=[],dh=cut?.82:2.18;
    segment(door.hinge,end,base,dh,.045,items);
    const mesh=batch(node,doorMat,items,'building-apartment-door',null);mesh.userData={part:'building-apartment-door',source:'building-plan',action:'building-door',doorId:door.id,unit:door.unit,buildingFloor:def.level};picks.push(mesh);
    if(h>2.2&&!(def.level===0&&onGroundReplica(door.hinge)))segment(door.hinge,door.closed,base+2.2,h-2.2,.13,interiorWalls);
   }
  }
  // The low rail courses in the photographs have glass infill, dark top rails
  // and grey balcony fascias. Their vertical sizes are illustrative.
  for(const poly of def.balconies){
   slab(poly,base-.012,BUILDING.slab,deck,node,'building-balcony-slab',def.level);
   poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    // Only exposed edges get guardrails; balcony-to-building joints stay open.
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),eps=.13;
    const inEnclosure=p=>def.envelope.some(path=>pointInPolygon(p,path.polygon));
    if(inEnclosure([mid[0]+dz/len*eps,mid[1]-dx/len*eps])||inEnclosure([mid[0]-dz/len*eps,mid[1]+dx/len*eps]))return;
    segment(a,b,base-BUILDING.slab,.24,.20,dark);segment(a,b,base+1.08,.045,.05,rails);
    if(!cut){segment(a,b,base+.05,1.02,.015,panes);for(let j=0,n=Math.max(1,Math.ceil(len/1.25));j<=n;j++){const t=j/n;rails.push([a[0]+dx*t,base+.55,a[1]+dz*t,.035,1.1,.035]);}}
   });
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
   if(def.level===5&&source.duplexStair){const d=source.duplexStair,[a,b]=d.longFlightRect,[c,e]=d.shortFlightRect,[la,lb]=d.cornerLandingRect,stairs=[];
    for(let j=0;j<12;j++){const rise=(j+1)/16*BUILDING.storey;if(!cut||rise<=h)stairs.push([(a[0]+b[0])/2,base+rise/2,b[1]-(j+.5)*(b[1]-a[1])/12,b[0]-a[0],rise,(b[1]-a[1])/12]);}
    if(!cut)stairs.push([(la[0]+lb[0])/2,base+BUILDING.storey*.75-.07,(la[1]+lb[1])/2,lb[0]-la[0],.14,lb[1]-la[1]]);
    for(let j=0;j<3;j++){const rise=(14+j)/16*BUILDING.storey;if(!cut||rise<=h)stairs.push([e[0]-(j+.5)*(e[0]-c[0])/3,base+rise/2,(c[1]+e[1])/2,(e[0]-c[0])/3,rise,e[1]-c[1]]);}
    batch(node,concrete,stairs,'building-duplex-32-stair',def.level);
   }
  }
  // Reconstruct the two photographed continuous service-screen stacks on the
  // south service recess, not extra AC condensers or private equipment.
  if(def.level>0&&def.level<=6&&!cut){
   for(const x of [8.35,2*BUILDING_CENTER[0]-8.35]){
    const z=7.08,width=.88;dark.push([x,base+1.43,z,width,2.86,.06]);
    for(let y=.12;y<2.87;y+=.115)rails.push([x,base+y,z+.055,width,.033,.08]);
   }
  }
  batch(node,limestone,walls,'building-facade-wall',def.level);batch(node,insideWall,interiorWalls,'building-interior-wall',def.level);batch(node,metal,frames,'building-window-frame',def.level);batch(node,glass,panes,'building-glazing',def.level,false);batch(node,voidMat,dark,'building-fascia-and-service-screen',def.level);batch(node,metal,rails,'building-rail-and-louvres',def.level);batch(node,limestone,decks,'building-stone-sill',def.level);
  if(def.level===0&&shown)buildGroundApartments({root:node,resources,picks,settings,cut,mode});
  if(shown&&def.level>0&&!cut){
   // Closed floor tops prevent seeing through the entire shell through a pane.
   // These are slabs, not fictitious interior apartment details.
   for(const path of def.envelope)slab(path.polygon,base+BUILDING.clearHeight,.12,concrete,node,'building-storey-ceiling',def.level,holes.filter(h=>pointInPolygon(h[0],path.polygon)));
  }
 }
 if(limit===9){
  const node=new THREE.Group();node.name='building-roof';node.userData={part:'building-roof',level:9,page:11};root.add(node);floors.set(9,node);
  slab(BUILDING_ROOF.polygon,BUILDING_ROOF.elevation-.015,BUILDING.slab,roofMat,node,'building-main-roof',9);
  const parapets=[],heads=[];
  BUILDING_ROOF.polygon.forEach((a,i)=>segment(a,BUILDING_ROOF.polygon[(i+1)%BUILDING_ROOF.polygon.length],BUILDING_ROOF.elevation,.38,.16,parapets));
  for(const poly of BUILDING_ROOF.heads){poly.forEach((a,i)=>segment(a,poly[(i+1)%poly.length],BUILDING_ROOF.elevation,BUILDING.roofHead,.2,heads));slab(poly,BUILDING_ROOF.elevation+BUILDING.roofHead,.18,roofMat,node,'building-roof-head-cap',9);}
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
  slab(BUILDING_SITE,-.09,.14,material('#b5baa1'),root,'building-site-base',null);
  buildSiteContext({root,resources,picks,settings,cut:settings.cutaway===true&&!walking&&limit===0});
  // Highlight the original apartment footprint with an unobtrusive outline.
  // No large room labels cover the facade or its controls.
  const poly=apartmentOutline||BUILDING_FLOORS[0].units.find(u=>u.number===4).polygon,geo=new THREE.BufferGeometry().setFromPoints([...poly,poly[0]].map(([x,z])=>new THREE.Vector3(x,.08,z))),m=new THREE.LineBasicMaterial({color:'#e5a64b',transparent:true,opacity:.9});resources.push(geo,m);const line=new THREE.Line(geo,m);line.name='apartment-4-outline';line.userData.part='building-apartment-highlight';root.add(line);
 }
 return {group:root,floors,shadowOnly:!shown,elevators};
}

function pointInPolygon([x,y],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
