import * as THREE from 'three';
import {SITE_TRACE,SITE_CHAMBERS,COMMON_ENTRY_DOORS} from './building-site.mjs';
import {createSurfacePalette,metricSurfaceUVs} from './surface-materials.mjs';

export function buildSiteContext({root,resources,picks,settings,cut=false}){
 const group=new THREE.Group();group.name='building-4102-surroundings';group.userData={part:'building-site-context',source:'building-plan',page:2};root.add(group);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85,...extra});resources.push(m);return m;},surface=createSurfacePalette(resources),pavers=surface('cement','#b6b2a7'),drive=surface('cement','#989b96'),paint=mat('#ececdd'),kerb=surface('cement','#c9c6bc'),cover=mat('#555b56',{metalness:.3,roughness:.72}),blue=mat('#467d9b');
 const cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);
 function box(x,y,z,w,h,d,m,data=null){const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.receiveShadow=mesh.castShadow=true;if(data)mesh.userData=data;group.add(mesh);if(data?.action)picks.push(mesh);return mesh;}
 function slab(poly,y,m,data=null){const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=new THREE.ShapeGeometry(shape);geo.rotateX(Math.PI/2);metricSurfaceUVs(geo);resources.push(geo);const mesh=new THREE.Mesh(geo,m);mesh.position.y=y;mesh.receiveShadow=true;mesh.userData=data||{};group.add(mesh);if(data?.action)picks.push(mesh);return mesh;}
 function line(a,b,y,w,m){const dx=b[0]-a[0],dz=b[1]-a[1],mesh=box((a[0]+b[0])/2,y,(a[1]+b[1])/2,Math.hypot(dx,dz),.012,w,m);mesh.rotation.y=-Math.atan2(dz,dx);return mesh;}
 // Metre UVs carry restrained offset paving joints; visual profile/kerb height
 // are illustrative, independent of the source-traced horizontal polygons.
 for(const m of [pavers,drive]){m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 brick=vMapUv*vec2(5.0,10.0);brick.x+=mod(floor(brick.y),2.0)*.5;
 vec2 edge=min(fract(brick),1.0-fract(brick));float grout=1.0-smoothstep(.009,.025,min(edge.x,edge.y));
 diffuseColor.rgb*=mix(1.0,.74,grout);
 `);};m.customProgramCacheKey=()=> 'site-pavers-r47';}
 for(const road of SITE_TRACE.roads)slab(road.polygon,-.025,drive,{part:'site-drive-lane',source:'building-plan',page:2});
 for(const way of SITE_TRACE.walkable)slab(way.polygon,-.008,pavers,{part:'site-sidewalk',source:'building-plan',page:way.page,id:way.id});
 for(const bay of SITE_TRACE.parking){
  const data={action:'building',buildingId:bay.id,part:'site-parking-bay',source:'building-plan',page:2};slab(bay.polygon,-.02,bay.accessible?blue:drive,data);bay.polygon.forEach((a,i)=>line(a,bay.polygon[(i+1)%bay.polygon.length],-.008,.045,paint));
  const xs=bay.polygon.map(p=>p[0]),zs=bay.polygon.map(p=>p[1]),center=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2],label=parkingLabel(bay.label,resources);
  if(label){label.position.set(center[0],.004,center[1]);label.rotation.x=-Math.PI/2;label.userData={...data,part:'site-parking-number'};group.add(label);picks.push(label);}
 }
 for(const path of SITE_TRACE.curbs||[])for(let i=1;i<path.points.length;i++)line(path.points[i-1],path.points[i],.015,.1,kerb);
 for(const chamber of SITE_CHAMBERS){
  if(chamber.unit===4)continue; // the owner's detailed cover keeps its stable ID
  const [x,z]=chamber.position,r=chamber.diameter/2,geo=new THREE.CylinderGeometry(r,r,.025,40);resources.push(geo);const mesh=new THREE.Mesh(geo,cover);mesh.position.set(x,.006,z);mesh.receiveShadow=true;mesh.userData={action:'building',buildingId:chamber.id,part:'site-inspection-cover',source:'building-plan',page:3,system:'sewage-or-drainage',symbolDiameter:true};group.add(mesh);picks.push(mesh);
  const rimGeo=new THREE.TorusGeometry(r-.018,.012,6,40);resources.push(rimGeo);const rim=new THREE.Mesh(rimGeo,kerb);rim.rotation.x=Math.PI/2;rim.position.set(x,.02,z);group.add(rim);for(const side of [-1,1])box(x+side*r*.55,.023,z,.065,.009,.025,kerb);
 }
 const meter=SITE_TRACE.features.find(p=>p.id==='site-main-water-meter');
 if(meter){const [x,z]=meter.position,[w,d,h]=meter.dimensions,data={action:'building',buildingId:meter.id,part:'site-main-meter-cabinet',heightInferred:true};box(x,h/2,z,w,h,d,kerb,data);for(let i=0;i<4;i++){const xx=x-w/2+(i+.5)*w/4;box(xx,h/2,z+d/2+.005,w/4-.012,h-.08,.02,paint,data);box(xx+w/8-.06,h*.5,z+d/2+.024,.018,.15,.02,cover,data);}}
 const entryGlass=mat('#a8c4ce',{transparent:true,opacity:.27,depthWrite:false,roughness:.18});
 for(const d of COMMON_ENTRY_DOORS){const end=settings.closedBuildingDoors?.includes(d.id)?d.closed:d.opened,dx=end[0]-d.hinge[0],dz=end[1]-d.hinge[1],width=Math.hypot(dx,dz),height=cut?.82:2.28,angle=-Math.atan2(dz,dx),data={action:'building-door',doorId:d.id,part:'site-common-entry-door',source:'building-plan',page:3};const pane=box((d.hinge[0]+end[0])/2,height/2,(d.hinge[1]+end[1])/2,width,height,.025,entryGlass,data);pane.rotation.y=angle;for(const q of [d.hinge,end])box(q[0],height/2,q[1],.04,height,.04,cover,data);for(const y of [.035,height-.035]){const rail=line(d.hinge,end,y,.04,cover);rail.userData=data;picks.push(rail);}}
 const fixed=box(21.8239,1.14,(-3.6998-2.7005)/2,.018,cut?.82:2.28,.9993,entryGlass);fixed.userData={part:'site-entry-fixed-glazing'};if(cut)fixed.position.y=.41;
 // Trace-defined entry points and common water rooms are inspectable at their
 // actual locations. No unrecorded meter-room equipment is invented.
 for(const f of SITE_TRACE.features.filter(f=>f.id!=='site-main-water-meter')){
  if(f.id.includes('entrance')){const [x,z]=f.position;box(x,2.38,z,.024,.08,1.2,cover,{action:'building',buildingId:f.id,part:'site-entry-header'});}
  else slab(f.polygon,.023,surface('cement',f.id==='site-water-reservoir'?'#a9bdc0':'#b5b6aa'),{action:'building',buildingId:f.id,part:'site-common-room-floor'});
 }
 group.traverse(o=>{o.userData.buildingFloor=0;});return group;
}

function parkingLabel(label,resources){
 if(typeof document==='undefined')return null;const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.clearRect(0,0,128,96);ctx.fillStyle='#f1f0df';ctx.font='bold 66px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,64,48);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const geo=new THREE.PlaneGeometry(.7,.525),m=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});resources.push(geo,m,texture);return new THREE.Mesh(geo,m);
}
