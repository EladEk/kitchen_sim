import * as THREE from 'three';
import {mergeWallSurfaces} from './wall-surface-merge.mjs';
import {inVariantSlot,hasVariantSlot} from './model-variants.mjs';
import {motionAncestor,motionRoots,createMotionCopy} from './model-motions.mjs';
import {createDoorContext} from './door-context.mjs';
import {compactRenderAttributes} from './compact-attributes.mjs';
import {DISTRICT,PLAN_CENTER,PLAN_ROTATION} from './district-layout.mjs';
import {inside} from './navigation.mjs';
import {createDistrictSite} from './site-scene.mjs';
export {DISTRICT} from './district-layout.mjs';
export {PLAN_ROTATION} from './district-layout.mjs';
export const districtSolar=solar=>({...solar,northBearing:((solar.northBearing??135)+90)%360});
const center=PLAN_CENTER;
export function buildingTransform(b){return new THREE.Matrix4().makeTranslation(center[0]+b.x,0,center[1]+b.z).multiply(new THREE.Matrix4().makeRotationY(b.angle+PLAN_ROTATION)).multiply(new THREE.Matrix4().makeScale(b.mirror?-1:1,1,1)).multiply(new THREE.Matrix4().makeTranslation(-center[0],0,-center[1]));}
export function districtLocation(position,data){
 for(const b of DISTRICT){const p=position.clone().applyMatrix4(buildingTransform(b).invert()),floor=Math.max(0,Math.min(8,Math.floor((p.y-1.62+.35)/data.storey))),onBody=p.x>=-4.1&&p.x<=27.5&&p.z>=-23.7&&p.z<=15.7;if(onBody||data.floors?.[floor]?.units.some(u=>u.displayPolygons?.some(poly=>inside([p.x,p.z],poly))))return {building:b.id,floor,position:p};}
 return {building:null,floor:0,position};
}
// The public entry supplies only its sanitized snapshot. Authorized entries
// may supply local variants; no private module is imported or fetched here.
// Common surfaces stay shared across the entire district.
export function createDistrict(template,siteData,{mobile=false,variants=new Map(),siteOptions={},doorController=null}={}){
 const group=new THREE.Group(),geometries=[],materials=[],textures=[],buckets=new Map(),furnitureBatches=new Map(),copies=[],moving=[];template.updateMatrixWorld(true);
 const add=(o,matrix)=>{if(o.userData.furnitureRender){const key=JSON.stringify([o.geometry.uuid,[o.material].flat().map(m=>m.uuid)]);if(!furnitureBatches.has(key))furnitureBatches.set(key,{geometry:o.geometry,material:o.material,matrices:[],kind:o.userData.furnitureRender});furnitureBatches.get(key).matrices.push(matrix);return;} // The baseline is already sanitized. Keep all balcony returns and ground slabs.

 const mats=[o.material].flat(),total=o.geometry.index?.count??o.geometry.attributes.position.count;const ranges=mats.length>1?o.geometry.groups:[{start:0,count:total,materialIndex:0}];
 for(const range of ranges){const mat=mats[range.materialIndex];if(!mat||mat.opacity===0)continue;if(!buckets.has(mat))buckets.set(mat,new Map());const stone=mat.userData.publicFinish==='stone',detail=(!stone&&o.userData.exterior===false?'interior':'exterior')+'|'+(stone||o.castShadow?'1':'0'),byDetail=buckets.get(mat);if(!byDetail.has(detail))byDetail.set(detail,[]);byDetail.get(detail).push({geometry:o.geometry,matrix,start:range.start,count:range.count});}
 };
 const partitioned=variants.size>0&&hasVariantSlot(template)&&[...variants.values()].every(hasVariantSlot);
 const plans=partitioned?[
  {source:template,members:DISTRICT,include:o=>!inVariantSlot(o)},
  {source:template,members:DISTRICT.filter(b=>!variants.has(b.id)),include:inVariantSlot},
  ...[...variants].map(([id,source])=>({source,members:DISTRICT.filter(b=>b.id===id),include:inVariantSlot}))
 ]:[{source:template,members:DISTRICT.filter(b=>!variants.has(b.id)),include:()=>true},...[...variants].map(([id,source])=>({source,members:DISTRICT.filter(b=>b.id===id),include:()=>true}))];
 for(const {source,members,include} of plans){
  if(!members.length)continue;source.updateWorldMatrix(true,true);const inverse=source.matrixWorld.clone().invert();
  for(const motion of motionRoots(source)){if(motion.userData.tourDoor||!include(motion))continue;for(const b of members){const copy=createMotionCopy(motion,source),wrapper=new THREE.Group();wrapper.matrixAutoUpdate=false;wrapper.matrix.copy(buildingTransform(b));wrapper.add(copy.group);group.add(wrapper);moving.push({id:b.id,wrapper,copy});}}
  source.traverseVisible(o=>{if(!o.isMesh||o.userData.furnitureCollisionProxy||motionAncestor(o,source)||!include(o))return;const base=inverse.clone().multiply(o.matrixWorld);if(o.isInstancedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);add(o,base.clone().multiply(m));}}else add(o,base);});
  for(const [mat,byDetail] of buckets)for(const [flags,parts] of byDetail){const [detail,cast]=flags.split('|');const geo=mergeDistrictParts(parts,{wallFinish:['stone','render'].includes(mat.userData.publicFinish)});if(!geo)continue;geometries.push(geo);
   for(const mirror of [false,true]){const buildings=members.filter(b=>!!b.mirror===mirror);if(!buildings.length)continue;const geometry=mirror?mirroredGeometry(geo):geo;if(mirror)geometries.push(geometry);const mesh=new THREE.InstancedMesh(geometry,mat,buildings.length);buildings.forEach((b,i)=>mesh.setMatrixAt(i,buildingTransform({...b,mirror:false})));mesh.castShadow=cast==='1';mesh.receiveShadow=true;mesh.userData={district:true,detail};copies.push({mesh,buildings,detail});group.add(mesh);}
  }
  for(const batch of furnitureBatches.values())for(const mirror of [false,true]){const buildings=members.filter(b=>!!b.mirror===mirror);if(!buildings.length)continue;const geometry=mirror?mirroredGeometry(batch.geometry,[0,0]):batch.geometry;if(mirror)geometries.push(geometry);const mesh=new THREE.InstancedMesh(geometry,batch.material,buildings.length*batch.matrices.length);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={district:true,detail:'interior',furnitureRender:batch.kind,tourNonPhysical:true};copies.push({mesh,buildings,detail:'interior',localMatrices:batch.matrices,mirror});group.add(mesh);}
  furnitureBatches.clear();buckets.clear();
 }
 const doorContext=createDoorContext(plans,{getOpen:doorController?.isOpen,transform:buildingTransform,mirrorGeometry:g=>mirroredGeometry(g,[0,0])});group.add(doorContext.group);
 plans.length=0;
 // Source transforms and merge staging records are no longer needed. Keeping
 // this map in the disposal closure retained tens of thousands of objects.
 buckets.clear();
 const site=createDistrictSite(siteData,{mobile,...siteOptions});group.add(site.group);
 // Readable building numbers are scene labels, never camera-facing UI overlays.
 if(typeof document!=='undefined')for(const b of DISTRICT){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=b.id==='4102'?'#315d50':'#36586c';ctx.fillRect(0,0,256,128);ctx.fillStyle='white';ctx.font='bold 70px Arial';ctx.textAlign='center';ctx.fillText(b.id,128,89);const tex=new THREE.CanvasTexture(canvas);textures.push(tex);const mat=new THREE.SpriteMaterial({map:tex,depthTest:true});materials.push(mat);const label=new THREE.Sprite(mat);label.position.set(center[0]+b.x,34,center[1]+b.z);label.scale.set(10,5,1);group.add(label);}
 let active='4102',doorView={},doorViewKey='',lastDetailUpdate=-Infinity;const nearby=new Set(DISTRICT.map(b=>b.id)),threshold=mobile?90:130;
 const applyCopies=()=>{updateBuildingCopies(copies,active,(b,copy)=>copy.detail!=='interior'||nearby.has(b.id),{includeActive:!!doorView.includeActive});for(const m of moving)m.wrapper.visible=(doorView.includeActive||m.id!==active)&&nearby.has(m.id);doorContext.setVisibility(active,nearby,{...doorView,includeActive:!!doorController});};
 const setActiveBuilding=(id,view={})=>{const key=JSON.stringify([!!view.walking,view.floor??0,!!view.includeActive]);if(active===id&&doorViewKey===key&&lastDetailUpdate!==-Infinity)return;active=id;doorView=view;doorViewKey=key;applyCopies();};
 const update=(position,now=0,{walking=false,detailScale=1}={})=>{site.update(position,now,{detailScale,walking});if(now-lastDetailUpdate<250)return;lastDetailUpdate=now;let changed=false;const radius=(walking?36:threshold)*Math.max(.5,detailScale);
  for(const b of DISTRICT){const distance=Math.hypot(position.x-center[0]-b.x,position.y-14,position.z-center[1]-b.z),show=distance<radius*(nearby.has(b.id)?1.1:.9);if(show!==nearby.has(b.id)){show?nearby.add(b.id):nearby.delete(b.id);changed=true;}}
  if(changed)applyCopies();
 };
 setActiveBuilding('4102');group.updateMatrixWorld(true);
 let disposed=false;
 return {group,layout:site.layout,get preparationObjects(){return disposed?[]:[...copies.map(c=>c.mesh),...site.preparationObjects];},collisionRoot:site.group,setActiveBuilding,update,props:site.props,doorStats:doorContext.stats,syncDoor:(building,id)=>doorContext.sync(building,id),syncVariant(id){for(const m of moving)if(m.id===id)m.copy.sync();group.updateMatrixWorld(true);},dispose(){if(disposed)return;disposed=true;site.dispose();doorContext.dispose();moving.forEach(m=>m.copy.dispose());moving.length=0;copies.forEach(c=>c.mesh.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();copies.length=0;buckets.clear();geometries.length=materials.length=textures.length=0;nearby.clear();}};
}

