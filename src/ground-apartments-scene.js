import {splitWallReturnGeometry} from './wall-return-geometry.mjs';
import {buildBaseKitchenDetail} from './base-kitchen-detail.mjs';
import {FACADE_COLOR,FACADE_ROUGHNESS} from './facade-finish.mjs';
import {doorFrameGeometry} from './door-frame.mjs';
import * as THREE from 'three';
import {facadeSkinRows,appendFacadeVeneers} from './facade-veneers.mjs';
import {createArchitecturalGlass} from './architectural-glass.mjs';
import {installWallCavity,installStoneCourses,installFloorCourses} from './building-finish-shaders.mjs';
import {groundBaseProfile,groundTransform,groundPoint,groundBuildingContains,groundBaseServices,baseOpeningPosition,GROUND_KITCHEN} from './ground-apartments.mjs';
import {INTERIOR_WHITE} from './interior-finish.mjs';
import {point,DOORS,HOUSE_OUTLINE,insidePolygon} from './home-model.mjs';
import {wallExteriorFaces,wallFaceMaterials} from './wall-face-finishes.mjs';
import {markPublicDoor} from './public-door-motion.mjs';
import {createSurfacePalette,metricSurfaceUVs} from './surface-materials.mjs';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';
import {buildObservedArchitecture} from './home-observed-scene.js';
import {buildElectricalPoints,buildWaterPoints} from './home-electrical-scene.js';
import {createCeramicBowl} from './sanitary-fixtures.js';
import {lightOutput} from './lighting-controls.mjs';
import {CEILING_COLOR,CEILING_MATERIAL} from './ceiling-finish.mjs';

