import {SERVICE_ACCESS,SERVICE_ROOM_POLYGONS,SERVICE_CONNECTOR,serviceTreads,serviceLowerWallRuns} from './service-access.mjs';
import {LOBBY_WALL_COLOR,LOBBY_PANEL_COLOR} from './common-finish.mjs';
import {Reflector} from 'three/addons/objects/Reflector.js';
import * as THREE from 'three';
import {LOBBY_POLYGON,PUMP_ROOM} from './common-spaces.mjs';
import {LOBBY_BENCHES} from './lobby-reference.mjs';
import {lightColour} from './lighting-controls.mjs';
import {createSurfacePalette} from './surface-materials.mjs';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';
// Furniture-free finishes leave the documented circulation and door swings clear.
// Equipment topology follows 298244.jpg; size/orientation are explicit estimates.
export function buildCommonSpaces({parent,resources,settings,cut=false}){
 const root=new THREE.Group();root.name='common-spaces';root.userData={source:'building-plan',page:3};parent.add(root);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,...extra});resources.push(m);return m;};
 const white=mat('#eeece5'),blue=mat('#224e62',{metalness:.45,roughness:.4}),steel=mat('#a5aba7',{metalness:.75,roughness:.3}),black=mat('#303633'),cream=mat('#dfd8bc',{roughness:.42}),red=mat('#81443c'),stone=mat('#cbc5ba',{roughness:.55}),concrete=mat('#aca99e'),grout=mat('#b5b1a8');
 const plaster=createSurfacePalette(resources)('plaster','#eeece5');installBuildingSurfaceUVs(plaster);
 const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,16);resources.push(cube,cylinder);
 const batches=new Map(),dummy=new THREE.Object3D();
 function item(geo,m,p,s,q=null,name='common-detail'){if(m===white&&/wall|plaster/.test(name))m=plaster;const key=geo.uuid+m.uuid+name;let b=batches.get(key);if(!b)batches.set(key,b={geo,m,name,matrices:[]});dummy.position.set(...p);dummy.scale.set(...s);dummy.quaternion.copy(q||new THREE.Quaternion());dummy.updateMatrix();b.matrices.push(dummy.matrix.clone());}
 const box=(name,x,y,z,w,h,d,m)=>item(cube,m,[x,y,z],[w,h,d],null,name);
 function pipe(name,a,b,r,m){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());item(cylinder,m,va.add(vb).multiplyScalar(.5).toArray(),[r,dir.length(),r],q,name);}
 function floor(poly,m,name,y=.025){const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const g=new THREE.ShapeGeometry(shape);g.rotateX(Math.PI/2);resources.push(g);m.side=THREE.DoubleSide;const mesh=new THREE.Mesh(g,m);mesh.position.y=y;mesh.name=name;mesh.receiveShadow=true;root.add(mesh);}
 const serviceTile=mat('#77766f',{roughness:.93}),serviceJoint=mat('#a7a397',{roughness:.98});
 floor(LOBBY_POLYGON,stone,'lobby-floor-finish');floor(PUMP_ROOM.polygon,serviceTile,'pump-floor-finish',-SERVICE_ACCESS.depth+.025);floor(SERVICE_ROOM_POLYGONS.meters,serviceTile,'meter-room-floor-finish',-SERVICE_ACCESS.depth+.025);
 floor(SERVICE_CONNECTOR,serviceTile,'service-bottom-landing-finish',-SERVICE_ACCESS.depth+.025);
 // Narrow seams cut to the actual lobby polygon, never long lines through walls.
 function inside([x,z],poly){let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;}
 for(let x=12;x<22;x+=.8)for(let z=-7.7;z<-.4;z+=.05)if(inside([x,z],LOBBY_POLYGON)&&inside([x,z+.05],LOBBY_POLYGON))box('lobby-tile-joints',x,.027,z+.025,.002,.001,.05,grout);
 for(let z=-7.7;z<-.4;z+=.8)for(let x=12;x<22;x+=.05)if(inside([x,z],LOBBY_POLYGON)&&inside([x+.05,z],LOBBY_POLYGON))box('lobby-tile-joints',x+.025,.027,z,.05,.001,.002,grout);
 // Video-based finishes, surface-mounted on the existing plan walls.
 const oak=mat(LOBBY_PANEL_COLOR),panel=mat(LOBBY_WALL_COLOR),shadow=mat('#6b6962');
 oak.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLobbyPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLobbyPoint=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLobbyPoint;').replace('#include <color_fragment>',`#include <color_fragment>
   float grain=sin(vLobbyPoint.x*740.0+sin(vLobbyPoint.y*8.0)*1.5)*.025+sin(vLobbyPoint.x*173.0)*.018;
   diffuseColor.rgb*=1.0+grain;
  `);
 };oak.customProgramCacheKey=()=> 'lobby-oak-r53';
 const panelHeight=cut?.80:2.65;
 // South face of the pump-room wall and entry-side service bank.
 box('lobby-oak-panelling',16.13,panelHeight/2,-5.165,4.20,panelHeight,.028,oak);
 for(let x=14.05;x<18.24;x+=.60)box('lobby-panel-reveal',x,panelHeight/2,-5.145,.008,panelHeight,.006,shadow);
 for(let x=20.12;x<21.6;x+=.56){
  box('lobby-flush-service-panel',x,panelHeight/2,-5.59,.548,panelHeight,.028,panel);
  if(!cut)box('lobby-service-handle',x+.21,1.05,-5.565,.018,.13,.022,black);
 }
 for(const b of LOBBY_BENCHES){const x=(b.minX+b.maxX)/2,z=(b.minZ+b.maxZ)/2,w=b.maxX-b.minX,d=b.maxZ-b.minZ;
  box('lobby-stone-bench',x,.46,z,w,.09,d,stone);
  box('lobby-bench-support',x,.30,z,w-.30,.12,Math.max(.10,d-.18),panel);
 }
 if(!cut){
  // Recessed round ceiling fixtures and the narrow ceiling shadow line.
  box('lobby-ceiling-reveal',18.6,2.75,-5.10,6.02,.008,.012,shadow);
  box('lobby-ceiling-reveal',21.5,2.75,-3.75,.012,.008,2.7,shadow);
 }
 if(!cut){
  const geo=new THREE.PlaneGeometry(2.8,1.15),mirror=new Reflector(geo,{textureWidth:256,textureHeight:256,color:0xdadada,clipBias:.003});resources.push(geo,mirror.getRenderTarget(),mirror.material);
  mirror.position.set(12.38,1.45,-2.05);mirror.rotation.y=Math.PI/2;mirror.name='lobby-wall-mirror';mirror.userData={source:'307558.jpg',dimensionsInferred:true};root.add(mirror);
  const frame=mat('#9b7554');for(const z of [-3.465,-.635])box('lobby-mirror-frame',12.38,1.45,z,.028,1.20,.025,frame);
  for(const y of [.863,2.037])box('lobby-mirror-frame',12.38,y,-2.05,.028,.025,2.85,frame);
 }
 // Open portal between the two cabinet banks; no cabinet crosses the stair mouth.
 const access=SERVICE_ACCESS;
 // The source lobby finish stops at z=-5.70. Complete that short upper
 // threshold and overlap the stair edge by 5mm: independently serialized
 // float32 edges otherwise leave a floor-ray crack in rotated copies.
 box('service-upper-threshold',(access.minX+access.maxX)/2,-.015,(access.topZ-.005-5.70)/2,access.maxX-access.minX,.08,-5.70-access.topZ+.005,stone);
 for(const tread of serviceTreads()){const top=tread.y,bot=-access.depth-.12;
  box('service-descending-step',(access.minX+access.maxX)/2,(top+bot)/2,(tread.topZ+tread.bottomZ)/2,access.maxX-access.minX,top-bot,tread.topZ-tread.bottomZ+.004,serviceTile);
  // A flush, non-physical strip cannot catch a floor or body ray.
  box('service-step-nosing',(access.minX+access.maxX)/2,top+.001,tread.topZ-.018,access.maxX-access.minX,.002,.03,serviceJoint);
 }
 box('service-bottom-landing',19.099,-access.depth-.06,-8.10,1.70,.12,1.80,concrete);
 for(const w of serviceLowerWallRuns()){
  const a=w.a,b=w.b,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),q=new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,-Math.atan2(dz,dx));
  item(cube,white,[(a[0]+b[0])/2,-access.depth/2,(a[1]+b[1])/2],[length,access.depth,w.width],q,'service-lower-wall');
 }
 // The source calls the adjacent space a meter room with a raised floor.
 // Show its closed inspection panel; no unseen meter layout is invented.
 box('meter-room-raised-floor-base',21.724,-access.depth-.075,-7.425,3.55,.15,3.15,concrete);
 box('meter-room-floor-panel-frame',21.95,-access.depth+.029,-7.40,.94,.008,.94,black);
 box('meter-room-floor-panel',21.95,-access.depth+.034,-7.40,.88,.004,.88,serviceTile);
 for(const x of [21.64,22.26])box('meter-room-panel-lift-slot',x,-access.depth+.037,-7.40,.015,.002,.09,black);
 // As-built lobby video, 17–21s: round landing cover, two short pipe ends,
 // round wall light and control cabinet. Sizes and positions are estimates.
 item(cylinder,black,[19.08,-access.depth+.027,-8.45],[.38,.005,.38],null,'service-landing-cover-frame');
 item(cylinder,cream,[19.08,-access.depth+.031,-8.45],[.35,.004,.35],null,'service-landing-cover');
 for(const x of [18.78,19.28])pipe('service-landing-pipe',[x,-access.depth+.026,-8.87],[x,-access.depth+.21,-8.87],.045,black);
 if(!cut){
  box('service-landing-controller',19.43,-access.depth+1.47,-8.94,.30,.42,.11,white);
  box('service-controller-display',19.43,-access.depth+1.55,-8.875,.10,.065,.008,black);
  box('service-controller-isolator',19.50,-access.depth+1.39,-8.875,.075,.075,.012,red);
  pipe('service-controller-conduit',[19.46,-access.depth+.17,-8.94],[19.46,-access.depth+1.27,-8.94],.016,white);
  const glow=mat('#f7f4df',{emissive:'#f7f4df',emissiveIntensity:settings.lampsOn!==false?.6:0}),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
  item(cylinder,white,[18.84,-access.depth+.95,-8.95],[.09,.025,.09],q,'service-landing-round-light');
  item(cylinder,glow,[18.84,-access.depth+.95,-8.93],[.075,.008,.075],q,'service-landing-light-diffuser');
  if(settings.lampsOn!==false){const l=new THREE.PointLight(lightColour(4000),10,4,2);l.position.set(19.1,-access.depth+1,-8.6);l.userData={fixtureLight:true,kelvin:4000,positionInferred:true,source:'simulator-placeholder'};root.add(l);}
 }
 for(const poly of [...Object.values(SERVICE_ROOM_POLYGONS),SERVICE_CONNECTOR]){
  for(let x=14;x<23.5;x+=.6)for(let z=-9;z< -5.35;z+=.1)if(inside([x,z],poly)&&inside([x,z+.1],poly))box('service-floor-joints',x,-access.depth+.027,z+.05,.002,.001,.10,serviceJoint);
  for(let z=-9;z< -5.35;z+=.6)for(let x=14;x<23.5;x+=.1)if(inside([x,z],poly)&&inside([x+.1,z],poly))box('service-floor-joints',x+.05,-access.depth+.027,z,.10,.001,.002,serviceJoint);
 }
 const equipment=new THREE.Group();equipment.name='pump-equipment';equipment.position.y=-SERVICE_ACCESS.depth;equipment.userData={source:'pump-room-photo',dimensionsInferred:true,orientationInferred:true,pumps:3};root.add(equipment);
 // Along the west wall, outside the source entrance door and access aisle.
 box('pump-plinth',14.67,.10,-6.72,1.02,.20,2.15,concrete);
 box('pump-steel-frame',14.67,.27,-6.72,.82,.13,1.84,steel);
 if(!cut){
 for(const z of [-7.32,-6.72,-6.12]){
  pipe('pump-stainless-body',[14.65,.40,z],[14.65,1.13,z],.13,steel);
  pipe('pump-blue-motor',[14.65,1.13,z],[14.65,1.55,z],.17,blue);
  for(let a=0;a<8;a++){const t=a*Math.PI/4;pipe('pump-motor-fin',[14.65+Math.cos(t)*.17,1.17,z+Math.sin(t)*.17],[14.65+Math.cos(t)*.17,1.51,z+Math.sin(t)*.17],.009,black);}
  box('pump-foot',14.65,.37,z,.40,.10,.35,blue);
  pipe('pump-outlet',[14.65,.62,z],[14.99,.62,z],.06,blue);
  pipe('pump-outlet-riser',[14.99,.62,z],[14.99,1.53,z],.045,steel);
  pipe('pump-union',[14.99,1.34,z],[14.99,1.41,z],.073,steel);
  pipe('pump-valve-stem',[14.99,1.18,z],[15.10,1.18,z],.018,steel);
  box('pump-valve-handle',15.11,1.18,z,.025,.035,.16,black);
 }
 pipe('pump-header',[14.99,1.55,-7.65],[14.99,1.55,-5.85],.095,steel);
 for(const z of [-7.57,-7.40,-6.95,-6.48,-6.03])pipe('pump-header-flange',[14.99,1.55,z-.025],[14.99,1.55,z+.025],.13,steel);
 pipe('pump-pressure-vessel',[14.64,1.88,-7.13],[14.64,2.37,-7.13],.23,cream);
 pipe('pump-vessel-neck',[14.64,1.55,-7.13],[14.64,1.89,-7.13],.035,steel);
 pipe('pump-vessel-feed',[14.64,1.55,-7.13],[14.99,1.55,-7.13],.035,steel);
 pipe('pump-gauge',[15.02,1.76,-7.55],[15.09,1.76,-7.55],.065,white);
 box('pump-gauge-needle',15.095,1.78,-7.55,.008,.045,.008,black);
 pipe('pump-low-feed',[14.19,.4,-7.8],[14.19,.4,-5.55],.095,blue);
 for(const z of [-7.7,-6.9,-6.1]){pipe('pump-riser',[14.08,.4,z],[14.08,2.78,z],.085,blue);pipe('pump-riser-collar',[14.08,2.35,z],[14.08,2.40,z],.11,steel);}
 pipe('pump-upper-feed',[14.08,2.1,-7.7],[14.08,2.1,-5.6],.095,blue);
 pipe('pump-red-pipe',[14.08,1.8,-7.92],[14.08,2.78,-7.92],.055,red);
 pipe('pump-black-drain',[14.13,.05,-5.58],[14.13,2.78,-5.58],.13,black);
 for(const y of [.2,1.3,2.4])pipe('pump-drain-collar',[14.13,y,-5.58],[14.13,y+.045,-5.58],.145,steel);
 box('pump-cable-tray',13.99,1.1,-6.7,.025,.08,2.4,steel);
 }
 // Undocumented fixtures remain explicitly tagged simulator placeholders, 4000K.
 if(!cut){const colour=lightColour(4000),on=settings.lampsOn!==false,glow=mat('#fff9ed',{emissive:colour,emissiveIntensity:on?1.1:0});
  for(const [x,z] of [[15.8,-6.65],[16,-3.5],[20,-3.5],[12.6,-9.1]]){
   if(z<-5){box('common-simulator-lamp',x,2.77,z,.38,.035,.38,white);box('common-simulator-diffuser',x,2.745,z,.33,.012,.33,glow);}
   if(on){const l=new THREE.PointLight(colour,15,6,2);l.position.set(x,2.65,z);l.userData={fixtureLight:true,kelvin:4000,positionInferred:true,source:'simulator-placeholder'};root.add(l);}
  }
 }
 if(!cut){const on=settings.lampsOn!==false,colour=lightColour(4000),diffuser=mat('#f4f1e9',{emissive:colour,emissiveIntensity:on?1.2:0});
  for(const [x,z] of [[14.1,-1.05],[15.1,-1.05],[16.1,-1.05],[17.1,-1.05],[15.4,-4],[17,-4],[19,-4],[20.6,-4]]){
   item(cylinder,white,[x,2.735,z],[.065,.025,.065],null,'lobby-round-downlight');item(cylinder,diffuser,[x,2.719,z],[.054,.008,.054],null,'lobby-downlight-diffuser');
  }
 }
 for(const b of batches.values()){const mesh=new THREE.InstancedMesh(b.geo,b.m,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.name=b.name;mesh.castShadow=!b.name.includes('joint');mesh.receiveShadow=true;mesh.userData={source:b.name.startsWith('pump-')?'pump-room-photo':b.name.startsWith('lobby-')||b.name.startsWith('service-landing')||b.name.startsWith('service-controller')?'lobby-oct24':'building-plan',dimensionsInferred:true,...(/joint|step-nosing|lift-slot/.test(b.name)?{tourNonPhysical:true}:{})};(b.name.startsWith('pump-')?equipment:root).add(mesh);}
 return root;
}
