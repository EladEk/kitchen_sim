import {buildOwnerCars} from './owner-parking-scene.mjs';
import {buildSecurityCameras} from './security-cameras.mjs';
import {commonSpace} from './common-spaces.mjs';
import {RESIDENTS_CLUB} from './residents-club.mjs';
import {buildEntranceServices} from './entrance-services-scene.js';
import {buildLightingPoints} from './home-lighting-scene.js';
import {buildDaylight} from './daylight-scene.js';
import {buildBuildingContext} from './building-scene.js';
import {BUILDING_CENTER,BUILDING_BOUNDS} from './building-layout.mjs';
import {parseDestination} from './building-navigation.mjs';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {HOUSE,HOUSE_OUTLINE,PLOT,TERRACE,SERVICE_APRON,PUBLIC_ENTRY,ROOMS,WALLS,CONSTRUCTION_WALLS,DOORS,WINDOWS,SHUTTERS,FURNITURE,furnitureForSettings,GARDEN_PLANTS,HOME_FINISHES,FLOOR_FINISHES,KITCHEN_ANCHOR,GARDEN_LAYOUT,WATER_LAYOUT,LIGHTING_LAYOUT,point,polygonBounds,insidePolygon,roomAt,openingPoint} from './home-model.mjs';
import {buildOutdoorKitchen} from './outdoor-kitchen.js';
import {claddingHeight,DOUBLE_GLAZED_IDS} from './home-building-spec.mjs';
import {SHUTTER_COVERS} from './home-photo-reference.mjs';
import {buildObservedArchitecture} from './home-observed-scene.js';
import {buildGardenArchitecture} from './home-garden-scene.js';
import {buildServiceYard} from './service-yard-scene.js';
import {buildExteriorDetails} from './home-exterior-scene.js';
import {createSurfacePalette,metricSurfaceUVs} from './surface-materials.mjs';
import {createVegasSink,vegasCutoutPath} from './sink.js';
import {KITCHEN_SINK as SINK} from './kitchen-sink.mjs';
import {createCeramicBowl,createSkyToilet} from './sanitary-fixtures.js';
import {createVeredKitchenTap} from './kitchen-tap.js';
import {roomHasOrderedCladding} from './home-finish-schedule.mjs';
import {buildElectricalPoints,buildWaterPoints} from './home-electrical-scene.js';
import {LONG,SHORT,UPPERS,ISLAND,ISLAND_UNITS,MATERIALS,STONES,DEFAULTS} from './model.mjs';