// Reflections are baked, with corrected winding: negative instance matrices
// are unsupported by Three's InstancedMesh and can hide exterior faces.
export function mirroredGeometry(source,pivot=center){
 const geo=source.clone();geo.applyMatrix4(new THREE.Matrix4().makeTranslation(pivot[0],0,pivot[1]).multiply(new THREE.Matrix4().makeScale(-1,1,1)).multiply(new THREE.Matrix4().makeTranslation(-pivot[0],0,-pivot[1])));
 if(geo.index){const a=geo.index.array;for(let i=0;i<a.length;i+=3){const v=a[i+1];a[i+1]=a[i+2];a[i+2]=v;}geo.index.needsUpdate=true;}
 else for(const attr of Object.values(geo.attributes)){const n=attr.itemSize;for(let i=0;i<attr.count;i+=3)for(let k=0;k<n;k++){const a=(i+1)*n+k,b=(i+2)*n+k,v=attr.array[a];attr.array[a]=attr.array[b];attr.array[b]=v;}attr.needsUpdate=true;}
 return geo;
}

export function updateBuildingCopies(copies,id,include=()=>true,{includeActive=false}={}){for(const copy of copies){const {mesh,buildings}=copy,shown=buildings.filter(b=>(includeActive||b.id!==id)&&include(b,copy));if(copy.localMatrices){mesh.count=shown.length*copy.localMatrices.length;let i=0;const flip=new THREE.Matrix4().makeScale(-1,1,1);for(const b of shown)for(const local of copy.localMatrices){const m=buildingTransform(b).multiply(local);if(copy.mirror)m.multiply(flip);mesh.setMatrixAt(i++,m);}}else{mesh.count=shown.length;shown.forEach((b,i)=>mesh.setMatrixAt(i,buildingTransform({...b,mirror:false})));}mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.count)mesh.computeBoundingSphere();}}

