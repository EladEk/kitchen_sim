import * as THREE from 'three';
import {traditionalMaterial} from './traditional-material.mjs';
import {floorJointMaps} from './floor-joint-maps.mjs';
import {metricSurfaceUVs} from './metric-surface-geometry.mjs';
// This is an owned snapshot: tracing can generate attributes/BVHs without
// mutating or disposing the live scene used by navigation and WebXR.
export class PhotoSceneLimit extends Error {}
export function photoSceneSignature(scene){
 let hash=2166136261,count=0;const add=s=>{for(let i=0;i<s.length;i++)hash=Math.imul(hash^s.charCodeAt(i),16777619);};
 scene.updateMatrixWorld(true);scene.traverseVisible(o=>{if(!o.isMesh&&!o.isLight)return;if(o.userData.part==='furniture-contact-shadow'||o.userData.visualOnly||o.userData.celestialBackground||o.userData.securityOverlay||o.userData.sceneUi)return;count++;add(o.uuid);if(o.isMesh){add(String(o.geometry?.version||0));add(String(o.geometry?.attributes.position?.version||0));add(String(o.instanceMatrix?.version||0));}
 for(const v of o.matrixWorld.elements)add(String(Math.round(v*10000)));
 if(o.isLight)add(`${o.intensity}:${o.color.getHex()}`);
 for(const m of [o.material].flat().filter(Boolean))add(`${m.uuid}:${m.version}:${m.opacity}:${m.map?.version}:${m.bumpMap?.version}:${m.color?.getHex()}`);
 });add(`${scene.environment?.uuid}:${scene.environmentIntensity}:${scene.background?.getHex?.()}`);return `${count}:${hash>>>0}`;
}
export function photoCameraSignature(camera){camera.updateMatrixWorld();return [...camera.matrixWorld.elements,...camera.projectionMatrix.elements].map(v=>Math.round(v*100000)).join(',');}
function stoneMaps(){
 const w=512,h=256,color=new Uint8Array(w*h*4),bump=new Uint8Array(w*h*4),rough=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/w*1.88,v=y/h*.96,row=Math.floor(v/.48),ux=u+(row%2)*.47,edge=Math.min(ux%.94,.94-ux%.94,v%.48,.48-v%.48),joint=edge<.002;
  const noise=(Math.sin(x*12.9898+y*78.233)*43758.5453)%1,shade=joint?172:Math.round(244+noise*3+Math.sin(Math.floor(ux/.94)*39+row*27)*3),i=(y*w+x)*4;
  color.set([shade,shade,shade,255],i);const b=joint?90:128+Math.round(noise*8);bump.set([b,b,b,255],i);rough.set([239,239,239,255],i);
 }
 const make=(data,srgb=false)=>{const t=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/1.88,1/.96);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t;};
 return {map:make(color,true),bumpMap:make(bump),roughnessMap:make(rough)};
}
const excluded=o=>o.userData.part==='furniture-contact-shadow'||o.userData.visualOnly||o.userData.celestialBackground||o.userData.securityOverlay||o.userData.electricalId||o.userData.waterId||o.userData.sceneUi||o.userData.part==='sun-position-marker';
export function estimatePhotoScene(source,{maxTriangles=2500000,maxMeshes=60000,maxBytes=Infinity,textureSize=1024}={}){
 let triangles=0,meshes=0,cloneBytes=0;const shared=new Set(),textures=new Set();
 source.updateMatrixWorld(true);source.traverseVisible(o=>{
  if(excluded(o)||!o.isMesh||o.isSkinnedMesh||!o.geometry?.attributes.position)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  if(!mats.some(m=>m&&m.visible!==false&&m.colorWrite!==false&&m.opacity!==0))return;
  const count=o.isInstancedMesh?o.count:1,geometry=o.geometry,metric=mats.some(m=>m?.userData.metricInstancedUVs||m?.userData.publicFinish==='stone');
  meshes+=count;triangles+=(geometry.index?.count||geometry.attributes.position.count)/3*count;
  if(metric||!shared.has(geometry)){shared.add(geometry);cloneBytes+=Object.values(geometry.attributes).reduce((n,a)=>n+a.array.byteLength,geometry.index?.array.byteLength||0)*(metric?count:1);}
  for(const m of mats)if(m)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  const bytes=cloneBytes+triangles*160+meshes*256+textures.size*textureSize*textureSize*4;
  if(triangles>maxTriangles||meshes>maxMeshes||bytes>maxBytes)throw new PhotoSceneLimit('Scene exceeds photo memory budget');
 });
 return {triangles,meshes,bytes:cloneBytes+triangles*160+meshes*256+textures.size*textureSize*textureSize*4};
}
export function createPhotoScene(source,{maxTriangles=2500000,maxMeshes=60000,maxBytes=Infinity,textureSize=1024}={}){
 estimatePhotoScene(source,{maxTriangles,maxMeshes,maxBytes,textureSize});
 source.updateMatrixWorld(true);const scene=new THREE.Scene(),geometries=new Map(),materials=new Map(),ownedGeometry=new Set(),ownedMaterial=new Set(),ownedTexture=new Set(),floors=new Map();let triangles=0,meshes=0,stone;
 scene.background=source.background?.isColor?source.background.clone():source.background;
 // PMREM is a cube-UV texture; a path tracer requires the original equirectangular HDR.
 scene.environment=source.userData.photoEnvironment||null;scene.environmentIntensity=source.environment?source.environmentIntensity:0;scene.environmentRotation.copy(source.environmentRotation);
 const convert=(m,o)=>{m=traditionalMaterial(m);if(!m||m.visible===false||m.colorWrite===false||m.opacity===0)return null;const glass=!!o.userData.glazing||/glaz|glass/.test(o.userData.part||'');const key=m.uuid+(glass?':glass':'');if(materials.has(key))return materials.get(key);
  let out=m.isMeshStandardMaterial?m.clone():new THREE.MeshStandardMaterial({color:m.color||'#ffffff',map:m.map||null,side:m.side,transparent:m.transparent,opacity:m.opacity,emissive:m.color||'#000000',emissiveIntensity:m.isMeshBasicMaterial?.3:0});
  out.envMap=null;out.onBeforeCompile=()=>{};out.customProgramCacheKey=()=>'';
  if(glass){const physical=new THREE.MeshPhysicalMaterial({color:'#edf4f2',roughness:.07,metalness:0,transmission:.97,thickness:.008,ior:1.5,transparent:false,opacity:1,side:THREE.DoubleSide});out.dispose();out=physical;}
  if(m.userData.publicFinish==='stone'){
   if(!stone){stone=stoneMaps();Object.values(stone).forEach(t=>ownedTexture.add(t));}
   Object.assign(out,stone);out.bumpScale=.0025;out.roughness=.87;
  }
  if(m.userData.publicFinish==='floor'){const profile=m.userData.floorCourses||{},floorKey=JSON.stringify(profile);let maps=floors.get(floorKey);if(!maps){maps=floorJointMaps(profile);floors.set(floorKey,maps);Object.values(maps).forEach(t=>ownedTexture.add(t));}Object.assign(out,maps);out.normalMap=null;out.bumpScale=.0013;out.roughness=1;}
  materials.set(key,out);ownedMaterial.add(out);return out;
 };
 const add=(o,matrix,color=null)=>{
  const mats=[o.material].flat().map(m=>convert(m,o));if(!mats.some(Boolean))return;
  const tri=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(tri+triangles>maxTriangles||meshes>=maxMeshes)throw new PhotoSceneLimit('Scene exceeds photo memory budget');triangles+=tri;meshes++;
  // Material holes must retain their group indices. Opacity-zero placeholders
  // prevent a hidden material slot being replaced by a visible neighbour.
  const final=mats.map(m=>{if(m)return m;const v=new THREE.MeshStandardMaterial({transparent:true,opacity:0,depthWrite:false});ownedMaterial.add(v);return v;});
  let geometry=o.geometry;const metric=[o.material].flat().some(m=>m?.userData.metricInstancedUVs||m?.userData.publicFinish==='stone');
  if(metric){geometry=o.geometry.clone().applyMatrix4(matrix);metricSurfaceUVs(geometry);ownedGeometry.add(geometry);matrix=new THREE.Matrix4();}
  else{if(!geometries.has(geometry.uuid)){const copy=geometry.clone();geometries.set(geometry.uuid,copy);ownedGeometry.add(copy);}geometry=geometries.get(geometry.uuid);}
  const mesh=new THREE.Mesh(geometry,Array.isArray(o.material)?final:final[0]);mesh.matrixAutoUpdate=false;mesh.matrix.copy(matrix);mesh.castShadow=o.castShadow;mesh.receiveShadow=true;
  if(color){mesh.material=[mesh.material].flat().map(m=>{const c=m.clone();c.color.multiply(color);ownedMaterial.add(c);return c;});if(!Array.isArray(o.material))mesh.material=mesh.material[0];}
  scene.add(mesh);
 };
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;ownedGeometry.forEach(g=>g.dispose());ownedMaterial.forEach(m=>m.dispose());ownedTexture.forEach(t=>{t.dispose();t.source.data=null;});ownedGeometry.clear();ownedMaterial.clear();ownedTexture.clear();geometries.clear();materials.clear();floors.clear();stone=null;scene.clear();scene.background=scene.environment=null;};
 try{source.traverseVisible(o=>{
  if(o.userData.part==='furniture-contact-shadow'||o.userData.visualOnly||o.userData.celestialBackground||o.userData.securityOverlay||o.userData.electricalId||o.userData.waterId||o.userData.sceneUi||o.userData.part==='sun-position-marker')return;
  if(o.isMesh&&o.geometry?.attributes.position){
   if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const mat=new THREE.Matrix4();o.getMatrixAt(i,mat);let color=null;if(o.instanceColor){color=new THREE.Color();o.getColorAt(i,color);}add(o,o.matrixWorld.clone().multiply(mat),color);}}
   else if(!o.isSkinnedMesh)add(o,o.matrixWorld.clone());
  }else if(o.isDirectionalLight||o.isSpotLight||o.isPointLight||o.isRectAreaLight){
   const light=o.clone(false);light.position.setFromMatrixPosition(o.matrixWorld);light.quaternion.setFromRotationMatrix(o.matrixWorld);if(o.target){const target=new THREE.Object3D();o.target.getWorldPosition(target.position);light.target=target;scene.add(target);}scene.add(light);
  }
 });scene.updateMatrixWorld(true);return {scene,dispose,triangles,meshes};}catch(error){dispose();throw error;}
}
