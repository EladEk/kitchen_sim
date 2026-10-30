import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRealisticProps} from './realistic-props.mjs';
import {createSurfaceDetails} from './surface-detail.mjs';
import {FINISH_GRID_GLSL} from '../src/building-finish-shaders.mjs';
import {createSiteLayout,bounds,inside,contains,rectanglePolygon,intersects} from './site-layout.mjs';
import {DISTRICT_GROUND,DISTRICT,districtFootprint} from './district-layout.mjs';

export function createDistrictSite(source,{mobile=false,includeFence=()=>true,includeCar=()=>true}={}){
 const layout=createSiteLayout(source),group=new THREE.Group(),geometries=[],materials=[],textures=[],surfaces=new Map(),boxes=new Map();group.name='public-district-development';const details=createSurfaceDetails({mobile});
 function material(color,kind='plain',extra={}){
  const m=new THREE.MeshStandardMaterial({color,roughness:.88,...extra});materials.push(m);
  if(['grass','asphalt','paving','stone'].includes(kind))details.apply(m,kind==='stone'?'limestone':kind);
  if(kind!=='plain'){
   m.onBeforeCompile=s=>{s.vertexShader='varying vec2 vSiteXZ;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 siteVertex=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
    siteVertex=instanceMatrix*siteVertex;
    #endif
    vSiteXZ=(modelMatrix*siteVertex).xz;`);s.fragmentShader='varying vec2 vSiteXZ;\n'+FINISH_GRID_GLSL+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float grain=fract(sin(dot(floor(vSiteXZ*125.0),vec2(127.1,311.7)))*43758.5453);
    float footprint=max(fwidth(vSiteXZ.x),fwidth(vSiteXZ.y));
    diffuseColor.rgb*=1.0+(grain-.5)*.07*(1.0-smoothstep(.004,.03,footprint));
    ${kind==='paving'?`vec2 tile=vSiteXZ*vec2(2.0,4.0);tile.x+=mod(floor(tile.y),2.0)*.5;vec2 edge=min(fract(tile),1.0-fract(tile))*vec2(.5,.25);float gx=finishGridCoverage(edge.x,fwidth(vSiteXZ.x),.003,.5),gz=finishGridCoverage(edge.y,fwidth(vSiteXZ.y),.003,.25);float grout=1.0-(1.0-gx)*(1.0-gz);diffuseColor.rgb*=mix(1.0,.75,grout);`:''}
   `);};m.customProgramCacheKey=()=> 'district-surface-r96-'+kind;
  }return m;
 }
 const parkingPavers=material('#8b8b83','paving');
 const grass=material('#7f9565','grass'),asphalt=material('#454a4e','asphalt'),paving=material('#c9c6bb','paving'),stone=material('#d2c8b3','stone'),cap=material('#e0d9c9'),metal=material('#303c3c','plain',{roughness:.43,metalness:.52}),paint=material('#eee9d4'),blue=material('#407eae');
 function slab(poly,y,m,holes=[]){
  if(poly.length<3)return;const s=new THREE.Shape();poly.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
  for(const ring of holes){const path=new THREE.Path();ring.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));path.closePath();s.holes.push(path);}
  const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);g.translate(0,y,0);if(!surfaces.has(m))surfaces.set(m,[]);surfaces.get(m).push(g);
 }
 function box(x,y,z,w,h,d,m,angle=0){if(!boxes.has(m))boxes.set(m,[]);boxes.get(m).push([x,y,z,w,h,d,angle]);}
 function line(a,b,y,h,w,m){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len>.015)box((a[0]+b[0])/2,y,(a[1]+b[1])/2,len,h,w,m,-Math.atan2(dz,dx));}
 const cover=source.groundCover;
 if(cover?.revision!==100)throw Error('נתוני הקרקע אינם תואמים לגרסה R100. יש לרענן לאחר העלאת הגרסה.');
 for(const layer of cover.grass)for(const [outer,...holes] of layer.polygons)slab(outer,layer.y,grass,holes);
 for(const r of layout.roadSurfaces)slab(rectanglePolygon(r),-.04,r.kind==='street'?asphalt:parkingPavers);
 for(const p of layout.parking)slab(p.polygon,-.039,parkingPavers);
 for(const w of layout.sidewalks)slab(w.polygon,-.012,paving);
 for(const r of layout.islands){const p=rectanglePolygon(r);p.forEach((a,i)=>line(a,p[(i+1)%4],.05,.12,.13,cap));}
 // Standard perimeter has a low masonry plinth and black vertical bars,
 // matching the supplied exterior photographs. Internal garden dividers are
 // plain masonry; no owner-specific privacy panels are copied to neighbours.
 for(const f of layout.fences.filter(includeFence)){
  const dx=f.b[0]-f.a[0],dz=f.b[1]-f.a[1],len=Math.hypot(dx,dz),height=f.divider?1.55:.3;
  line(f.a,f.b,height/2,height,.16,stone);line(f.a,f.b,height+.025,.05,.20,cap);
  if(f.divider)continue;
  for(const y of [.36,1.31])line(f.a,f.b,y,.045,.055,metal);
  const n=Math.ceil(len/.13);for(let i=0;i<=n;i++)box(f.a[0]+dx*i/n,.835,f.a[1]+dz*i/n,.025,1.02,.025,metal);
  const posts=Math.ceil(len/2.2);for(let i=0;i<=posts;i++)box(f.a[0]+dx*i/posts,.82,f.a[1]+dz*i/posts,.06,1.08,.06,metal);
 }
 for(const c of layout.curbs)line(c.a,c.b,.045,.11,.13,cap);
 // Illustrative drainage grates sit on an existing drive, never in a bay or
 // garden. Thin kerb joints supply readable scale without changing the layout.
 const recess=material('#343937','plain',{roughness:.92}),grate=material('#737a78','plain',{roughness:.66,metalness:.55});let drains=0;
 for(const c of layout.curbs){
  const dx=c.b[0]-c.a[0],dz=c.b[1]-c.a[1],length=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
  for(let t=.85;t<length-.2;t+=1.1){const x=c.a[0]+dx*t/length,z=c.a[1]+dz*t/length;box(x,.103,z,.008,.004,.135,recess,angle);}
  if(length<7||drains>=64)continue;
  for(let t=3.5;t<length-1&&drains<64;t+=22){
   let spot;for(const side of [-1,1]){const x=c.a[0]+dx*t/length-dz/length*.38*side,z=c.a[1]+dz*t/length+dx/length*.38*side;
    if(layout.roads.some(r=>contains(r,[x,z]))&&!layout.parking.some(b=>inside([x,z],b.polygon))){spot=[x,z];break;}}
   if(!spot)continue;const [x,z]=spot;box(x,-.026,z,.48,.015,.30,recess,angle);
   for(const side of [-1,1])box(x-dz/length*.14*side,-.015,z+dx/length*.14*side,.48,.012,.018,grate,angle);
   for(let n=-.2;n<=.201;n+=.05)box(x+dx/length*n,-.012,z+dz/length*n,.014,.016,.28,grate,angle);drains++;
  }
 }
 // Paint and number decals retain a depth bias when their actual centimetre
 // height becomes subpixel in a distant overview.
 for(const m of [paint,blue])Object.assign(m,{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
 // Every bay is individually outlined, with deduplicated shared paint edges.
 const painted=new Set();for(const b of layout.parking)b.polygon.forEach((a,i)=>{const end=b.polygon[(i+1)%b.polygon.length],key=[a,end].map(p=>p.map(v=>v.toFixed(2)).join(',')).sort().join('|');if(painted.has(key))return;painted.add(key);line(a,end,-.025,.012,.055,b.accessible?blue:paint);});
 for(const b of layout.parking.filter(b=>b.accessible)){const r=bounds(b.polygon);for(let x=r.minX+.2;x<r.maxX-.2;x+=.45)line([x,r.minZ+.15],[Math.min(x+.7,r.maxX-.15),r.maxZ-.15],-.021,.01,.06,blue);}
 // Markings stop at the junctions. Perimeter lanes use actual world lengths,
 // rather than a texture that stretches with the road or floats above it.
 const {west,east,north,south}=DISTRICT_GROUND;
 for(const x of [west,east])for(let z=north+9;z<south-8;z+=6)if(!layout.roads.some(r=>r.kind==='drive'&&contains(r,[x,z])))line([x,z],[x,z+2.7],-.021,.01,.11,paint);
 for(const z of [north,south])for(let x=west+9;x<east-8;x+=6)if(!layout.roads.some(r=>r.kind==='drive'&&contains(r,[x,z])))line([x,z],[x+2.7,z],-.021,.01,.11,paint);
 for(const c of layout.crossings)for(let n=-2.4;n<=2.4;n+=.8)box(c.x+(c.axis==='z'?n:0),-.018,c.z+(c.axis==='x'?n:0),c.axis==='x'?3.5:.45,.012,c.axis==='x'?.45:3.5,paint);

 // One small texture atlas supplies real source-plan plot-1410 numbers 1–204 and N1–N5.
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=896;const ctx=canvas.getContext('2d');
  if(ctx){ctx.clearRect(0,0,1024,896);ctx.fillStyle='#eee9d4';ctx.font='bold 43px Arial';ctx.textAlign='center';ctx.textBaseline='middle';const labels=[...Array.from({length:204},(_,i)=>String(i+1)),'N1','N2','N3','N4','N5'];labels.forEach((s,i)=>ctx.fillText(s,(i%16)*64+32,Math.floor(i/16)*64+32));const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);const m=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});materials.push(m);const parts=[];
   for(const b of layout.parking.filter(b=>b.traced)){const r=bounds(b.polygon),x=(r.minX+r.maxX)/2,z=(r.minZ+r.maxZ)/2,i=labels.indexOf(b.label),g=new THREE.PlaneGeometry(.8,.6),uv=g.attributes.uv;for(let j=0;j<uv.count;j++){uv.setXY(j,(i%16+uv.getX(j))/16,1-(Math.floor(i/16)+1-uv.getY(j))/14);}g.rotateX(-Math.PI/2);if(r.maxX-r.minX>r.maxZ-r.minZ)g.rotateY(Math.PI/2);g.translate(x,-.012,z);parts.push(g);}
   const g=mergeGeometries(parts);parts.forEach(g=>g.dispose());geometries.push(g);group.add(new THREE.Mesh(g,m));
  }
 }
 for(const [m,parts] of surfaces){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());geometries.push(g);const mesh=new THREE.Mesh(g,m);mesh.userData.groundSurface=m===grass?'grass':m===parkingPavers?'parking':m===asphalt?'street':'sidewalk';mesh.receiveShadow=true;group.add(mesh);}
 const cube=new THREE.BoxGeometry(1,1,1);geometries.push(cube);const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 for(const [m,items] of boxes){const mesh=new THREE.InstancedMesh(cube,m,items.length);items.forEach(([x,y,z,w,h,d,a],i)=>{q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,a);matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(w,h,d));mesh.setMatrixAt(i,matrix);});mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 // Representative vehicles fit completely within their own marked bay.
 const cars=layout.parking.filter((b,i)=>!b.accessible&&i%7===0&&includeCar(b)).map(b=>{const r=bounds(b.polygon),alongX=r.maxX-r.minX>r.maxZ-r.minZ;return {x:(r.minX+r.maxX)/2,z:(r.minZ+r.maxZ)/2,angle:alongX?Math.PI/2:0,length:Math.min(4.1,Math.max(r.maxX-r.minX,r.maxZ-r.minZ)-.22)};});
 const bodies2D=DISTRICT.map(b=>districtFootprint(b,2)),points=[],forbidden=layout.gardens.map(g=>g.plot).concat(layout.parking.map(b=>b.polygon),layout.sidewalks.map(w=>w.polygon));
 for(let x=west+12;x<east-8;x+=11)for(let z=north-45;z<south-6;z+=12){if(bodies2D.some(r=>contains(r,[x,z]))||layout.roads.some(r=>contains({...r,minX:r.minX-2,maxX:r.maxX+2,minZ:r.minZ-2,maxZ:r.maxZ+2},[x,z]))||forbidden.some(p=>intersects({minX:x-2.4,maxX:x+2.4,minZ:z-2.4,maxZ:z+2.4},bounds(p))))continue;points.push([x,z]);}
 const props=createRealisticProps({trees:points,cars,mobile});group.add(props.group);
 group.updateMatrixWorld(true);
 surfaces.clear();boxes.clear();
 let disposed=false;
 return {group,layout,update:(position,now)=>props.update(position,now),props,details:{drains},dispose(){if(disposed)return;disposed=true;props.dispose();for(const o of group.children)if(o.isInstancedMesh)o.dispose();details.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();geometries.length=materials.length=textures.length=0;surfaces.clear();boxes.clear();}};
}