// Allocate the final buffers once. Cloning tens of thousands of small instance
// geometries before merging them caused high allocation pressure on phones.
export function mergeDistrictParts(parts,{wallFinish=false}={}){
 if(wallFinish){const geometry=mergeWallSurfaces(parts);return geometry&&compactRenderAttributes(geometry);}
 let vertices=0,indices=0;
 for(const {geometry:g,start=0,count:partCount} of parts){const end=Math.min(g.index?.count??g.attributes.position.count,start+(partCount??Infinity));indices+=Math.max(0,end-start);if(g.index){const used=new Set();for(let i=start;i<end;i++)used.add(g.index.getX(i));vertices+=used.size;}else vertices+=Math.max(0,end-start);}
 // Retain indexed source vertices, including their UV seams and normals. The
 // old merge expanded every triangle and doubled that cost for reflected copies.
 if((indices-vertices)*32>indices*(vertices>65535?4:2))return mergeIndexedParts(parts,vertices,indices);
 const count=parts.reduce((n,p)=>n+(p.count??p.geometry.index?.count??p.geometry.attributes.position.count),0);if(!count)return null;
 const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),v=new THREE.Vector3(),n=new THREE.Vector3();let at=0;
 for(const {geometry:g,matrix,start=0,count:partCount} of parts){const p=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv,index=g.index,length=index?.count??p.count,nm=new THREE.Matrix3().getNormalMatrix(matrix),reverse=matrix.determinant()<0;
  for(let i=start;i<Math.min(length,start+(partCount??length));i++){const triangle=i-i%3,offset=reverse&&i%3?3-i%3:i%3,j=index?index.getX(triangle+offset):triangle+offset;v.fromBufferAttribute(p,j).applyMatrix4(matrix);if(no)n.fromBufferAttribute(no,j).applyMatrix3(nm).normalize();else n.set(0,1,0);positions[at*3]=v.x;positions[at*3+1]=v.y;positions[at*3+2]=v.z;normals[at*3]=n.x;normals[at*3+1]=n.y;normals[at*3+2]=n.z;uvs[at*2]=uv?.getX(j)??0;uvs[at*2+1]=uv?.getY(j)??0;at++;}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.BufferAttribute(uvs,2));return compactRenderAttributes(geo);
}

