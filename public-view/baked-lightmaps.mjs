import * as THREE from 'three';
import {applyBakedUVs,bakedCoverage as coverage,BAKED_FILL_SCALE} from './baked-lightmap-core.mjs';
export {BAKED_FILL_SCALE};
export const bakedCoverage=location=>coverage(location,BAKED_LIGHTMAPS);
import indirectKTX from './assets/lightmaps-r188/f0-u4/indirect.ktx2?url';
import indirectFallback from './assets/lightmaps-r188/f0-u4/indirect.jpg?url';
import uvURL from './assets/lightmaps-r188/f0-u4/uv2.json?url';
import {createCompressedMaterialLoader} from './ktx-material-loader.mjs';
import {loadSurfaceTexture} from './surface-detail.mjs';
// R188 pilot: Blender/Cycles-baked indirect light + AO for ground-floor
// apartment 4 (one shared building model, so every copy of 4102's layout
// gets it). Receivers get a de-indexed geometry with UV1 into one 1024 px
// atlas; ONE material clone per source material carries the lightMap
// (channel 1), so the pilot adds a handful of programs, not one per mesh.
// While the walker is inside a baked unit the faked-GI fills are reduced.
export const BAKED_LIGHTMAPS=Object.freeze([{floor:0,unit:4,indirect:indirectKTX,uv:uvURL}]);
// The baked AO atlas (ao.ktx2) stays in the assets but is not loaded: on top of the
// irradiance it greyed whole walls and ceilings in the R188 walk-through shots.
export const LIGHTMAP_INTENSITY=1.1;
export function createBakedLightmaps({renderer=null,signal,loader=null}={}){
 const textures=new Set(),clones=new Map(),geometries=new Set();let disposed=false;
 const compressed=!loader&&renderer?createCompressedMaterialLoader(renderer,new Map([[indirectKTX,indirectFallback]])):null;
 const load=loader||compressed?.load||((url,o)=>loadSurfaceTexture(url,o));
 async function apply(root){
  if(disposed||signal?.aborted)return {matched:0};let total=0;
  for(const bake of BAKED_LIGHTMAPS){
   const data=await (await fetch(bake.uv,{signal})).json();if(disposed||signal?.aborted)return {matched:total};
   const meshes=applyBakedUVs(root,data.receivers,{level:bake.floor});meshes.forEach(o=>geometries.add(o.geometry));if(!meshes.length)continue;
   const irr=await load(bake.indirect,{signal});if(disposed||signal?.aborted||!irr){irr?.dispose();return {matched:total};}
   irr.colorSpace=THREE.SRGBColorSpace;for(const t of [irr]){t.channel=1;t.flipY=t.isCompressedTexture?false:t.flipY;t.needsUpdate=true;textures.add(t);}
   for(const o of meshes){const list=[o.material].flat(),next=list.map(src=>{const key=src.uuid+':'+bake.unit;if(!clones.has(key)){const c=src.clone();// Material.clone drops the instance shader hooks (metric UVs, floor courses, wall cavity).
     c.onBeforeCompile=src.onBeforeCompile;c.customProgramCacheKey=src.customProgramCacheKey;c.lightMap=irr;c.lightMapIntensity=LIGHTMAP_INTENSITY;c.userData={...src.userData,bakedLightmap:{revision:188,floor:bake.floor,unit:bake.unit}};clones.set(key,c);}return clones.get(key);});o.material=Array.isArray(o.material)?next:next[0];}
   total+=meshes.length;
  }
  return {matched:total};
 }
 return {apply,get stats(){return {materials:clones.size,textures:textures.size,geometries:geometries.size};},dispose(){if(disposed)return;disposed=true;compressed?.dispose();textures.forEach(t=>t.dispose());clones.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());textures.clear();clones.clear();geometries.clear();}};
}
