import {buildLightingPoints} from './home-lighting-scene.js';
import {KITCHEN_LIGHTING_POINTS} from './kitchen-lighting.mjs';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ROOM,LONG,SHORT,UPPERS,ISLAND,ISLAND_UNITS,WINDOW,MATERIALS,STONES } from './model.mjs';
import {ORDER} from './specifications.mjs';
import {getOpening,normalizeOpenParts} from './openings.mjs';
import {HOB,HOOD} from './appliances.mjs';
import {createBoxinHood} from './hood.js';
import {createSurfacePalette,metricSurfaceUVs} from './surface-materials.mjs';
import {buildElectricalPoints,buildWaterPoints} from './home-electrical-scene.js';
import {KITCHEN_ELECTRICAL_POINTS,KITCHEN_WATER_POINTS} from './kitchen-electrical.mjs';
import {KITCHEN_SINK_PLUMBING} from './kitchen-plumbing.mjs';
import {SERVICE_COLORS} from './service-colors.mjs';
import {KITCHEN_SINK as SINK} from './kitchen-sink.mjs';
import {createVegasSink,vegasCutoutPath} from './sink.js';
import {createVeredKitchenTap} from './kitchen-tap.js';
import {applyKitchenVisibility,cabinetVisibility,objectVisible,opaqueMesh} from './kitchen-visibility.mjs';
import {createKitchenHvac} from './kitchen-hvac.js';
import {HVAC_PROFILE} from './hvac-profile.mjs';
const M=0.001;
export function createKitchen(settings){
 const group=new THREE.Group(); const picks=[];const resources=[];const moduleGroups=new Map();const openingObjects=new Map();
 const mat=(color,opts={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,...opts});resources.push(m);return m;};
 const b=MATERIALS.find(x=>x.id===settings.base)||MATERIALS[0],u=MATERIALS.find(x=>x.id===settings.upper)||MATERIALS[0],s=STONES.find(x=>x.id===settings.stone)||STONES[0];
 const surface=createSurfacePalette(resources);
 const base=surface(b.wood?'wood':'paint',b.color),upper=surface(u.wood?'wood':'paint',u.color),stone=surface(settings.stone==='basalt'?'basalt':'stone',s.color),carcass=surface('paint',ORDER.interiorPreview),interior=surface('paint',ORDER.interiorPreview),plinth=mat('#a1a6a1',{metalness:.55,roughness:.42}),recess=mat('#716e65'),wall=surface('plaster','#e6e3dc'),metal=mat(settings.hardware==='brass'?'#a58a59':settings.hardware==='steel'?'#a9adab':'#303731',{metalness:.75,roughness:.3}),black=mat('#202522',{roughness:.24,metalness:.25}),glass=mat('#343c3c',{metalness:.4,roughness:.12}),steel=mat('#b5b7b0',{metalness:.75,roughness:.26}),selection=mat('#698878',{transparent:true,opacity:.17,depthWrite:false});
 function box(x,y,z,w,h,d,material,id,parent=group,rounded=false){
  const geo=rounded?new RoundedBoxGeometry(w*M,h*M,d*M,2,Math.min(.004,w*M/10,h*M/10,d*M/4)):new THREE.BoxGeometry(w*M,h*M,d*M);metricSurfaceUVs(geo,[x*M,y*M,z*M]);resources.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.position.set(x*M,y*M,z*M);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(id){mesh.userData.id=id;picks.push(mesh);}return mesh;
 }
 function cylinder(x,y,z,r,h,material,parent=group){const geo=new THREE.CylinderGeometry(r*M,r*M,h*M,24);resources.push(geo);const mesh=new THREE.Mesh(geo,material);mesh.position.set(x*M,y*M,z*M);mesh.castShadow=true;parent.add(mesh);return mesh;}
 // A cutaway room, with an actual opening for the narrow window.
 const floorMesh=box(3275,-55,1640,7000,100,3740,surface('porcelain',settings.floor==='harash'?'#e8e7e4':settings.floor==='cool'?'#d0d1ca':'#d4cec1',settings.floor==='harash'?{productId:'dry-floor'}:{}));if(settings.floor==='harash'){floorMesh.userData.productId='dry-floor';floorMesh.userData.tile=[1,1];}
 if(settings.floor!=='harash'){
 const tileLine=new THREE.LineBasicMaterial({color:settings.floor==='cool'?'#b8bcb6':'#bcb5a8',transparent:true,opacity:.45});resources.push(tileLine);
 const tileStep=900,tileOrigin=-200;
 for(let x=tileOrigin;x<5700;x+=tileStep){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x*M,-.002,-.2),new THREE.Vector3(x*M,-.002,3.51)]);resources.push(geo);group.add(new THREE.Line(geo,tileLine));}
 for(let z=tileOrigin;z<3600;z+=tileStep){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.2,-.002,z*M),new THREE.Vector3(5.7,-.002,z*M)]);resources.push(geo);group.add(new THREE.Line(geo,tileLine));}
 }
 floorMesh.userData.navigationSurface=true;
 const visualCeiling=HVAC_PROFILE.top/M;
 box(-75,visualCeiling/2,1650,150,visualCeiling,3450,wall);
 const hole=WINDOW;
 box(hole.x/2,visualCeiling/2,-75,hole.x,visualCeiling,150,wall);
 box((hole.x+hole.width+ROOM.long)/2,visualCeiling/2,-75,ROOM.long-hole.x-hole.width,visualCeiling,150,wall);
 box(hole.x+hole.width/2,hole.sill/2,-75,hole.width,hole.sill,150,wall);
 box(hole.x+hole.width/2,(hole.sill+hole.height+visualCeiling)/2,-75,hole.width,visualCeiling-hole.sill-hole.height,150,wall);
 // Two dark sliding sashes, recessed into the wall with a flush inner face.
 const windowGroup=new THREE.Group();windowGroup.userData.windowId='kitchen-window';group.add(windowGroup);
 const frame=mat('#343d3d',{metalness:.3,roughness:.45}),windowMat=mat('#b0c8be',{transparent:true,opacity:.15,roughness:.16,depthWrite:false});
 const windowBox=(x,y,z,w,h,d,material,part)=>{const mesh=box(x,y,z,w,h,d,material,null,windowGroup);mesh.userData={windowId:'kitchen-window',part};return mesh;};
 for(let i=0;i<2;i++){
  const x=hole.x+hole.width*(i+.5)/2,z=i?-38:-62,w=hole.width/2,y=hole.sill+hole.height/2;
  for(const zz of [-7,7])windowBox(x,y,z+zz,w-44,hole.height-44,4,windowMat,'window-glass').userData.glazing='double';
  for(const xx of [x-w/2+11,x+w/2-11])windowBox(xx,y,z,22,hole.height-16,24,frame,'window-sash');
  for(const yy of [hole.sill+11,hole.sill+hole.height-11])windowBox(x,yy,z,w,22,24,frame,'window-sash');
  windowBox(x+(i?-1:1)*(w/2-35),y,-15,14,125,16,frame,'window-handle');
 }
 for(const x of [hole.x+15,hole.x+hole.width-15])windowBox(x,hole.sill+hole.height/2,-45,30,hole.height,90,frame,'window-frame');
 for(const y of [hole.sill+15,hole.sill+hole.height-15])windowBox(hole.x+hole.width/2,y,-45,hole.width,30,90,frame,'window-frame');
 windowBox(hole.x+hole.width/2,hole.sill-12,-60,hole.width,24,120,stone,'window-sill');
 const hvacBox=(x,y,z,w,h,d,m,parent,data)=>{const mesh=box(x/M,y/M,z/M,w/M,h/M,d/M,m,null,parent);mesh.userData={...data};return mesh;};
 const hvac=createKitchenHvac({box:hvacBox,mat});group.add(hvac);
 const roomStructure=new Set(group.children);
 // Hollow cabinet bodies and independent opening mechanisms reveal the interior.
 const openParts=new Set(normalizeOpenParts(settings.openParts));
 const opened=(id,key)=>openParts.has(`${id}:${key}`);
 function markOpening(object,id,key){
  const openingId=`${id}:${key}`;if(!getOpening(openingId))throw new Error(`Unknown opening ${openingId}`);
  object.userData.openingId=openingId;
  const objects=openingObjects.get(openingId)||[];objects.push(object);openingObjects.set(openingId,objects);
  object.traverse(o=>{if(o.isMesh){o.userData.id=id;o.userData.openingId=openingId;if(!picks.includes(o))picks.push(o);}});
  return object;
 }
 function part(mesh,kind){mesh.userData.part=kind;return mesh;}
 function shell(parent,w,y,h,depth=590,zStart=0,material=interior,openTop=false){
  part(box(9,y+h/2,zStart+depth/2,18,h,depth,material,null,parent),'carcass-side');
  part(box(w-9,y+h/2,zStart+depth/2,18,h,depth,material,null,parent),'carcass-side');
  box(w/2,y+9,zStart+depth/2,w-36,18,depth,material,null,parent);
  if(!openTop)box(w/2,y+h-9,zStart+depth/2,w-36,18,depth,material,null,parent);else for(const zz of [zStart+14,zStart+depth-14])box(w/2,y+h-9,zz,w-36,18,28,material,null,parent);
  box(w/2,y+h/2,zStart+4,w-36,h-36,8,material,null,parent);
 }
 function shelf(parent,w,y,depth=550,zStart=20){part(box(w/2,y,zStart+depth/2,w-38,18,depth,interior,null,parent),'shelf');}
 function tray(parent,w,bottom,height,extension=0,wire=false,index=0,opening=null){
  const trayGroup=new THREE.Group();trayGroup.userData.part=wire?'wire-basket':'drawer-tray';trayGroup.userData.level=index;parent.add(trayGroup);
  const center=325+extension,depth=490,left=40,right=w-40;
  if(wire){
   for(let x=left;x<=right;x+=35)box(x,bottom+5,center,3,3,depth,metal,null,trayGroup);
   for(let z=center-depth/2;z<=center+depth/2;z+=35)box(w/2,bottom+5,z,w-80,3,3,metal,null,trayGroup);
   for(const yy of [bottom+10,bottom+height]){
    for(const x of [left,right])box(x,yy,center,5,5,depth,metal,null,trayGroup);
    for(const zz of [center-depth/2,center+depth/2])box(w/2,yy,zz,w-80,5,5,metal,null,trayGroup);
   }
   for(const x of [left,right])for(const zz of [center-depth/2,center+depth/2])box(x,bottom+height/2,zz,5,height,5,metal,null,trayGroup);
  }else{
   box(w/2,bottom+6,center,w-70,12,depth,mat('#e0e1da'),null,trayGroup);
   for(const x of [left,right])box(x,bottom+height/2,center,12,height,depth,interior,null,trayGroup);
   for(const zz of [center-depth/2,center+depth/2])box(w/2,bottom+height/2,zz,w-70,height,12,interior,null,trayGroup);
  }
  for(const x of [25,w-25])box(x,bottom+15,300+extension/2,8,12,510+extension,steel,null,trayGroup);
  if(opening)markOpening(trayGroup,opening[0],opening[1]);
  return trayGroup;
 }
 function door(parent,w,y,h,side,isOpen,material,id,xOffset=0,key='door'){
  const pivot=new THREE.Group();pivot.position.set((xOffset+(side==='right'?w:0))*M,y*M,(ROOM.depth+10)*M);pivot.rotation.y=isOpen?(side==='right'?1:-1)*Math.PI*.43:0;parent.add(pivot);
  const front=box((side==='right'?-1:1)*w/2,h/2,0,w-4,h-4,18,material,id,pivot,true);part(front,'hinged-front');
  if(settings.activePart===`${id}:${key}`)box((side==='right'?-1:1)*w/2,h/2,11,w-4,h-4,2,selection,null,pivot);
  for(const cy of [Math.min(90,h*.18),h-Math.min(90,h*.18)]){
   const hinge=box((side==='right'?-1:1)*20,cy,-14,35,45,12,steel,null,pivot);part(hinge,'soft-close-hinge');
  }
  markOpening(pivot,id,key);return pivot;
 }
 function front(module,parent,w,h,y,type,material,id){
  const z=ROOM.depth+10;
  const face=(cx,cy,ww,hh,zz=z,kind='front',key=null)=>{const mesh=part(box(cx,cy,zz,ww-4,hh-4,18,material,id,parent,true),kind);if(key){markOpening(mesh,id,key);if(settings.activePart===`${id}:${key}`)box(cx,cy,zz+10,ww-4,hh-4,3,selection,null,parent);}return mesh;};
  if(['drawers','hob'].includes(type)){
   const heights=[h*.25,h*.375,h*.375];let top=y+h;
   heights.forEach((hh,i)=>{top-=hh;const key=`drawer-${i}`,dz=opened(id,key)?280:0;tray(parent,w,top+18,Math.max(70,hh-42),dz,false,i,[id,key]);face(w/2,top+hh/2,w,hh,z+dz,'drawer-front',key);markOpening(box(w/2,top+hh-15,z+13+dz,w-42,6,6,recess,null,parent),id,key);});
  }else if(type==='sink'){
   door(parent,w/2,y,h,'left',opened(id,'door-left'),material,id,0,'door-left');door(parent,w/2,y,h,'right',opened(id,'door-right'),material,id,w/2,'door-right');
   const pipeMat=mat('#a9aea7',{roughness:.45});
   const pipePath=new THREE.CatmullRomCurve3([new THREE.Vector3(w*M/2,(ROOM.worktop-SINK.height-5)*M,SINK.drainZ*M),new THREE.Vector3(w*M/2,.59,SINK.drainZ*M),new THREE.Vector3(w*M/2,.49,.20),new THREE.Vector3(w*M/2,.59,.17),new THREE.Vector3(w*M/2,.59,.03)]);
   const g=new THREE.TubeGeometry(pipePath,24,.023,10,false);resources.push(g);const drain=new THREE.Mesh(g,pipeMat);drain.userData.part='sink-trap';parent.add(drain);
   for(const sign of [-1,1]){const water=box(w/2+sign*KITCHEN_SINK_PLUMBING.spacing/M,KITCHEN_SINK_PLUMBING.position[1]/M,KITCHEN_SINK_PLUMBING.position[2]/M,12,180,12,mat(settings.showElectrical&&settings.showWater!==false?SERVICE_COLORS.water:'#9aa6a5'),null,parent);part(water,'water-supply');}
   box(w/2,140,310,w-60,14,510,mat('#9b9f96'),null,parent);
  }else if(type==='pullout'){
   const isOpen=opened(id,'front'),dz=isOpen?360:0;
   tray(parent,w,y+30,240,dz,false,0,[id,'front']);tray(parent,w,y+470,100,dz,false,1,[id,'front']);
   if(isOpen){for(const dx of [-90,75]){cylinder(w/2+dx,y+155,320+dz,32,205,mat('#839070'),parent);cylinder(w/2+dx,y+285,320+dz,11,70,metal,parent);}}
   face(w/2,y+h/2,w,h,z+dz,'pullout-front','front');markOpening(box(w/2,y+h-16,z+12+dz,w-40,6,6,recess,null,parent),id,'front');
  }else if(type==='pantry'){
   // The order gives five ORIGINAL shelves; the final drawer allocation is unresolved.
   for(let i=1;i<=module.defaultShelves;i++)shelf(parent,w,y+i*h/(module.defaultShelves+1));
   door(parent,w,y,1540,module.hinge,opened(id,'lower-door'),material,id,0,'lower-door');door(parent,w,y+1540,h-1540,module.hinge,opened(id,'upper-door'),material,id,0,'upper-door');
  }else if(type==='oven'){
   const lowerH=754/2;
   for(let i=0;i<2;i++){const key=`lower-drawer-${i}`,dz=opened(id,key)?280:0;tray(parent,w,120+i*lowerH+18,lowerH-42,dz,false,i,[id,key]);face(w/2,120+(i+.5)*lowerH,w,lowerH,z+dz,'drawer-front',key);markOpening(box(w/2,120+(i+1)*lowerH-16,z+15+dz,w-42,6,6,recess,null,parent),id,key);}
   // Schematic oven cavity, two racks, a drop-down door, HL flap and top door.
   const ovenBottom=874,ovenH=594;
   shell(parent,w,874,594,570,0,black);
   for(const [i,yy] of [1020,1210].entries()){const rack=new THREE.Group();rack.userData.part='oven-rack';rack.position.z=opened(id,`oven-rack-${i}`) ? .26 : 0;parent.add(rack);for(let x=60;x<w-45;x+=40)box(x,yy,330,3,3,450,steel,null,rack);for(const zz of [105,555])box(w/2,yy,zz,w-85,5,5,steel,null,rack);markOpening(rack,id,`oven-rack-${i}`);}
   const op=new THREE.Group();op.position.set(0,ovenBottom*M,z*M);op.rotation.x=opened(id,'oven-door')?Math.PI*.46:0;parent.add(op);
   part(box(w/2,ovenH/2,0,w-25,ovenH,26,black,id,op,true),'oven-door');box(w/2,ovenH/2,16,w-70,380,8,glass,id,op);box(w/2,ovenH-40,30,w-120,14,20,metal,null,op,true);
   markOpening(op,id,'oven-door');box(w/2,1430,z+18,w-25,70,6,steel,null,parent);
   for(const x of [95,w-95]){const dial=cylinder(x,1430,z+28,16,12,metal,parent);dial.rotation.x=Math.PI/2;}
   box(w/2,1430,z+25,90,22,8,black,null,parent);
   const flapOpen=opened(id,'lift-up');const flap=face(w/2,1668+(flapOpen?380:0),w,400,z+(flapOpen?120:0),'lift-up-flap','lift-up');
   for(const x of [35,w-35]){const arm=box(x,1620,450,12,310,16,steel,null,parent);arm.rotation.x=flapOpen?-.6:0;part(arm,'HL-lift-arm');markOpening(arm,id,'lift-up');}
   shelf(parent,w,1480);shelf(parent,w,1880);door(parent,w,1868,532,'left',opened(id,'top-door'),material,id,0,'top-door');
  }else if(type==='upper'){
   const count=module.doors||1;
   for(let i=0;i<count;i++){const key=count===2?(i?'door-right':'door-left'):'door';door(parent,w/count,y,h,count===2?(i===0?'left':'right'):module.hinge,opened(id,key),material,id,i*w/count,key);}
  }else if(type==='dishwasher'){
   const ap=new THREE.Group();ap.position.set(0,0,z*M);ap.rotation.x=opened(id,'door')?Math.PI*.47:0;parent.add(ap);
   part(box(w/2,437,0,w-4,870,20,material,id,ap,true),'dishwasher-door');box(w/2,437,-18,w-45,800,10,steel,null,ap);
   markOpening(ap,id,'door');for(let i=0;i<2;i++)tray(parent,w,190+i*360,125,opened(id,`rack-${i}`)?290:0,true,i,[id,`rack-${i}`]);
   box(w/2,846,z+15,180,8,10,metal,null,parent);
  }else if(type==='baskets'){
   door(parent,w,y,h,module.hinge,opened(id,'door'),material,id);
   for(let i=0;i<3;i++)tray(parent,w,y+45+i*230,140,opened(id,`basket-${i}`)?290:0,true,i,[id,`basket-${i}`]);
  }else{
   door(parent,w,y,h,module.hinge||'left',opened(id,'door'),material,id);
   if(module.internalDrawers){for(let i=0;i<module.internalDrawers;i++)tray(parent,w,y+35+i*330,200,opened(id,`internal-${i}`)?300:0,false,i,[id,`internal-${i}`]);}
   else if(module.mixerLift){
    const isOpen=opened(id,'mixer-lift');const liftGroup=new THREE.Group();parent.add(liftGroup);const liftY=isOpen?960:450,liftZ=isOpen?700:300;const lift=box(w/2,liftY,liftZ,w-65,22,390,interior,null,liftGroup);part(lift,'mixer-lift-platform');
    for(const x of [35,w-35]){const arm=box(x,(liftY+180)/2,250,12,liftY-180,18,steel,null,liftGroup);part(arm,'mixer-lift-arm');}
    const bowl=cylinder(w/2,liftY+85,liftZ+45,85,130,steel,liftGroup);part(bowl,'illustrative-mixer');box(w/2,liftY+180,liftZ-75,100,120,180,mat('#c0c5ba'),null,liftGroup,true);markOpening(liftGroup,id,'mixer-lift');
   }else shelf(parent,w,y+h/2);
  }
 }
 function cabinet(m){
  if(m.type==='corner'||m.type==='panel')return;
  const p=new THREE.Group();p.userData.cabinetId=m.id;moduleGroups.set(m.id,p);
  if(m.wall==='long')p.position.set(m.x*M,0,0);else if(m.wall==='short'){p.position.set(0,0,(m.z+m.w)*M);p.rotation.y=Math.PI/2;}else {p.position.set((m.x+m.w)*M,0,(ISLAND.z+590)*M);p.rotation.y=Math.PI;}
  group.add(p);
  if(m.type==='fridge'){
   const white=mat('#dce1d8'),fridgeMetal=mat('#b6b8b1',{metalness:.65,roughness:.4});
   box(18,1260,340,36,2280,680,base,m.id,p);box(m.w-18,1260,340,36,2280,680,base,m.id,p);
   shell(p,m.w-60,150,1650,620,0,white);
   for(let i=0;i<4;i++)box(m.w/2,580+i*300,330,m.w-110,12,530,mat('#b8ccbf',{transparent:true,opacity:.55,roughness:.2}),null,p);
   for(let i=0;i<2;i++){const bin=new THREE.Group();bin.position.x=(30+i*(m.w-60)/2)*M;p.add(bin);tray(bin,(m.w-60)/2,180,180,opened(m.id,`bin-${i}`)?250:0,false,i,[m.id,`bin-${i}`]);}
   for(let i=0;i<2;i++){
    const w=(m.w-80)/2,side=i?'right':'left',pivot=new THREE.Group();pivot.position.set((i?m.w-40:40)*M,.15,.64);const doorKey=i?'door-right':'door-left';pivot.rotation.y=opened(m.id,doorKey)?(i?1:-1)*Math.PI*.42:0;p.add(pivot);
    part(box((i?-1:1)*w/2,825,0,w-5,1650,40,fridgeMetal,m.id,pivot,true),'fridge-door');box((i?-1:1)*(w-15),890,29,9,880,12,metal,null,pivot,true);
    for(let j=0;j<3;j++)box((i?-1:1)*w/2,400+j*360,-52,w-55,65,90,white,null,pivot);markOpening(pivot,m.id,doorKey);
   }
   box(m.w/2,110,635,m.w-65,125,30,plinth,null,p);for(let i=0;i<4;i++)box(m.w/2,74+i*20,654,m.w-95,4,5,recess,null,p);
   shell(p,m.w,1800,600,590);for(let i=0;i<2;i++)door(p,m.w/2,1800,600,i?'right':'left',opened(m.id,i?'upper-door-right':'upper-door-left'),upper,m.id,i*m.w/2,i?'upper-door-right':'upper-door-left');
   return;
  }
  const tall=['oven','pantry'].includes(m.type),bodyH=tall?2280:754;
  if(m.type==='dishwasher')shell(p,m.w,0,874,570,0,steel);else shell(p,m.w,120,bodyH,590,0,interior,['sink','hob'].includes(m.type));
  if(m.type!=='dishwasher')box(m.w/2,60,270,m.w-2,120,510,plinth,null,p);
  front(m,p,m.w,bodyH,120,m.type,base,m.id);
 }
 LONG.forEach(cabinet);SHORT.forEach(cabinet);ISLAND_UNITS.forEach(cabinet);
 // The corner is shared by the two runs rather than doubled.
 const cornerGroup=new THREE.Group();cornerGroup.userData.cabinetId='corner';moduleGroups.set('corner',cornerGroup);group.add(cornerGroup);shell(cornerGroup,660,120,754,590);shelf(cornerGroup,660,490);door(cornerGroup,660,120,754,'left',opened('corner','door'),base,'corner');box(320,60,270,640,120,510,plinth,null,cornerGroup);
 // Worktop is a continuous L with a sink cutout, not a sink drawn on solid stone.
 const topBottom=874,topH=38;
 const sinkModule=LONG.find(m=>m.id==='sink'),sinkX=sinkModule.x+sinkModule.w/2,sinkZ=SINK.centerZ;
 const topShape=new THREE.Shape();topShape.moveTo(0,0);topShape.lineTo(4850,0);topShape.lineTo(4850,620);topShape.lineTo(620,620);topShape.lineTo(620,1660);topShape.lineTo(0,1660);topShape.closePath();
 topShape.holes.push(vegasCutoutPath(sinkX,sinkZ));
 const hobX=LONG.find(m=>m.id===HOB.cabinetId).x+450,hobCut=new THREE.Path(),cw=HOB.cutout.previewWidth,cd=HOB.cutout.previewDepth;
 hobCut.moveTo(hobX-cw/2,HOB.centerZ-cd/2);hobCut.lineTo(hobX-cw/2,HOB.centerZ+cd/2);hobCut.lineTo(hobX+cw/2,HOB.centerZ+cd/2);hobCut.lineTo(hobX+cw/2,HOB.centerZ-cd/2);hobCut.closePath();topShape.holes.push(hobCut);
 const topGeo=new THREE.ExtrudeGeometry(topShape,{depth:topH,bevelEnabled:false,curveSegments:12});topGeo.rotateX(Math.PI/2);topGeo.scale(M,M,M);topGeo.translate(0,ROOM.worktop*M,0);const topUV=topGeo.attributes.uv;for(let i=0;i<topUV.count;i++)topUV.setXY(i,topUV.getX(i)/1800,topUV.getY(i)/1800);resources.push(topGeo);const countertop=new THREE.Mesh(topGeo,stone);countertop.castShadow=true;countertop.receiveShadow=true;part(countertop,'worktop');countertop.userData.navigationBoxes=[{min:[0,(ROOM.worktop-topH)*M,0],max:[4850*M,ROOM.worktop*M,ROOM.counterDepth*M]},{min:[0,(ROOM.worktop-topH)*M,ROOM.counterDepth*M],max:[ROOM.counterDepth*M,ROOM.worktop*M,1660*M]}];group.add(countertop);
 const sinkParent=moduleGroups.get('sink'),bowlX=sinkModule.w/2,vegas=createVegasSink(resources);vegas.position.set(bowlX*M,ROOM.worktop*M,sinkZ*M);sinkParent.add(vegas);vegas.traverse(o=>{if(o.isMesh)picks.push(o);});
 const kitchenTap=createVeredKitchenTap(resources);kitchenTap.position.set(bowlX*M,ROOM.worktop*M,SINK.tapZ*M);sinkParent.add(kitchenTap);kitchenTap.traverse(o=>{if(o.isMesh)picks.push(o);});

 // Siemens EX875LYV1E: actual 812 × 520 × 51 mm envelope. Underside details
 // and the selected 780 × 500 mm cutout are a fit illustration, not fabrication data.
 const hobParent=moduleGroups.get(HOB.cabinetId),hobTop=ROOM.worktop+HOB.glassHeight;
 const cooktopGlass=part(box(450,ROOM.worktop+HOB.glassHeight/2,HOB.centerZ,HOB.width,HOB.glassHeight,HOB.depth,black,HOB.cabinetId,hobParent,true),'cooktop-glass');
 cooktopGlass.userData.model=HOB.model;
 part(box(450,ROOM.worktop-(HOB.height-HOB.glassHeight)/2,HOB.centerZ,750,HOB.height-HOB.glassHeight,490,black,HOB.cabinetId,hobParent),'cooktop-body');
 for(const x of [450-HOB.width/2+2,450+HOB.width/2-2])box(x,915,HOB.centerZ,3,6,HOB.depth,steel,HOB.cabinetId,hobParent);
 const print=mat('#7c847e',{roughness:.6});
 for(const cx of [215,685]){
  // Two linked 400 × 230 mm FlexInduction zones, each with two cooking areas.
  for(const xx of [cx-115,cx+115])box(xx,hobTop+.3,270,1.5,.6,400,print,null,hobParent);
  for(const zz of [70,270,470])box(cx,hobTop+.3,zz,230,.6,1.5,print,null,hobParent);
  for(let i=0;i<12;i++)box(cx-86+i*15,hobTop+.4,535,7,.8,2,print,null,hobParent);
 }
 for(const xx of [410,490])for(const zz of [170,370])box(xx,hobTop+.3,zz,45,.6,1.5,print,null,hobParent);
 // Built-in BOXIN LX in the 900 mm cabinet above the hob. Everything is
 // parented to that cabinet, so inspection reveals the motor and duct as well.
 function hoodCabinet(p,m){
  const start=270,depth=ROOM.upperDepth,inner=m.w-36;
  for(const x of [9,m.w-9])part(box(x,1950,start+depth/2,18,900,depth,interior,null,p),'carcass-side');
  box(m.w/2,1950,start+4,inner,864,8,interior,null,p);
  const rear=start+depth-HOOD.depth,ductZ=rear+HOOD.ductRearOffset;
  function perforatedShelf(y,kind){
   const shape=new THREE.Shape();shape.moveTo(18,start+8);shape.lineTo(m.w-18,start+8);shape.lineTo(m.w-18,start+depth-8);shape.lineTo(18,start+depth-8);shape.closePath();
   const hole=new THREE.Path();hole.absarc(m.w/2,ductZ,HOOD.shelfHoleDiameter/2,0,Math.PI*2,true);shape.holes.push(hole);
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:18,bevelEnabled:false,curveSegments:40});geometry.rotateX(Math.PI/2);geometry.translate(0,y+9,0);geometry.scale(M,M,M);resources.push(geometry);
   const board=part(new THREE.Mesh(geometry,interior),kind);board.castShadow=board.receiveShadow=true;p.add(board);
  }
  perforatedShelf(2391,'hood-top-panel');perforatedShelf(2100,'hood-shelf');
  const hood=createBoxinHood({box,cylinder,part,mat,resources,settings,steel,black});
  const bottom=ROOM.upperBottom-HOOD.trimHeight;
  hood.position.set(m.w/2*M,bottom*M,rear*M);p.add(hood);
  // The real collar ends at 361.3 mm; the pipe beyond it is the illustrated
  // installation route and is deliberately outside the product envelope.
  const ductBottom=bottom+HOOD.totalHeight,ductTop=2400;
  const ductGeo=new THREE.CylinderGeometry(HOOD.ductDiameter*M/2,HOOD.ductDiameter*M/2,(ductTop-ductBottom)*M,64,1,true);resources.push(ductGeo);
  const duct=part(new THREE.Mesh(ductGeo,mat('#b0b7b2',{metalness:.65,roughness:.42,side:THREE.DoubleSide})),'hood-duct');duct.position.set(m.w/2*M,(ductBottom+ductTop)/2*M,ductZ*M);p.add(duct);
  // Pick targets include the custom punched fascia and diamond filter planes.
  hood.traverse(o=>{if(o.isMesh){o.userData.id=m.id;if(!picks.includes(o))picks.push(o);}});
 }
 // Upper fronts have their own 320 mm depth and preserve the 1090 mm setback.
 UPPERS.forEach(m=>{
  const p=new THREE.Group();p.userData.cabinetId=m.id;moduleGroups.set(m.id,p);p.position.set(m.x*M,0,(-ROOM.depth+ROOM.upperDepth)*M);group.add(p);
  if(m.id===HOOD.cabinetId)hoodCabinet(p,m);else {shell(p,m.w,1500,900,320,270);for(let i=1;i<=m.shelves;i++)shelf(p,m.w,1500+i*300,280,290);}
  front(m,p,m.w,900,1500,'upper',upper,m.id);
 });
 // The shared photographed HVAC replaces the former decorative ceiling strips.
 // Island: 2400 carcass + 20 mm stone overhang each end; 300 mm seating overhang.
 box(ISLAND.x+ISLAND.width/2,893,ISLAND.z+450,2440,38,900,stone,'island-1',group,true);
 box(ISLAND.x+1220,60,ISLAND.z+280,2400,120,510,plinth);
 box(ISLAND.x+1220,497,ISLAND.z+610,2400,754,18,base,'island-1');
 for(const x of [ISLAND.x+20,ISLAND.x+ISLAND.width-20])box(x,497,ISLAND.z+300,18,754,620,base,'island-1');
 for(let i=0;i<4;i++){
  const x=ISLAND.x+340+i*585,z=ISLAND.z+1160;const stoolmat=mat('#7b786a',{roughness:.9});
  const seat=cylinder(x,660,z,175,50,stoolmat);seat.scale.z=.85;
  cylinder(x,340,z,18,600,metal);cylinder(x,22,z,185,28,metal);
  const ring=new THREE.TorusGeometry(.115,.009,8,32);resources.push(ring);const foot=new THREE.Mesh(ring,metal);foot.rotation.x=Math.PI/2;foot.position.set(x*M,.285,z*M);group.add(foot);
  box(x,770,z+120,305,170,30,stoolmat,null,group,true);
 }
 // Subtle countertop objects keep the working surfaces legible.
 const cutting=box(3000,925,280,340,22,260,surface('wood','#b08e60'),null,group,true);cutting.rotation.y=.1;
 cylinder(2900,980,200,52,80,mat('#ddd8c9'));cylinder(2900,1026,200,50,9,mat('#a98d65'));
 cylinder(1120,942,260,95,60,mat('#c8c3ae'));for(let i=0;i<4;i++){const geo=new THREE.SphereGeometry(.035,12,8);resources.push(geo);const fruit=new THREE.Mesh(geo,mat(i%2?'#c4aa50':'#74815f'));fruit.position.set(1.08+i*.027,.99,.245+(i%2)*.03);group.add(fruit);}
 const furnishingRoots=group.children.filter(child=>!roomStructure.has(child));
 // Lighting changes are local to this scene group.
 const hemi=new THREE.HemisphereLight(settings.light==='day'?'#eaf2ff':'#e3e0ef','#b9aa94',settings.light==='day'?1.55:.75);group.add(hemi);
 const sun=new THREE.DirectionalLight(settings.light==='day'?'#fff5df':'#f3cf9d',settings.light==='day'?3.2:1.4);sun.position.set(3,6,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.015;sun.shadow.radius=3;sun.shadow.bias=-.0001;group.add(sun);
 const fill=new THREE.DirectionalLight('#e7edf1',settings.light==='day'?1:.45);fill.position.set(-3,3,1);group.add(fill);
 if(settings.led){
  const ledmat=mat('#ffdda4',{emissive:'#ffcb77',emissiveIntensity:2});for(const [a,b] of [[1095,3470],[4370,4845]])furnishingRoots.push(box((a+b)/2,1494,300,b-a,4,12,ledmat));
  for(const x of [1.65,2.65,3.65,4.55]){const l=new THREE.PointLight('#ffd9a1',settings.intensity/100*.7,2.5,2);l.position.set(x,1.42,.37);group.add(l);furnishingRoots.push(l);}
 }
 const dimensionGroup=new THREE.Group();group.add(dimensionGroup);dimensionGroup.visible=settings.dimensions;
 const dimmat=new THREE.LineBasicMaterial({color:'#526e60'});resources.push(dimmat);
 function dimension(a,b){const points=[a,b].map(v=>new THREE.Vector3(...v));const g=new THREE.BufferGeometry().setFromPoints(points);resources.push(g);dimensionGroup.add(new THREE.Line(g,dimmat));for(const p of points){const g2=new THREE.BufferGeometry().setFromPoints([p.clone().add(new THREE.Vector3(-.035,.035,.035)),p.clone().add(new THREE.Vector3(.035,-.035,-.035))]);resources.push(g2);dimensionGroup.add(new THREE.Line(g2,dimmat));}}
 dimension([0,2.78,-.15],[5.45,2.78,-.15]);dimension([-.15,2.78,0],[-.15,2.78,3.3]);dimension([2.18,.97,2.58],[4.62,.97,2.58]);dimension([4.79,.04,.62],[4.79,.04,1.6]);
 applyKitchenVisibility(furnishingRoots,settings.inspection?'solid':cabinetVisibility(settings),resources);
 if(settings.inspection&&settings.selected&&moduleGroups.has(settings.selected)){const selected=moduleGroups.get(settings.selected);for(const child of group.children)child.visible=child===selected||child.isLight;}
 // Shared observed markers use metre-based helpers; kitchen solids use mm.
 const electricalGroups=new Map(),waterGroups=new Map();
 if(settings.showElectrical&&!settings.inspection){
  const tag=(mesh,data)=>{if(data){mesh.userData={...data};picks.push(mesh);}return mesh;};
  const electricalBox=(x,y,z,w,h,d,material,parent,data)=>tag(box(x/M,y/M,z/M,w/M,h/M,d/M,material,null,parent),data);
  const electricalCylinder=(x,y,z,r,h,material,parent,data)=>tag(cylinder(x/M,y/M,z/M,r/M,h/M,material,parent),data);
  for(const [id,p] of buildElectricalPoints({group,box:electricalBox,cylinder:electricalCylinder,mat,resources,settings:{...settings,electricalPresentation:'fixtures'},points:KITCHEN_ELECTRICAL_POINTS}))electricalGroups.set(id,p);
  for(const [id,p] of buildWaterPoints({group,box:electricalBox,cylinder:electricalCylinder,mat,resources,settings:{...settings,electricalPresentation:'fixtures'},points:KITCHEN_WATER_POINTS}))waterGroups.set(id,p);
 }
 const lightingGroups=settings.inspection?new Map():buildLightingPoints({group,box:(x,y,z,w,h,d,m,parent)=>box(x/M,y/M,z/M,w/M,h/M,d/M,m,null,parent),cylinder:(x,y,z,r,h,m,parent)=>cylinder(x/M,y/M,z/M,r/M,h/M,m,parent),mat,resources,settings,points:KITCHEN_LIGHTING_POINTS,picks,interactive:false});
 const activePicks=picks.filter(objectVisible),electricalOccluders=[];
 group.traverse(mesh=>{if(mesh.isMesh&&objectVisible(mesh)&&!mesh.userData.electricalId&&opaqueMesh(mesh))electricalOccluders.push(mesh);});
 return {group,lightingGroups,windowGroup,picks:activePicks,moduleGroups,openingObjects,electricalGroups,waterGroups,dimensionGroup,serviceGroups:new Map([...electricalGroups,...waterGroups]),furnishingRoots,roomStructure,electricalOccluders,dispose(){group.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.dispose();});resources.forEach(r=>r.dispose?.());}};
}
