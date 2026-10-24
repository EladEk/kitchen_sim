import * as THREE from 'three';
import {LOBBY_POLYGON,PUMP_ROOM} from './common-spaces.mjs';
import {LOBBY_BENCHES} from './lobby-reference.mjs';
import {lightColour} from './lighting-controls.mjs';
// Furniture-free finishes leave the documented circulation and door swings clear.
// Equipment topology follows 298244.jpg; size/orientation are explicit estimates.
export function buildCommonSpaces({parent,resources,settings,cut=false}){
 const root=new THREE.Group();root.name='common-spaces';root.userData={source:'building-plan',page:3};parent.add(root);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,...extra});resources.push(m);return m;};
 const white=mat('#eeece5'),blue=mat('#224e62',{metalness:.45,roughness:.4}),steel=mat('#a5aba7',{metalness:.75,roughness:.3}),black=mat('#303633'),cream=mat('#dfd8bc',{roughness:.42}),red=mat('#81443c'),stone=mat('#cbc5ba',{roughness:.55}),concrete=mat('#aca99e'),grout=mat('#b5b1a8');
 const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,16);resources.push(cube,cylinder);
 const batches=new Map(),dummy=new THREE.Object3D();
 function item(geo,m,p,s,q=null,name='common-detail'){const key=geo.uuid+m.uuid+name;let b=batches.get(key);if(!b)batches.set(key,b={geo,m,name,matrices:[]});dummy.position.set(...p);dummy.scale.set(...s);dummy.quaternion.copy(q||new THREE.Quaternion());dummy.updateMatrix();b.matrices.push(dummy.matrix.clone());}
 const box=(name,x,y,z,w,h,d,m)=>item(cube,m,[x,y,z],[w,h,d],null,name);
 function pipe(name,a,b,r,m){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());item(cylinder,m,va.add(vb).multiplyScalar(.5).toArray(),[r,dir.length(),r],q,name);}
 function floor(poly,m,name){const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const g=new THREE.ShapeGeometry(shape);g.rotateX(Math.PI/2);resources.push(g);m.side=THREE.DoubleSide;const mesh=new THREE.Mesh(g,m);mesh.position.y=.025;mesh.name=name;mesh.receiveShadow=true;root.add(mesh);}
 floor(LOBBY_POLYGON,stone,'lobby-floor-finish');floor(PUMP_ROOM.polygon,concrete,'pump-floor-finish');
 // Narrow seams cut to the actual lobby polygon, never long lines through walls.
 function inside([x,z],poly){let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;}
 for(let x=12;x<22;x+=.8)for(let z=-7.7;z<-.4;z+=.05)if(inside([x,z],LOBBY_POLYGON)&&inside([x,z+.05],LOBBY_POLYGON))box('lobby-tile-joints',x,.027,z+.025,.002,.001,.05,grout);
 for(let z=-7.7;z<-.4;z+=.8)for(let x=12;x<22;x+=.05)if(inside([x,z],LOBBY_POLYGON)&&inside([x+.05,z],LOBBY_POLYGON))box('lobby-tile-joints',x+.025,.027,z,.05,.001,.002,grout);
 // Video-based finishes, surface-mounted on the existing plan walls.
 const oak=mat('#a49884'),panel=mat('#d8d4ca'),shadow=mat('#6b6962');
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
 for(let x=18.73;x<21.6;x+=.56){
  box('lobby-flush-service-panel',x,panelHeight/2,-5.59,.548,panelHeight,.028,panel);
  if(!cut)box('lobby-service-handle',x+.21,1.05,-5.565,.018,.13,.022,black);
 }
 for(const b of LOBBY_BENCHES){const x=(b.minX+b.maxX)/2,z=(b.minZ+b.maxZ)/2,w=b.maxX-b.minX,d=b.maxZ-b.minZ;
  box('lobby-stone-bench',x,.46,z,w,.09,d,stone);
  box('lobby-bench-support',x,.235,z,w-.12,.36,Math.max(.12,d-.12),panel);
 }
 if(!cut){
  // Recessed round ceiling fixtures and the narrow ceiling shadow line.
  for(const [x,z] of [[15.8,-3.5],[18.7,-4],[20.6,-4],[16.5,-1.15]]){
   item(cylinder,white,[x,2.745,z],[.075,.025,.075],null,'lobby-round-downlight');
  }
  box('lobby-ceiling-reveal',18.6,2.75,-5.10,6.02,.008,.012,shadow);
  box('lobby-ceiling-reveal',21.5,2.75,-3.75,.012,.008,2.7,shadow);
 }
 const equipment=new THREE.Group();equipment.name='pump-equipment';equipment.userData={source:'pump-room-photo',dimensionsInferred:true,orientationInferred:true,pumps:3};root.add(equipment);
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
   box('common-simulator-lamp',x,2.77,z,.38,.035,.38,white);box('common-simulator-diffuser',x,2.745,z,.33,.012,.33,glow);
   if(on){const l=new THREE.PointLight(colour,15,6,2);l.position.set(x,2.65,z);l.userData={fixtureLight:true,kelvin:4000,positionInferred:true,source:'simulator-placeholder'};root.add(l);}
  }
 }
 for(const b of batches.values()){const mesh=new THREE.InstancedMesh(b.geo,b.m,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.name=b.name;mesh.castShadow=!b.name.includes('joint');mesh.receiveShadow=true;mesh.userData={source:b.name.startsWith('pump-')?'pump-room-photo':b.name.startsWith('lobby-')?'lobby-oct24':'simulator-placeholder',dimensionsInferred:true};(b.name.startsWith('pump-')?equipment:root).add(mesh);}
 return root;
}