// One shared base geometry, three rigid placements. Gardens, ordered products,
// movable owner furniture and the owner's kitchen never enter this builder.
export function buildGroundApartments({root,resources,picks,settings,cut=false,mode='building',floorMaterial=null,interactiveDoors=false,units=[1,2,3]}){
 const profile=groundBaseProfile(),template=new THREE.Group(),h=cut?.85:profile.height,mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,...extra});resources.push(m);return m;},surface=createSurfacePalette(resources);
 const paint=surface('plaster',INTERIOR_WHITE),ceilingFinish=surface('plaster',CEILING_COLOR,CEILING_MATERIAL),stone=surface('limestone',FACADE_COLOR,{roughness:FACADE_ROUGHNESS}),neutralFloor=floorMaterial||surface('porcelain','#d0cdc5'),wetFloor=surface('cement','#c4c3bd'),white=mat('#f0f0e9'),metal=mat('#343e3d',{metalness:.35,roughness:.4}),glass=mat('#acc2ca',{transparent:true,opacity:.28,depthWrite:false,roughness:.18}),wood=surface('paint','#dedbd1');
 installWallCavity(paint,{height:profile.height});installStoneCourses(stone);if(!floorMaterial)installFloorCourses(neutralFloor);installFloorCourses(wetFloor,{tile:[.3,.3],joint:.003});
 const showerGlass=createArchitecturalGlass(resources,{mobile:settings.xr===true||globalThis.matchMedia?.('(pointer: coarse)').matches===true});
 const innerDoor=surface('door','#d8d0c3'),entryDoor=surface('door','#536c66');for(const material of [innerDoor,entryDoor])installBuildingSurfaceUVs(material);
 for(const material of [paint,ceilingFinish,stone,neutralFloor,wetFloor,wood])installBuildingSurfaceUVs(material);
 const cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);const facadeCube=splitWallReturnGeometry(cube);resources.push(facadeCube);const verticalFacadeCube=splitWallReturnGeometry(cube,{vertical:true});resources.push(verticalFacadeCube);let interactive=false;
 const box=(x,y,z,w,hh,d,m,parent=template,data=null)=>{const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,hh,d);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={...(data||{}),baseline:true};parent.add(mesh);if(interactive&&data?.action)picks.push(mesh);return mesh;};
 const cylinder=(x,y,z,r,hh,m,parent=template,data=null)=>{const g=new THREE.CylinderGeometry(r,r,hh,20);resources.push(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.userData={...(data||{}),baseline:true};mesh.castShadow=true;parent.add(mesh);if(interactive&&data?.action)picks.push(mesh);return mesh;};
 const polygon=(poly,y,m,parent=template,depth=0)=>{const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shape);geo.rotateX(Math.PI/2);metricSurfaceUVs(geo);if(!depth)m.side=THREE.DoubleSide;resources.push(geo);const mesh=new THREE.Mesh(geo,m);mesh.position.y=y;mesh.receiveShadow=true;mesh.castShadow=!!depth;parent.add(mesh);return mesh;};
 for(const room of profile.rooms){const floor=polygon(room.polygon,.012,['bathroom','wc','utility'].includes(room.kind)?wetFloor:neutralFloor);floor.userData={part:'ground-base-room',roomId:room.id,baseline:true};if(!cut&&mode==='walk'){const ceiling=polygon(room.polygon,profile.height,ceilingFinish);ceiling.userData={part:'ground-base-ceiling',roomId:room.id,baseline:true};}}
 const claddingRows=[],beltRows=[],beltMaterial=surface('cement','#b1aba1',{roughness:.95});
 for(const wall of profile.walls){
  const vertical=Math.abs(wall.a[0]-wall.b[0])<.001,lo=wall.a[vertical?1:0],hi=wall.b[vertical?1:0],holes=[...profile.doors,...profile.windows].filter(o=>o.wallId===wall.id).sort((a,b)=>a.start-b.start);
  const segment=(a,b,bottom,hh)=>{if(b-a<.002||hh<.002)return;const centre=vertical?[wall.a[0],(a+b)/2]:[(a+b)/2,wall.a[1]],faces=wallExteriorFaces({margin:.24,centre,normal:vertical?[1,0]:[0,1],thickness:wall.thickness,inside:p=>insidePolygon(p,HOUSE_OUTLINE),positiveFace:vertical?0:4,negativeFace:vertical?1:5}),material=faces?wallFaceMaterials(paint,stone,faces):paint;const m=box(centre[0],bottom+hh/2,centre[1],vertical?wall.thickness:b-a,hh,vertical?b-a:wall.thickness,material);m.geometry=vertical?verticalFacadeCube:facadeCube;m.userData={part:'ground-base-wall',baseWallId:wall.id,facadeWall:true,blockPick:true,baseline:true};if(faces){const skin=facadeSkinRows([centre[0],bottom+hh/2,centre[1],vertical?wall.thickness:b-a,hh,vertical?b-a:wall.thickness],faces,{vertical,positiveFace:vertical?0:4,negativeFace:vertical?1:5});claddingRows.push(...skin.skin);beltRows.push(...skin.belt);}};
  let cursor=lo;for(const o of holes){segment(cursor,o.start,0,h);if(o.sill)segment(o.start,o.end,0,Math.min(h,o.sill));if(h>o.sill+o.height)segment(o.start,o.end,o.sill+o.height,h-o.sill-o.height);cursor=o.end;}segment(cursor,hi,0,h);
  if(!cut&&wall.external)segment(lo,hi,profile.height,3.1-profile.height);
 }

 for(const o of [...profile.windows,...profile.doors,...(interactiveDoors?DOORS.filter(d=>d.hostDoorId):[])]){
  const y=o.sill||0,hh=Math.min(o.height,h-y);if(hh<=0)continue;const [x,z]=baseOpeningPosition(o),p=new THREE.Group();p.position.set(x,y,z);p.rotation.y=o.vertical?Math.PI/2:0;template.add(p);p.userData={part:'ground-base-opening',baseOpeningId:o.id};
  if(interactiveDoors&&o.type!=='window'){
   p.rotation.y=o.vertical?-Math.PI/2:0;p.position.x+=o.vertical?(o.faceOffset||0):0;p.position.z+=o.vertical?0:(o.faceOffset||0);
   const id='base:'+o.id,kind=o.id==='entry'?'entry':o.type==='slider'?'glazed':'interior',data={action:'district-door',doorId:id};
   if(!o.hostDoorId){const geometry=doorFrameGeometry({width:o.width,height:hh,depth:profile.walls.find(w=>w.id===o.wallId)?.thickness||.12,cut});resources.push(geometry);const frame=new THREE.Mesh(geometry,wood);frame.castShadow=frame.receiveShadow=true;frame.userData={part:'door-frame',frameProfile:'stepped',tourNonPhysical:true,baseline:true};p.add(frame);}
   if(o.type==='slider'){
    for(let i=0;i<2;i++){const leaf=new THREE.Group();leaf.position.x=o.width/4;p.add(leaf);const pane=box(0,hh/2,(i?1:-1)*.012,o.width/2-.035,hh-.035,.008,glass,leaf,data);pane.castShadow=false;for(const xx of [-o.width/4,o.width/4])box(xx,hh/2,0,.027,hh,.045,metal,leaf,data);for(const yy of [.015,hh-.015])box(0,yy,0,o.width/2,.027,.045,metal,leaf,data);box(-o.width/4+.06,hh*.48,.035,.02,.18,.025,metal,leaf,data);if(!i)markPublicDoor(leaf,{id,axis:'position',property:'x',closed:-o.width/4,open:o.width/4,kind});}
   }else{
    const sign=o.hinge==='end'?-1:1,pivot=new THREE.Group(),angle=(o.swing||-1)*Math.PI*.48;pivot.position.x=-sign*o.width/2;pivot.rotation.y=angle;p.add(pivot);
    box(sign*o.width/2,hh/2,0,o.width-.045,hh-.025,.04,o.id==='entry'?entryDoor:innerDoor,pivot,data);
    for(const side of [-1,1])box(sign*(o.width-.13),hh*.48,side*.041,.10,.022,.025,metal,pivot,data);
    markPublicDoor(pivot,{id,open:angle,kind});
   }
   continue;
  }
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
  if(f.kind==='wc'){const bowl=createCeramicBowl(resources,{productId:null,w:f.w,d:f.d,top:.424,depth:.20,innerW:f.w-.10,innerD:f.d-.15,innerZ:.03,radius:.13,innerRadius:.1,lowerScale:.75,drainZ:.03});bowl.traverse(o=>{o.userData={...o.userData,productId:null,shapeBasis:'source-plan-footprint',baseline:true,detailsInferred:true};});p.add(bowl);box(0,.2,-.1,.24,.3,.28,white,p);box(0,.46,-.02,f.w-.025,.025,f.d-.06,bowl.children[0].material,p);}
  else if(f.kind==='tub'||f.kind==='basin'){
   const tub=f.kind==='tub',bowl=createCeramicBowl(resources,{productId:null,w:f.w,d:f.d,top:f.h,depth:tub?.37:.14,innerW:Math.max(.15,f.w-(tub?.15:.10)),innerD:Math.max(.13,f.d-(tub?.16:.11)),innerZ:0,radius:tub?.035:.06,innerRadius:tub?.06:.045,drainZ:tub?-f.d*.30:0});
   bowl.traverse(o=>{o.userData={...o.userData,productId:null,shapeBasis:'source-plan-footprint',baseline:true,detailsInferred:true};});p.add(bowl);
   if(tub){box(0,(f.h-.06)/2,f.d/2-.025,f.w,f.h-.06,.05,white,p);for(const x of [-f.w/2+.025,f.w/2-.025])box(x,(f.h-.06)/2,0,.05,f.h-.06,f.d,white,p);}
   else{box(0,f.h+.11,-f.d/2+.04,.025,.22,.025,metal,p);box(0,f.h+.21,-f.d/2+.095,.025,.025,.13,metal,p);}
  }
  else if(f.kind==='shower'){box(0,.025,0,f.w,.045,f.d,wetFloor,p);if(!cut)box(f.w/2-.02,1,0,.012,2,f.d,showerGlass,p);}
  else if(f.kind==='washer'){box(0,f.h/2,0,f.w,f.h,f.d,white,p);const door=cylinder(0,.4,f.d/2+.012,.19,.018,metal,p);door.rotation.x=Math.PI/2;}
 }
 if(settings.furniture!==false){
  const p=new THREE.Group();p.userData={part:'ground-base-kitchen',source:'house-plan',page:1,proposed:true};template.add(p);
  buildBaseKitchenDetail({parent:p,box,polygon,cylinder,surface,mat,point});
 }
 buildObservedArchitecture({group:template,box,cylinder,mat,resources,wallHeight:h});
 const groups=new Map();
 for(const unit of units){
  const node=template.clone(true),t=groundTransform(unit),[a,b,c,d]=t.matrix;
  node.matrixAutoUpdate=false;node.matrix.set(a,0,b,t.offset[0],0,1,0,0,c,0,d,t.offset[1],0,0,0,1);node.name=`garden-apartment-${unit}-base`;node.userData={part:'ground-base-apartment',unit,derived:true,reflected:t.reflected,source:'building-plan',page:3};root.add(node);groups.set(unit,node);
  node.traverse(o=>{o.userData={...o.userData,unit,derived:true,buildingFloor:0};if(o.userData.action==='district-door'){o.userData.doorId=o.userData.doorId.replace('base:',`ground:${unit}:`);if(o.userData.tourDoor){o.userData.tourDoor.id=o.userData.doorId;o.userData.tourMotionId='public:'+o.userData.doorId;}}else delete o.userData.action;delete o.userData.buildingId;delete o.userData.pickMeshes;if(o.userData.blockPick)picks.push(o);});
  // Recompute each placed shell: party walls have plaster on both sides and
  // never receive a stone veneer protruding into the adjacent apartment.
  const skins=[],belts=[];node.traverse(o=>{
   if(!o.userData.facadeWall)return;
   const vertical=o.scale.x<o.scale.z,centre=[o.position.x,o.position.z],row=[o.position.x,o.position.y,o.position.z,o.scale.x,o.scale.y,o.scale.z];
   const faces=wallExteriorFaces({margin:.24,centre,normal:vertical?[1,0]:[0,1],thickness:vertical?o.scale.x:o.scale.z,length:vertical?o.scale.z:o.scale.x,splitReturns:true,inside:p=>groundBuildingContains(groundPoint(unit,p)),positiveFace:vertical?0:4,negativeFace:vertical?1:5});
   o.material=wallFaceMaterials(paint,stone,faces);const rows=facadeSkinRows(row,faces,{vertical,positiveFace:vertical?0:4,negativeFace:vertical?1:5});skins.push(...rows.skin);belts.push(...rows.belt);
  });
  appendFacadeVeneers(node,skins,stone,resources,{geometry:cube,part:'ground-exterior-cladding'});appendFacadeVeneers(node,belts,beltMaterial,resources,{geometry:cube,part:'garden-storey-separation'});
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
