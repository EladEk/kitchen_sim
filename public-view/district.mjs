import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
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
 const group=new THREE.Group(),geometries=[],materials=[],textures=[],buckets=new Map();template.updateMatrixWorld(true);
 const add=(o,matrix)=>{const box=new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position).applyMatrix4(matrix),c=box.getCenter(new THREE.Vector3());
 if(c.x< -5||c.x>29||c.z< -25||c.z>17||box.max.y<.12)return;
 const mats=[o.material].flat();if(mats.length!==1||!mats[0]||mats[0].opacity===0)return;const mat=mats[0];if(!buckets.has(mat))buckets.set(mat,[]);
 let geo=o.geometry.clone().applyMatrix4(matrix);if(geo.index){const old=geo;geo=old.toNonIndexed();old.dispose();}geo.deleteAttribute('uv2');geo.deleteAttribute('color');geo.clearGroups();if(!geo.attributes.normal)geo.computeVertexNormals();if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
 for(const key of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(key))geo.deleteAttribute(key);buckets.get(mat).push(geo);
 };
 template.traverse(o=>{if(!o.isMesh||!o.visible)return;if(o.isInstancedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);add(o,o.matrixWorld.clone().multiply(m));}}else add(o,o.matrixWorld);});
 for(const [mat,parts] of buckets){const geo=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geo)continue;geometries.push(geo);
  for(const mirror of [false,true]){const buildings=DISTRICT.slice(1).filter(b=>!!b.mirror===mirror);if(!buildings.length)continue;const geometry=mirror?mirroredGeometry(geo):geo;if(mirror)geometries.push(geometry);const mesh=new THREE.InstancedMesh(geometry,mat,buildings.length);buildings.forEach((b,i)=>mesh.setMatrixAt(i,buildingTransform({...b,mirror:false})));mesh.castShadow=mesh.receiveShadow=true;mesh.userData.district=true;group.add(mesh);}
 }
 const site=createDistrictSite(siteData);group.add(site.group);
 // Readable building numbers are scene labels, never camera-facing UI overlays.
 for(const b of DISTRICT){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=b.id==='4102'?'#315d50':'#36586c';ctx.fillRect(0,0,256,128);ctx.fillStyle='white';ctx.font='bold 70px Arial';ctx.textAlign='center';ctx.fillText(b.id,128,89);const tex=new THREE.CanvasTexture(canvas);textures.push(tex);const mat=new THREE.SpriteMaterial({map:tex,depthTest:true});materials.push(mat);const label=new THREE.Sprite(mat);label.position.set(center[0]+b.x,34,center[1]+b.z);label.scale.set(10,5,1);group.add(label);}
 group.updateMatrixWorld(true);
 return {group,layout:site.layout,dispose(){site.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}

// Reflections are baked, with corrected winding: negative instance matrices
// are unsupported by Three's InstancedMesh and can hide exterior faces.
export function mirroredGeometry(source){
 const geo=source.index?source.toNonIndexed():source.clone();geo.applyMatrix4(new THREE.Matrix4().makeTranslation(center[0],0,center[1]).multiply(new THREE.Matrix4().makeScale(-1,1,1)).multiply(new THREE.Matrix4().makeTranslation(-center[0],0,-center[1])));
 for(const attr of Object.values(geo.attributes)){const n=attr.itemSize;for(let i=0;i<attr.count;i+=3)for(let k=0;k<n;k++){const a=(i+1)*n+k,b=(i+2)*n+k,v=attr.array[a];attr.array[a]=attr.array[b];attr.array[b]=v;}attr.needsUpdate=true;}
 return geo;
}
