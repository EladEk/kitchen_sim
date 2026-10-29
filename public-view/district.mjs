import * as THREE from 'three';
import {DISTRICT,PLAN_CENTER,PLAN_ROTATION} from './district-layout.mjs';
import {createDistrictSite} from './site-scene.mjs';
export {DISTRICT} from './district-layout.mjs';
export {PLAN_ROTATION} from './district-layout.mjs';
export const districtSolar=solar=>({...solar,northBearing:((solar.northBearing??135)+90)%360});
const center=PLAN_CENTER;
export function buildingTransform(b){return new THREE.Matrix4().makeTranslation(center[0]+b.x,0,center[1]+b.z).multiply(new THREE.Matrix4().makeRotationY(b.angle+PLAN_ROTATION)).multiply(new THREE.Matrix4().makeScale(b.mirror?-1:1,1,1)).multiply(new THREE.Matrix4().makeTranslation(-center[0],0,-center[1]));}
export function districtLocation(position,data){
 for(const b of DISTRICT){const p=position.clone().applyMatrix4(buildingTransform(b).invert());if(p.x>=-4.1&&p.x<=27.5&&p.z>=-23.7&&p.z<=15.7){const floor=Math.max(0,Math.min(8,Math.floor((p.y-1.62+.35)/data.storey)));return {building:b.id,floor,position:p};}}
 return {building:null,floor:0,position};
}
// Only the already-sanitized public snapshot is accepted here. Reuse geometry
// and batch identical materials into seven instances instead of seven downloads.
export function createDistrict(template,siteData){
 const group=new THREE.Group(),geometries=[],materials=[],textures=[],buckets=new Map(),copies=[];template.updateMatrixWorld(true);
 const add=(o,matrix)=>{// The baseline is already sanitized. Keep all balcony returns and ground slabs.

 const mats=[o.material].flat(),total=o.geometry.index?.count??o.geometry.attributes.position.count;const ranges=mats.length>1?o.geometry.groups:[{start:0,count:total,materialIndex:0}];
 for(const range of ranges){const mat=mats[range.materialIndex];if(!mat||mat.opacity===0)continue;if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push({geometry:o.geometry,matrix,start:range.start,count:range.count});}
 };
 template.traverse(o=>{if(!o.isMesh||!o.visible)return;if(o.isInstancedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);add(o,o.matrixWorld.clone().multiply(m));}}else add(o,o.matrixWorld);});
 for(const [mat,parts] of buckets){const geo=mergeDistrictParts(parts);if(!geo)continue;geometries.push(geo);
  for(const mirror of [false,true]){const buildings=DISTRICT.filter(b=>!!b.mirror===mirror);if(!buildings.length)continue;const geometry=mirror?mirroredGeometry(geo):geo;if(mirror)geometries.push(geometry);const mesh=new THREE.InstancedMesh(geometry,mat,buildings.length);buildings.forEach((b,i)=>mesh.setMatrixAt(i,buildingTransform({...b,mirror:false})));mesh.castShadow=mesh.receiveShadow=true;mesh.userData.district=true;copies.push({mesh,buildings});group.add(mesh);}
 }
 const site=createDistrictSite(siteData);group.add(site.group);
 // Readable building numbers are scene labels, never camera-facing UI overlays.
 if(typeof document!=='undefined')for(const b of DISTRICT){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=b.id==='4102'?'#315d50':'#36586c';ctx.fillRect(0,0,256,128);ctx.fillStyle='white';ctx.font='bold 70px Arial';ctx.textAlign='center';ctx.fillText(b.id,128,89);const tex=new THREE.CanvasTexture(canvas);textures.push(tex);const mat=new THREE.SpriteMaterial({map:tex,depthTest:true});materials.push(mat);const label=new THREE.Sprite(mat);label.position.set(center[0]+b.x,34,center[1]+b.z);label.scale.set(10,5,1);group.add(label);}
 const setActiveBuilding=id=>updateBuildingCopies(copies,id);
 setActiveBuilding('4102');group.updateMatrixWorld(true);
 return {group,layout:site.layout,setActiveBuilding,dispose(){site.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}

// Reflections are baked, with corrected winding: negative instance matrices
// are unsupported by Three's InstancedMesh and can hide exterior faces.
export function mirroredGeometry(source){
 const geo=source.index?source.toNonIndexed():source.clone();geo.applyMatrix4(new THREE.Matrix4().makeTranslation(center[0],0,center[1]).multiply(new THREE.Matrix4().makeScale(-1,1,1)).multiply(new THREE.Matrix4().makeTranslation(-center[0],0,-center[1])));
 for(const attr of Object.values(geo.attributes)){const n=attr.itemSize;for(let i=0;i<attr.count;i+=3)for(let k=0;k<n;k++){const a=(i+1)*n+k,b=(i+2)*n+k,v=attr.array[a];attr.array[a]=attr.array[b];attr.array[b]=v;}attr.needsUpdate=true;}
 return geo;
}

export function updateBuildingCopies(copies,id){for(const {mesh,buildings} of copies){const shown=buildings.filter(b=>b.id!==id);mesh.count=shown.length;shown.forEach((b,i)=>mesh.setMatrixAt(i,buildingTransform({...b,mirror:false})));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}}

// Allocate the final buffers once. Cloning tens of thousands of small instance
// geometries before merging them caused high allocation pressure on phones.
export function mergeDistrictParts(parts){
 const count=parts.reduce((n,p)=>n+(p.count??p.geometry.index?.count??p.geometry.attributes.position.count),0);if(!count)return null;
 const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),v=new THREE.Vector3(),n=new THREE.Vector3();let at=0;
 for(const {geometry:g,matrix,start=0,count:partCount} of parts){const p=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv,index=g.index,length=index?.count??p.count,nm=new THREE.Matrix3().getNormalMatrix(matrix),reverse=matrix.determinant()<0;
  for(let i=start;i<Math.min(length,start+(partCount??length));i++){const triangle=i-i%3,offset=reverse&&i%3?3-i%3:i%3,j=index?index.getX(triangle+offset):triangle+offset;v.fromBufferAttribute(p,j).applyMatrix4(matrix);if(no)n.fromBufferAttribute(no,j).applyMatrix3(nm).normalize();else n.set(0,1,0);positions[at*3]=v.x;positions[at*3+1]=v.y;positions[at*3+2]=v.z;normals[at*3]=n.x;normals[at*3+1]=n.y;normals[at*3+2]=n.z;uvs[at*2]=uv?.getX(j)??0;uvs[at*2+1]=uv?.getY(j)??0;at++;}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.BufferAttribute(uvs,2));return geo;
}