function mergeIndexedParts(parts,vertices,count){
 const positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),uvs=new Float32Array(vertices*2),indices=vertices>65535?new Uint32Array(count):new Uint16Array(count);
 const v=new THREE.Vector3(),n=new THREE.Vector3();let at=0,corner=0;
 for(const {geometry:g,matrix,start=0,count:partCount} of parts){
  const p=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv,index=g.index,length=index?.count??p.count,nm=new THREE.Matrix3().getNormalMatrix(matrix),reverse=matrix.determinant()<0,map=new Map();
  for(let i=start;i<Math.min(length,start+(partCount??length));i++){
   const triangle=i-i%3,offset=reverse&&i%3?3-i%3:i%3,j=index?index.getX(triangle+offset):triangle+offset;
   let output=map.get(j);
   if(output===undefined){output=at++;map.set(j,output);v.fromBufferAttribute(p,j).applyMatrix4(matrix);if(no)n.fromBufferAttribute(no,j).applyMatrix3(nm).normalize();else n.set(0,1,0);positions.set([v.x,v.y,v.z],output*3);normals.set([n.x,n.y,n.z],output*3);uvs.set([uv?.getX(j)??0,uv?.getY(j)??0],output*2);}
   indices[corner++]=output;
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setIndex(new THREE.BufferAttribute(indices,1));return compactRenderAttributes(geometry);
}