export function createHomeScene(settings,{mode='overview',selectedRoom='living',kitchenSettings=DEFAULTS,context=true,daylight=true}={}){
 const group=new THREE.Group(),picks=[],resources=[],motions=[],roomGroups=new Map(),furnitureGroups=new Map(),doorGroups=new Map(),shutterGroups=new Map();
 const mat=(color,opts={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.78,...opts});resources.push(m);return m;};
 const surface=createSurfacePalette(resources);
 const entryDoorFinish=surface('door','#536c66'),doorFinish=surface('door','#d8d0c3'),doorFrame=surface('paint','#e2dcd1'),ceilingFinish=surface('plaster','#f7f5ef',{side:THREE.FrontSide,shadowSide:THREE.DoubleSide}),offwhite=surface('paint','#efebe2'),oak=surface('wood','#ae8b61'),ink=mat('#35463d'),windowInk=mat('#343d3d',{metalness:.3,roughness:.5}),steel=mat('#a7b1ac',{metalness:.55,roughness:.35}),white=mat('#f0f0e8'),dark=mat('#29352f'),glass=mat('#b0c8be',{transparent:true,opacity:.28,roughness:.16,depthWrite:false}),linen=surface('fabric','#c5c5af'),clay=mat('#b58e75'),cap=mat('#c7c9bc');
 // Selecting a destination removes upper floors, but must not enable wall cuts.
 const wallCutaway=settings.cutaway===true&&mode!=='walk'&&(mode==='building'?settings.buildingLevel===0:mode==='unit'?parseDestination(settings.tourDestination).floor===0:true);
 const wallHeight=wallCutaway?.86:HOUSE.height;
 function box(x,y,z,w,h,d,material,parent=group,data=null,round=0){
  const g=round?new RoundedBoxGeometry(w,h,d,material.userData?.surfaceKind==='fabric'?5:2,Math.min(round,w/5,h/5,d/5)):new THREE.BoxGeometry(w,h,d);metricSurfaceUVs(g,[x,y,z]);resources.push(g);const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;if(data)m.userData={...data};parent.add(m);if(data?.action||data?.blockPick)picks.push(m);return m;
 }
 function glazing(id,y,width,height,parent,data=null){
  const double=DOUBLE_GLAZED_IDS.includes(id),material=double?mat('#b0c8be',{transparent:true,opacity:.15,roughness:.16,depthWrite:false}):glass;
  for(const z of double?[-.007,.007]:[0]){const pane=box(0,y,z,width,height,.004,material,parent,data);pane.castShadow=false;pane.userData.glazing=double?'double':'single';pane.userData.openingId=id;}
 }
 function cylinder(x,y,z,r,h,material,parent=group,data=null){const g=new THREE.CylinderGeometry(r,r,h,32);metricSurfaceUVs(g,[x,y,z]);resources.push(g);const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=true;if(data)m.userData={...data};parent.add(m);if(data?.action)picks.push(m);return m;}
 function sphere(x,y,z,r,material,parent=group,scale=[1,1,1]){const g=new THREE.SphereGeometry(r,16,10);metricSurfaceUVs(g,[x,y,z]);resources.push(g);const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.scale.set(...scale);parent.add(m);m.castShadow=true;return m;}
 function floor(poly,material,y=0,parent=group,data=null){const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const g=new THREE.ShapeGeometry(shape);g.rotateX(Math.PI/2);metricSurfaceUVs(g);resources.push(g);const m=new THREE.Mesh(g,material);m.material.side=THREE.DoubleSide;m.position.y=y;m.receiveShadow=true;if(data)m.userData={...data};parent.add(m);if(data?.action)picks.push(m);return m;}
 function lines(points,color='#a4a293',opacity=.3,parent=group){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));resources.push(g);const m=new THREE.LineBasicMaterial({color,transparent:true,opacity});resources.push(m);parent.add(new THREE.LineSegments(g,m));}
 function plant(x,z,size=1,parent=group){cylinder(x,.2*size,z,.2*size,.4*size,mat('#bcb6a1'),parent);cylinder(x,.48*size,z,.024*size,.75*size,oak,parent);for(let i=0;i<5;i++)sphere(x+Math.sin(i*1.8)*.13*size,(.75+i*.09)*size,z+Math.cos(i*1.8)*.13*size,.25*size,mat(i%2?'#7f9470':'#637d59'),parent,[1,.65,1]);}
 function roomMaterial(id){const value=settings.rooms[id]||settings.rooms.living;return value?.wall==='ordered-mona'?'#e9e5db':HOME_FINISHES.find(f=>f.id===value?.wall)?.color||'#e9e5db';}
 const green=surface('grass','#90a17b');floor(PLOT,green,-.035);floor(PUBLIC_ENTRY,surface('cement','#b9b9af'),-.01);floor(HOUSE_OUTLINE,mat('#d8d3c5'),0);
 if(mode==='walk'){const ceiling=floor(HOUSE_OUTLINE,ceilingFinish,HOUSE.height);ceiling.material.side=THREE.FrontSide;ceiling.castShadow=true;ceiling.userData.part='illustrative-ceiling';}
 else if(!settings.cutaway){const m=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,opacity:0});resources.push(m);const ceiling=floor(HOUSE_OUTLINE,m,HOUSE.height);ceiling.castShadow=true;ceiling.userData.part='solar-ceiling-occluder';}

 function roomFloor(room,poly,parent,data){
  const f=FLOOR_FINISHES.find(f=>f.id===settings.rooms[room.id]?.floor)||FLOOR_FINISHES[0],kind=f.id==='oak'?'wood':f.id==='ordered-wet'?'cement':f.id==='ordered-terrace'?'terrace':'porcelain',m=floor(poly,surface(kind,f.color,{productId:f.productId}),.008,parent,data);m.userData.navigationSurface=true;m.userData.floorFinish=f.id;m.userData.tile=f.tile||null;m.userData.productId=f.productId;
  // Ordered floors shade millimetre-width joints directly on the surface.
  // Keep screen-space guide lines only for the optional trial finishes.
  if(m.material.userData.floorRendering)return;
  const b=polygonBounds(poly),pts=[],sx=f.tile?.[0]||(f.id==='oak'?.16:.8),sz=f.tile?.[1]||.8;
  // Both existing and added paving use the same world-origin tile grid.
  for(let x=Math.ceil(b.minX/sx)*sx;x<b.maxX;x+=sx)for(let z=b.minZ;z<b.maxZ;z+=.08){if(insidePolygon([x,z+.04],poly))pts.push([x,.009,z],[x,.009,Math.min(z+.08,b.maxZ)]);}
  if(f.id!=='oak')for(let z=Math.ceil(b.minZ/sz)*sz;z<b.maxZ;z+=sz)for(let x=b.minX;x<b.maxX;x+=.08){if(insidePolygon([x+.04,z],poly))pts.push([x,.009,z],[Math.min(x+.08,b.maxX),.009,z]);}
  lines(pts,f.id==='oak'?'#7b674d':'#8c9188',f.productId?.includes('floor')?.32:.23,parent);
 }
 for(const room of ROOMS){if(room.kind==='garden')continue;const p=new THREE.Group();p.userData.roomId=room.id;group.add(p);roomGroups.set(room.id,p);roomFloor(room,room.polygon,p,{action:'room',roomId:room.id});}
 const gardenGroups=buildGardenArchitecture({group,box,mat,surface,settings,mode}),pavingGroup=new THREE.Group();
 pavingGroup.userData={buildingId:'garden-paving',planned:true,dimensionsInferred:true};roomGroups.get('terrace').add(pavingGroup);gardenGroups.set('garden-paving',pavingGroup);
 roomFloor(ROOMS.find(r=>r.id==='terrace'),GARDEN_LAYOUT.paving,pavingGroup,{action:'building',buildingId:'garden-paving',roomId:'terrace'});
 for(const [id,p] of buildServiceYard({group,box,cylinder,floor,lines,mat,surface,resources,motions,settings,mode}))gardenGroups.set(id,p);
 for(const [id,p] of buildExteriorDetails({group,box,cylinder,floor,lines,mat,surface,resources,settings,mode}))gardenGroups.set(id,p);
 for(const def of GARDEN_PLANTS){const p=new THREE.Group();p.userData.plantId=def.id;group.add(p);plant(def.position[0],def.position[1],def.size,p);}
 // One construction opening per host door; a secondary leaf shares its hole.
 // Opening heights follow the RG/RG1 table, while sill/ceiling heights are assumed.
 for(const w of CONSTRUCTION_WALLS){const vertical=Math.abs(w.a[0]-w.b[0])<.001,lo=vertical?w.a[1]:w.a[0],hi=vertical?w.b[1]:w.b[0],holes=[...DOORS.filter(d=>!d.hostDoorId),...WINDOWS].filter(o=>o.wallId===w.id).sort((a,b)=>a.start-b.start);
  const vertexCuts=ROOMS.filter(r=>!['garden','outdoor'].includes(r.kind)).flatMap(r=>r.polygon).filter(p=>Math.abs(p[vertical?0:1]-w.a[vertical?0:1])<.45).map(p=>p[vertical?1:0]);
  const segment=(a,b,bottom,height)=>{if(b-a<.002||height<.002)return;const cuts=[...new Set([a,b,...vertexCuts.filter(n=>n>a+.002&&n<b-.002)])].sort((a,b)=>a-b);
   for(let i=0;i<cuts.length-1;i++){const aa=cuts[i],bb=cuts[i+1],mid=vertical?[w.a[0],(aa+bb)/2]:[(aa+bb)/2,w.a[1]],regions=[roomAt([mid[0]+(vertical?.21:0),mid[1]+(vertical?0:.21)]),roomAt([mid[0]-(vertical?.21:0),mid[1]-(vertical?0:.21)])],m1=surface('plaster',roomMaterial(regions[0])),m2=surface('plaster',roomMaterial(regions[1])),mats=[m1,m2,cap,cap,m1,m2];
    const facade=mode==='building'&&w.external?surface('limestone','#d9d2c5'):null;
    const mesh=vertical?box(w.a[0],bottom+height/2,(aa+bb)/2,w.thickness,height,bb-aa,facade||mats,group,{blockPick:true,wallId:w.id}):box((aa+bb)/2,bottom+height/2,w.a[1],bb-aa,height,w.thickness,facade||mats,group,{blockPick:true,wallId:w.id});mesh.userData.part='architectural-wall';
    for(let side=0;side<2;side++){const sign=side?-1:1,rr=settings.rooms[regions[side]],normal=w.a[vertical?0:1]+sign*(w.thickness/2+.004);
     if(rr?.wall==='ordered-mona'&&roomHasOrderedCladding(regions[side])){
      const top=Math.min(bottom+height,claddingHeight(regions[side]));
      if(top>bottom){const tileMat=surface('cement',HOME_FINISHES.find(f=>f.id==='ordered-mona').color,{productId:'wet-wall'}),data={blockPick:true,wallId:w.id,roomId:regions[side],wallTile:[.75,.25],wallTileHeight:claddingHeight(regions[side]),productId:'wet-wall'};vertical?box(normal,(bottom+top)/2,(aa+bb)/2,.006,top-bottom,bb-aa,tileMat,group,data):box((aa+bb)/2,(bottom+top)/2,normal,bb-aa,top-bottom,.006,tileMat,group,data);
       const pts=[],at=(axis,y)=>vertical?[normal+sign*.004,y,axis]:[axis,y,normal+sign*.004];for(let y=Math.ceil(bottom/.25)*.25;y<top;y+=.25)pts.push(at(aa,y),at(bb,y));for(let q=Math.ceil(aa/.75)*.75;q<bb;q+=.75)pts.push(at(q,bottom),at(q,top));lines(pts,'#858d83',.3);
      }
     }
     if(bottom===0&&rr?.floor==='ordered-white'){const trim=vertical?box(normal,.035,(aa+bb)/2,.014,.07,bb-aa,offwhite):box((aa+bb)/2,.035,normal,bb-aa,.07,.014,offwhite);trim.userData.productId='skirting';}
    }
   }
  };

  let at=lo;for(const o of holes){segment(at,o.start,0,wallHeight);if(o.sill)segment(o.start,o.end,0,Math.min(o.sill,wallHeight));if(o.sill+o.height<wallHeight)segment(o.start,o.end,o.sill+o.height,wallHeight-o.sill-o.height);at=o.end;}segment(at,hi,0,wallHeight);
 }
 for(const o of WINDOWS){const [x,z]=openingPoint(o),height=Math.min(o.height,wallHeight-o.sill);if(height<=0)continue;const p=new THREE.Group();p.position.set(x,o.sill,z);p.rotation.y=o.vertical?Math.PI/2:0;group.add(p);
  p.userData.windowId=o.id;p.userData.schedule=o.schedule;
  const sliding=o.operation==='sliding';
  if(sliding)for(let i=0;i<2;i++){
   const sash=new THREE.Group();sash.position.set((i?1:-1)*o.width/4,0,(i?1:-1)*.019);sash.userData.part='window-sash';p.add(sash);
   glazing(o.id,height/2,o.width/2-.045,height-.06,sash);
   for(const xx of [-o.width/4,o.width/4])box(xx,height/2,0,.028,height,.035,windowInk,sash);
   for(const yy of [.015,height-.015])box(0,yy,0,o.width/2,.03,.035,windowInk,sash);
   box((i?-1:1)*(o.width/4-.04),height*.48,.023,.016,.14,.015,windowInk,sash);
  }else glazing(o.id,height/2,o.width-.05,height-.06,p);
  for(const xx of [-o.width/2,o.width/2])box(xx,height/2,0,.035,height,.085,windowInk,p);
  for(const yy of [0,height]){const rail=box(0,yy,0,o.width,.035,.085,windowInk,p);rail.userData.part=yy?'window-head':'window-sill';}
  box(0,-.03,0,o.width+.1,.04,.21,offwhite,p);
  if(o.id==='safe-window'){
   const wall=WALLS.find(w=>w.id===o.wallId),slats=new THREE.Group();slats.position.z=wall.thickness/2+.055;slats.userData.part='photo-exterior-slats';p.add(slats);
   for(let y=.07;y<height-.03;y+=.095){const blade=box(0,y,0,o.width-.055,.033,.065,windowInk,slats);blade.rotation.x=-.35;}
   for(const xx of [-o.width/2+.025,o.width/2-.025])box(xx,height/2,0,.03,height,.07,windowInk,slats);
  }
 }
 for(const d of DOORS){const [x,z]=openingPoint(d),p=new THREE.Group();p.position.set(x+(d.vertical?d.faceOffset||0:0),0,z+(d.vertical?0:d.faceOffset||0));p.rotation.y=d.vertical?-Math.PI/2:0;p.userData.doorId=d.id;group.add(p);doorGroups.set(d.id,p);
  const h=Math.min(d.height,wallHeight),isOpen=settings.openDoors.includes(d.id),data={action:'door',doorId:d.id};
  for(const xx of [-d.width/2,d.width/2])box(xx,h/2,0,.052,h,.105,doorFrame,p,data);if(h>=d.height)box(0,h,0,d.width,.052,.105,doorFrame,p,data);
  if(d.type==='slider'){
   for(let i=0;i<2;i++){const leaf=new THREE.Group(),closed=-d.width/4+i*d.width/2;leaf.position.x=i?closed:(isOpen?d.width/4:closed);p.add(leaf);if(!i)motions.push({id:`door:${d.id}`,object:leaf,property:'x',axis:'position',target:leaf.position.x});
    glazing(d.id,h/2,d.width/2-.025,h,leaf,data);for(const xx of [-d.width/4,d.width/4])box(xx,h/2,.008,.025,h,.04,ink,leaf,data);for(const yy of [.015,h-.015])box(0,yy,.008,d.width/2,.025,.04,ink,leaf,data);box(-d.width/4+.07,h*.48,.04,.018,.22,.02,ink,leaf,data);
   }
  }else{
   const sign=d.hinge==='end'?-1:1,pivot=new THREE.Group(),openTarget=(d.swing||-1)*Math.PI*.48;pivot.position.x=-sign*d.width/2;pivot.rotation.y=isOpen?openTarget:0;p.add(pivot);motions.push({id:`door:${d.id}`,object:pivot,property:'y',axis:'rotation',target:pivot.rotation.y,openTarget});
   box(sign*d.width/2,h/2,0,d.width-.045,h-.025,d.id==='safe'?.065:.035,d.id==='entry'?entryDoorFinish:d.material==='steel'?surface('door',d.id==='service-exit'?'#3e4946':'#b4bbb2',{metalness:.25}):doorFinish,pivot,data,.009);for(const side of [-1,1]){box(sign*(d.width-.12),h*.48,side*.025,.028,.16,.012,steel,pivot,data);box(sign*(d.width-.15),h*.48+.012,side*.047,.105,.018,.022,steel,pivot,data);}
  }
 }
 // Curtain outside the glass; the photographed dark access cover faces inside.
 // The kitchen's cover is concealed by the observed HVAC bulkhead.
 for(const s of SHUTTERS){const o=s.opening,w=WALLS.find(w=>w.id===o.wallId),height=Math.min(o.height,wallHeight-o.sill);if(height<=0)continue;
  const [x,z]=openingPoint(o),p=new THREE.Group(),outside=o.vertical?-1:1;p.position.set(x+(o.vertical?outside*(w.thickness/2+.04):0),o.sill,z+(o.vertical?0:outside*(w.thickness/2+.04)));p.rotation.y=o.vertical?Math.PI/2:0;p.userData.shutterId=s.id;group.add(p);shutterGroups.set(s.id,p);
  const data={action:'shutter',shutterId:s.id},shutterMat=mat('#b9bcb0',{metalness:.35,roughness:.65});
  const cover=SHUTTER_COVERS[s.id];if(cover){
   const c=new THREE.Group(),inside=o.vertical?1:-1;c.position.set(x,o.sill,z);c.rotation.y=o.vertical?Math.PI/2:0;c.userData={shutterCoverId:s.id,source:'site-photos',page:cover.page,dimensionsInferred:true};group.add(c);
   const zz=inside*(w.thickness/2+.026);box(0,height+cover.height/2,zz,o.width+.07,cover.height,.045,windowInk,c,data);
   box(0,height+cover.height/2,zz+inside*.025,o.width+.025,cover.height-.035,.007,mat('#404949'),c,data);
  }
  const curtain=new THREE.Group();curtain.position.y=height;curtain.scale.y=settings.closedShutters?.includes(s.id)?1:.015;p.add(curtain);motions.push({id:`shutter:${s.id}`,object:curtain,axis:'scale',property:'y',target:curtain.scale.y});
  box(0,-height/2,0,o.width-.025,height,.025,shutterMat,curtain,data);
  for(let y=.04;y<height;y+=.055)box(0,-y,.015,o.width-.028,.004,.005,ink,curtain,data);
  for(const xx of [-o.width/2,o.width/2])box(xx,height/2,0,.025,height,.04,shutterMat,p,data);
 }
 const buildingGroups=buildObservedArchitecture({group,box,cylinder,mat,resources,wallHeight});
 for(const [id,p] of buildEntranceServices({group,box,cylinder,floor,mat,resources,motions,picks,settings,mode}))buildingGroups.set(id,p);
 for(const p of buildingGroups.values())if(p.userData.pickMeshes){picks.push(...p.userData.pickMeshes);delete p.userData.pickMeshes;}
 // Room furniture is illustrative and editable through room finishes; it never
 // changes a wall, opening or the plan outline.
 const openParts=new Set(settings.openParts);
 function cabinet(f,p,wood){
  if(f.kind==='vanity'){
   const {w,d}=f,bottom=f.bottom,top=f.h-.035,h=top-bottom,body={action:'furniture',furnitureId:f.id,part:'vanity-carcass'};p.userData={...p.userData,wallHung:true,storage:f.storage,cataloguePage:f.cataloguePage};
   for(const x of [-w/2+.009,w/2-.009])box(x,bottom+h/2,0,.018,h,d,wood,p,body);
   box(0,bottom+.009,0,w-.036,.018,d,wood,p,body);box(0,bottom+h/2,-d/2+.006,w-.036,h,.012,offwhite,p,body);
   if(f.storage==='drawers')for(let i=0;i<2;i++){
    const id=`${f.id}:drawer-${i}`,drawer=new THREE.Group(),yy=top-(i+.5)*h/2,data={action:'part',partId:id,furnitureId:f.id};drawer.position.z=openParts.has(id)?.31:0;p.add(drawer);motions.push({id,object:drawer,property:'z',axis:'position',target:drawer.position.z});
    box(0,yy-.006,d/2-.003,w-.042,h/2-.018,.02,wood,drawer,data,.004);
    box(0,yy+h/4-.012,d/2-.012,w-.065,.013,.012,mat('#b6bab4'),drawer,data);
    box(0,yy+h/4-.023,d/2+.001,w-.056,.011,.014,wood,drawer,data,.003);
    box(0,yy-h/4+.025,.012,w-.08,.014,d-.06,offwhite,drawer,data);
    for(const x of [-w/2+.035,w/2-.035])box(x,yy,.01,.014,h/2-.06,d-.07,offwhite,drawer,data);
   }else{
    box(0,bottom+h*.46,0,w-.045,.018,d-.05,offwhite,p,body);
    for(let i=0;i<2;i++){
     const id=`${f.id}:${i?'right':'left'}`,pivot=new THREE.Group(),sign=i?-1:1,data={action:'part',partId:id,furnitureId:f.id};pivot.position.set(i?w/2-.02:-w/2+.02,bottom,d/2-.003);pivot.rotation.y=openParts.has(id)?(i?1:-1)*Math.PI*.46:0;p.add(pivot);motions.push({id,object:pivot,property:'y',axis:'rotation',target:pivot.rotation.y});
     box(sign*(w/4-.01),h/2,0,w/2-.024,h-.012,.02,wood,pivot,data,.004);box(sign*(w/2-.05),h-.028,-.006,.035,.025,.012,mat('#b6bab4'),pivot,data);
    }
   }
   return;
  }
  const w=f.w,d=f.d,h=f.h,isWardrobe=['wardrobe','office-cabinet'].includes(f.kind),low=isWardrobe?.42:0;
  for(const x of [-w/2+.012,w/2-.012])box(x,h/2,0,.024,h,d,wood,p,{action:'furniture',furnitureId:f.id});
  box(0,h/2,-d/2+.012,w-.045,h,.024,offwhite,p);for(const yy of [.035,h-.012])box(0,yy,0,w,.024,d,wood,p);
  if(f.kind==='console'){
   for(let i=0;i<3;i++){const key=`${f.id}:drawer-${i}`,drawer=new THREE.Group();drawer.position.set(-w/2+w/6+i*w/3,0,openParts.has(key)?.34:0);p.add(drawer);motions.push({id:key,object:drawer,property:'z',axis:'position',target:drawer.position.z});const data={action:'part',partId:key,furnitureId:f.id};box(0,h/2,d/2,w/3-.01,h-.06,.025,wood,drawer,data);box(0,.08,0,w/3-.06,.025,d-.07,offwhite,drawer,data);for(const xx of [-w/6+.035,w/6-.035])box(xx,h/2,0,.018,h-.12,d-.05,offwhite,drawer,data);}
   return;
  }
  for(let i=0;i<2;i++){const key=`${f.id}:${i?'right':'left'}`,pivot=new THREE.Group();pivot.position.set(i?w/2:-w/2,low,d/2);pivot.rotation.y=openParts.has(key)?(i?1:-1)*Math.PI*.46:0;p.add(pivot);motions.push({id:key,object:pivot,property:'y',axis:'rotation',target:pivot.rotation.y});const sign=i?-1:1,data={action:'part',partId:key,furnitureId:f.id};box(sign*w/4,(h-low)/2,0,w/2-.006,h-low-.02,.022,wood,pivot,data);box(sign*(w/2-.07),(h-low)/2,.025,.012,.2,.02,ink,pivot,data);}
  if(isWardrobe){
   box(0,.45,0,w-.06,.018,d-.05,offwhite,p);box(0,(h+.45)/2,0,.018,h-.45,d-.05,wood,p);
   for(const y of [.95,1.4,1.85])box(w/4,y,0,w/2-.04,.018,d-.05,offwhite,p);
   const rail=cylinder(-w/4,h-.25,0,.013,w/2-.08,steel,p);rail.rotation.z=Math.PI/2;
   for(let i=0;i<5;i++){const x=-w/2+.1+(w/2-.2)*i/4;if(f.kind==='office-cabinet')box(x,1.03,.03,.08,.32,.27,i%2?linen:clay,p,null,.005);else box(x,h-.63,.015,.065,.57,.33,i%2?linen:clay,p,null,.015);}
   for(let i=0;i<2;i++){const key=`${f.id}:drawer-${i}`,drawer=new THREE.Group();drawer.position.z=openParts.has(key)?.36:0;p.add(drawer);motions.push({id:key,object:drawer,property:'z',axis:'position',target:drawer.position.z});const y=.32-i*.2,data={action:'part',partId:key,furnitureId:f.id};box(0,y,d/2,w-.05,.185,.024,wood,drawer,data);box(0,y-.07,0,w-.07,.018,d-.03,offwhite,drawer,data);for(const xx of [-w/2+.045,w/2-.045])box(xx,y,0,.02,.16,d-.03,wood,drawer,data);}
  }else box(0,h/2,0,w-.05,.018,d-.05,offwhite,p);
 }
 function tap(p,x,y,z){const stem=cylinder(x,y+.08,z,.02,.16,steel,p);stem.userData.productId='basin-tap';cylinder(x,y+.009,z,.03,.018,steel,p);const lever=box(x,y+.171,z+.025,.026,.009,.095,steel,p,null,.003);lever.userData.productId='basin-tap';const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,y+.13,z),new THREE.Vector3(x,y+.14,z+.06),new THREE.Vector3(x,y+.12,z+.115)]),geo=new THREE.TubeGeometry(curve,16,.012,10,false);resources.push(geo);const spout=new THREE.Mesh(geo,steel);spout.userData={productId:'basin-tap',variant:'medium-chrome',dimensionsInferred:true};p.add(spout);}
 function mirror(p,w,y,z){box(0,y,z,w,.68,.025,steel,p);const m=box(0,y,z+.015,w-.025,.655,.008,mat('#9bb1a9',{metalness:.35,roughness:.12}),p);m.userData.productId='mirror';}
 function bathFittings(p,x,z,overhead){
  // Four-way family is known, exact cover is unresolved; keep ordered chrome.
  const y=1.05,railX=x+.17;cylinder(railX,1.39,z+.055,.012,.75,steel,p).userData.productId='hand-shower';
  for(const h of [1.03,1.75]){const mount=cylinder(railX,h,z+.025,.023,.05,steel,p);mount.rotation.x=Math.PI/2;mount.userData.productId='hand-shower';}
  const mix=cylinder(x,y,z+.018,.065,.025,steel,p);mix.rotation.x=Math.PI/2;mix.userData={productId:'bath-mixer',variantInferred:true};box(x,y-.025,z+.045,.022,.07,.018,steel,p,null,.004);
  const diverter=cylinder(x,y+.047,z+.044,.014,.027,steel,p);diverter.rotation.x=Math.PI/2;diverter.userData={productId:'bath-mixer',part:'four-way-diverter'};
  const outlet=cylinder(x+.11,y-.13,z+.026,.025,.035,steel,p);outlet.rotation.x=Math.PI/2;outlet.userData.productId='hand-shower';
  box(railX,1.53,z+.071,.045,.032,.06,steel,p,null,.006);const hand=cylinder(railX,1.64,z+.115,.035,.015,steel,p);hand.rotation.x=Math.PI/2+.15;box(railX,1.55,z+.105,.02,.15,.025,steel,p,null,.007);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x+.11,y-.13,z+.055),new THREE.Vector3(x+.16,.64,z+.11),new THREE.Vector3(railX+.15,.93,z+.17),new THREE.Vector3(railX,1.48,z+.11)]),geo=new THREE.TubeGeometry(curve,32,.006,8,false);resources.push(geo);const hose=new THREE.Mesh(geo,steel);hose.userData.productId='hand-shower';p.add(hose);
  if(overhead){const arm=cylinder(x,2.09,z+.175,.012,.35,steel,p);arm.rotation.x=Math.PI/2;arm.userData={productId:'shower-head',part:'round-wall-arm',length:.35,cataloguePage:38};cylinder(x,2.06,z+.35,.012,.06,steel,p);const head=cylinder(x,2.025,z+.35,.1,.015,steel,p);head.userData={productId:'shower-head',diameter:.2,finish:'chrome',source:'harash'};}
  else box(x,y-.15,z+.12,.10,.024,.21,steel,p,null,.006);
 }
 function furnish(f){const p=new THREE.Group();p.position.set(f.position[0],0,f.position[1]);p.rotation.y=f.rotation;p.userData.furnitureId=f.id;group.add(p);furnitureGroups.set(f.id,p);const choice=settings.rooms[f.roomId]?.wood,wood=f.ordered?surface('paint','#f0f0e8'):choice==='white'?offwhite:choice==='dark'?surface('wood','#625d4e'):oak,data={action:'furniture',furnitureId:f.id};
  if(['wardrobe','office-cabinet','console','vanity'].includes(f.kind)){
   cabinet(f,p,wood);if(f.kind==='console'){box(0,1.08,-.1,1.45,.85,.035,dark,p,data,.015);box(0,.65,0,.06,.3,.06,steel,p);}
   if(f.kind==='vanity'){p.add(createCeramicBowl(resources,{productId:f.id,w:f.w,d:f.d,top:f.h,depth:.14,innerW:.51,innerD:.285,innerZ:.036,radius:.009,innerRadius:.035,lowerScale:.94,tapHole:[0,-f.d*.34]}));tap(p,0,f.h,-f.d*.34);mirror(p,.8,1.55,-f.d/2-.006);}

  }else if(f.kind==='bed'){
   if(f.userDimensions)p.scale.y=f.h/FURNITURE.find(item=>item.id===f.id).h;
   box(0,.19,0,f.w+.06,.3,f.d+.06,wood,p,data,.025);const mattress=box(0,.39,0,f.w,.2,f.d,surface('fabric','#f0f0e8'),p,data,.05);mattress.userData.part='mattress';mattress.userData.furnitureId=f.id;box(0,.52,-f.d/2+.25,f.w*.82,.16,.4,linen,p,null,.045);box(0,.51,.28,f.w+.02,.045,f.d*.61,surface('fabric',f.roomId==='master'?'#a7ad95':'#b2bdb1'),p,null,.01);const headH=f.headboardHeight||.85;box(0,.185+headH/2,-f.d/2,f.w+.08,headH,.07,wood,p,data,.02);
   for(const x of [-f.w/2-.21,f.w/2+.21])if(f.w>1.3&&f.nightstands!==false){box(x,.26,-f.d/2+.27,.35,.5,.4,wood,p,data,.01);cylinder(x,.57,-f.d/2+.27,.09,.1,offwhite,p);}
  }else if(f.kind==='sofa'){
   box(0,.12,0,f.w-.12,.14,f.d-.1,wood,p,data,.025);
   const fabric=surface('fabric',f.roomId==='garden'?'#a3ad94':'#c6c6b3');box(0,.25,0,f.w,.35,f.d,fabric,p,data,.08);box(0,.6,-f.d/2+.12,f.w,.65,.24,fabric,p,data,.06);for(const x of [-f.w/2+.1,f.w/2-.1])box(x,.48,0,.2,.52,f.d,fabric,p,data,.05);for(const x of [-f.w/4,f.w/4])box(x,.48,.05,f.w/2-.2,.18,f.d-.23,linen,p,null,.06);
  }else if(f.kind==='coffee'||f.kind==='desk'||f.kind==='dining'){
   box(0,f.h,0,f.w,.06,f.d,wood,p,data,.018);for(const x of [-f.w/2+.08,f.w/2-.08])for(const z of [-f.d/2+.08,f.d/2-.08])box(x,f.h/2,z,.045,f.h,.045,ink,p);
   if(f.kind==='desk'){box(0,f.h+.25,-f.d*.24,.55,.36,.03,dark,p,data,.01);box(0,f.h+.08,-.05,.03,.16,.03,steel,p);box(0,f.h+.04,.13,.36,.018,.12,ink,p);}
   if(f.kind==='dining'){for(const z of [-f.d/2-.37,f.d/2+.37])for(const x of [-f.w*.28,f.w*.28]){box(x,.45,z,.42,.065,.43,offwhite,p,null,.035);box(x,.69,z+(z>0?.18:-.18),.42,.45,.045,wood,p,null,.018);for(const dx of [-.15,.15])box(x+dx,.23,z,.035,.46,.035,wood,p);}}
  }else if(f.kind==='wall-toilet'){
   p.add(createSkyToilet(resources,f));box(0,.33,-f.d/2+.032,.27,.24,.064,white,p,data,.014);box(0,1.02,-f.d/2-.008,.21,.14,.014,steel,p,data,.008);for(const [x,r] of [[-.035,.026],[.04,.019]]){const b=cylinder(x,1.02,-f.d/2+.004,r,.009,offwhite,p);b.rotation.x=Math.PI/2;}
  }else if(f.kind==='wall-basin'){
   p.add(createCeramicBowl(resources,{productId:'guest-basin',w:f.w,d:f.d,top:f.h,depth:.115,innerW:f.w-.045,innerD:f.d-.10,innerZ:.034,radius:.009,innerRadius:.018,lowerScale:.94,tapHole:[0,-f.d*.34]}));tap(p,0,f.h,-f.d*.34);cylinder(0,f.h-.22,.015,.017,.2,steel,p,data);cylinder(0,f.h-.29,.015,.025,.08,steel,p,data);box(0,f.h-.29,-.06,.034,.035,.15,steel,p);
  }else if(f.kind==='tub'){
   p.add(createCeramicBowl(resources,{productId:'tub',w:f.w,d:f.d,top:f.h,depth:.43,innerW:f.w-.16,innerD:f.d-.14,innerZ:0,radius:.014,innerRadius:.03,lowerScale:.98,drainX:-f.w/2+.22,drainZ:0}));for(const z of [-f.d/2+.013,f.d/2-.013])box(0,.08,z,f.w-.025,.14,.026,white,p,data,.006);bathFittings(p,-f.w/2+.25,-f.d/2-.012,false);
  }else if(f.kind==='shower'){
   const patch=floor([[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4]],surface('cement','#999d99',{productId:'shower-floor'}),.012,p);patch.userData.productId='shower-floor';patch.userData.tile=[.33,.3];bathFittings(p,-.18,-f.d/2-.01,true);
  }else if(f.kind==='tv'){
   box(0,1.5,0,f.w,f.h,f.d,dark,p,data,.012);box(0,1.5,f.d/2+.001,f.w-.035,f.h-.035,.003,mat('#273a35',{roughness:.2}),p,data);box(0,1.5,-f.d/2,.18,.16,.04,steel,p);
  }else if(f.kind==='office-chair'){
   box(0,.5,0,.5,.09,.49,dark,p,data,.045);box(0,.82,-.21,.5,.6,.08,dark,p,data,.05);cylinder(0,.28,0,.03,.42,steel,p);for(let i=0;i<5;i++){const leg=new THREE.Group();leg.rotation.y=i*Math.PI*2/5;p.add(leg);box(0,.09,.13,.035,.035,.28,steel,leg);const wheel=cylinder(0,.055,.27,.035,.035,dark,leg);wheel.rotation.z=Math.PI/2;}
  }else if(f.kind==='outdoor-kitchen'){
   buildOutdoorKitchen({f,parent:p,box,cylinder,mat,resources,motions,picks,settings});
  }else if(f.kind==='washer'){
   box(0,.43,0,.59,.85,.59,white,p,data,.015);box(0,.73,.303,.54,.12,.012,mat('#d8dcd7'),p);const m=cylinder(0,.39,.306,.205,.018,dark,p);m.rotation.x=Math.PI/2;const n=cylinder(0,.39,.321,.145,.012,glass,p);n.rotation.x=Math.PI/2;box(.12,.75,.32,.13,.045,.008,dark,p);
  }
  p.traverse(o=>{if(o.isMesh&&!o.userData.action){o.userData={...o.userData,action:'furniture',furnitureId:f.id};picks.push(o);}});
 }
 if(settings.furniture)furnitureForSettings(settings).forEach(furnish);
 // Kitchen proxy preserves the exact cabinet chains and island from the existing
 // simulator. Its dedicated route retains the complete detailed mechanisms.
 const kg=new THREE.Group();kg.position.set(KITCHEN_ANCHOR[0],0,KITCHEN_ANCHOR[1]);kg.rotation.y=Math.PI;group.add(kg);
 const baseChoice=MATERIALS.find(m=>m.id===kitchenSettings.base),upperChoice=MATERIALS.find(m=>m.id===kitchenSettings.upper),baseMat=surface(baseChoice?.wood?'wood':'paint',baseChoice?.color||'#e4e1d9'),upMat=surface(upperChoice?.wood?'wood':'paint',upperChoice?.color||'#e4e1d9'),topMat=surface('stone',STONES.find(m=>m.id===kitchenSettings.stone)?.color||'#d5cbb7'),kitchenData={action:'kitchen',roomId:'kitchen'};
 for(const m of LONG){
  if(m.type==='corner'||m.type==='panel')continue;
  const x=(m.x+m.w/2)/1000,w=m.w/1000,h=m.type==='oven'?2.4:.874;
  if(m.type==='sink'){
   for(const sign of [-1,1])box(x+sign*(w/2-.009),.497,.3,.018,.754,.59,baseMat,kg,kitchenData);
   box(x,.14,.3,w,.018,.59,baseMat,kg,kitchenData);box(x,.497,.012,w,.754,.012,baseMat,kg,kitchenData);
   for(const sign of [-1,1])box(x+sign*w/4,.497,.6,w/2-.004,.75,.018,baseMat,kg,kitchenData);
   const shape=new THREE.Shape();shape.moveTo(x-w/2,0);shape.lineTo(x+w/2,0);shape.lineTo(x+w/2,.62);shape.lineTo(x-w/2,.62);shape.closePath();shape.holes.push(vegasCutoutPath(x,SINK.centerZ/1000,.001));
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:.038,bevelEnabled:false,curveSegments:12});geometry.rotateX(Math.PI/2);geometry.translate(0,.912,0);metricSurfaceUVs(geometry);resources.push(geometry);const top=new THREE.Mesh(geometry,topMat);top.userData={...kitchenData,part:'home-sink-worktop'};top.castShadow=top.receiveShadow=true;kg.add(top);picks.push(top);
   const vegas=createVegasSink(resources);vegas.position.set(x,.912,SINK.centerZ/1000);vegas.traverse(o=>{if(o.isMesh){o.userData={...o.userData,...kitchenData};picks.push(o);}});kg.add(vegas);
  }else{box(x,h/2,.3,w-.006,h,.6,baseMat,kg,kitchenData);if(m.type!=='oven')box(x,.893,.31,w,.038,.62,topMat,kg,kitchenData);}
  if(['drawers','hob'].includes(m.type))for(const y of [.32,.61])box(x,y,.604,w-.025,.006,.008,dark,kg);
  if(m.type==='oven')box(x,1.16,.606,.55,.58,.025,dark,kg,kitchenData);
 }
 for(const m of SHORT){if(m.type==='corner')continue;const h=['fridge','pantry'].includes(m.type)?2.4:.874;box(.3,h/2,(m.z+m.w/2)/1000,.6,h,m.w/1000-.006,m.type==='fridge'?steel:baseMat,kg,kitchenData);if(m.type==='fridge'){box(.61,1.1,(m.z+m.w/2)/1000,.02,1.5,.012,dark,kg,kitchenData);}}
 for(const m of UPPERS)box((m.x+m.w/2)/1000,1.95,.16,m.w/1000-.008,.9,.32,upMat,kg,kitchenData);
 box(3.88,.92,.31,.812,.012,.52,dark,kg,kitchenData);const kitchenTap=createVeredKitchenTap(resources);kitchenTap.position.set(1.91,.912,SINK.tapZ/1000);kitchenTap.traverse(o=>{if(o.isMesh){o.userData={...o.userData,...kitchenData};picks.push(o);}});kg.add(kitchenTap);
 box((ISLAND.x+1220)/1000,.45,(ISLAND.z+295)/1000,2.4,.874,.59,baseMat,kg,kitchenData);box((ISLAND.x+1220)/1000,.893,(ISLAND.z+450)/1000,2.44,.038,.9,topMat,kg,kitchenData);
 for(let i=0;i<4;i++){const x=(ISLAND.x+340+i*585)/1000,z=(ISLAND.z+1160)/1000;cylinder(x,.65,z,.17,.05,oak,kg);cylinder(x,.32,z,.025,.62,ink,kg);cylinder(x,.025,z,.17,.04,ink,kg);}
 for(const [id,p] of buildElectricalPoints({group,box,cylinder,mat,resources,settings}))gardenGroups.set(id,p);
 for(const [id,p] of buildWaterPoints({group,box,cylinder,mat,resources,settings,points:WATER_LAYOUT.points}))gardenGroups.set(id,p);
 if(['building','unit','walk'].includes(mode)&&!wallCutaway)for(const w of CONSTRUCTION_WALLS.filter(w=>w.external)){
  const v=Math.abs(w.a[0]-w.b[0])<.001,h=3.1-HOUSE.height;
  box((w.a[0]+w.b[0])/2,HOUSE.height+h/2,(w.a[1]+w.b[1])/2,v?w.thickness:Math.abs(w.b[0]-w.a[0]),h,v?Math.abs(w.b[1]-w.a[1]):w.thickness,surface('limestone','#d9d2c5'),group,{part:'building-apartment-top-band'});
 }
 const buildingContext=context?buildBuildingContext({group,resources,settings,mode,picks,apartmentOutline:HOUSE_OUTLINE}):{group:null,floors:new Map()};
 buildSecurityCameras({group,resources,settings,picks});
 buildOwnerCars({group,resources});
 const updateDaylight=daylight?buildDaylight({group,settings,resources,center:BUILDING_CENTER,radius:Math.max(BUILDING_BOUNDS.maxX-BUILDING_BOUNDS.minX,BUILDING_BOUNDS.maxZ-BUILDING_BOUNDS.minZ)*.8,distance:100}):()=>{};
 for(const [id,p] of buildLightingPoints({group,box,cylinder,mat,resources,settings,points:LIGHTING_LAYOUT.points,picks,selectedRoom}))gardenGroups.set(id,p);
 // One shadow budget for the apartment and common rooms together on mobile.
 group.updateMatrixWorld(true);
 const focusXZ=commonSpace(settings.tourDestination)?commonSpace(settings.tourDestination).walk:(ROOMS.find(r=>r.id===selectedRoom)?.walk||[3,8]),shadowCandidates=[];
 group.traverse(o=>{if(o.isLight&&o.userData.fixtureLight&&o.castShadow)shadowCandidates.push(o);});
 shadowCandidates.sort((a,b)=>{const pa=a.getWorldPosition(new THREE.Vector3()),pb=b.getWorldPosition(new THREE.Vector3());return Math.hypot(pa.x-focusXZ[0],pa.z-focusXZ[1])-Math.hypot(pb.x-focusXZ[0],pb.z-focusXZ[1]);});
 shadowCandidates.slice(6).forEach(light=>{light.castShadow=false;});
 let disposed=false;return {group,resources,picks,motions,roomGroups,furnitureGroups,doorGroups,shutterGroups,buildingGroups,gardenGroups,buildingContext,wallHeight,updateDaylight,dispose(){if(disposed)return;disposed=true;group.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.dispose();});for(const r of new Set(resources)){r.dispose?.();if(r.isTexture&&r.source)r.source.data=null;}resources.length=picks.length=motions.length=0;for(const map of [roomGroups,furnitureGroups,doorGroups,shutterGroups,buildingGroups,gardenGroups])map.clear();group.removeFromParent();group.clear();}};
}
