import * as T from 'three';
import {selectionRegions,createSelection} from './selection.mjs';
import {isSectionWall} from './section-height.mjs';
import {createGpuClipState,updateGpuClipState,patchSelectionMaterial,registerSelectionSnapshot} from './gpu-selection-clip.mjs';
import {motionAncestor} from './model-motions.mjs';
import {bindTraditionalMaterial,traditionalMaterial} from '../src/traditional-material.mjs';
const colorProperties=['color','emissive','attenuationColor'];
const scalarProperties=['roughness','metalness','envMapIntensity','emissiveIntensity','transmission','transparent','opacity','attenuationDistance','ior','thickness','clearcoat','clearcoatRoughness','anisotropy'];
// A transform copy once per source; all vertex/index buffers and texture assets
// remain shared. Selection changes only touch bounds, uniforms and visibility.
export function createGpuSelection(template,nav,{toNodeMaterial=null}={}){
 const group=new T.Group(),entries=[],motions=[],materials=new Map(),appearance=[],shadowMaterials=new Map(),states=new Map(),instances=[],inverse=new T.Matrix4(),point=new T.Vector3();
 group.name='public-gpu-selected-section';let regions=[],fallback=null,lastState=null,lastKey='',lastMatrix=new T.Matrix4();
 template.updateWorldMatrix(true,true);inverse.copy(template.matrixWorld).invert();
 const stateFor=level=>{if(!states.has(level))states.set(level,createGpuClipState());return states.get(level);};
 const materialFor=(source,level,cuttable)=>{
  const key=source.uuid+':'+level+':'+Number(cuttable);if(materials.has(key))return materials.get(key);
  const base=toNodeMaterial&&!source.isNodeMaterial?toNodeMaterial(source):source;if(!base)throw Error('Material has no WebGPU node equivalent');
  const m=base.clone();m.onBeforeCompile=source.onBeforeCompile;m.customProgramCacheKey=source.customProgramCacheKey.bind(source);
  if(!patchSelectionMaterial(m,stateFor(level),{sectionCuttable:cuttable})){m.dispose();throw Error('Unsupported selection material: '+source.type);}
  bindTraditionalMaterial(m,traditionalMaterial(source));materials.set(key,m);appearance.push([source,m]);return m;
 };
 let unsupported=false;
 function visit(source,parent,level=0,moving=false){
  level=source.userData.level??level;moving||=!!source.userData.tourMotionId;
  if(source.isLight||source.isCamera)return;
  if(source.userData.furnitureCollisionProxy||source.userData.ceiling||source.userData.roof||source.userData.sceneUi||(source.userData.securityOverlay||source.userData.tourNonPhysical)&&!source.userData.renderFixture)return;
  const copy=source.clone(false);if(source===template){copy.visible=true;copy.position.set(0,0,0);copy.quaternion.identity();copy.scale.set(1,1,1);copy.updateMatrix();}
  if(moving)motions.push({source,copy});
  if(source.isMesh){
   const cuttable=isSectionWall(source)||!!motionAncestor(source,template),bounds=new T.Box3();
   if(source.isInstancedMesh){source.computeBoundingBox();bounds.copy(source.boundingBox);instances.push(copy);}else{if(!source.geometry.boundingBox)source.geometry.computeBoundingBox();bounds.copy(source.geometry.boundingBox);}
   bounds.applyMatrix4(inverse.clone().multiply(source.matrixWorld));
   try{copy.material=Array.isArray(source.material)?source.material.map(m=>materialFor(m,level,cuttable)):materialFor(source.material,level,cuttable);}catch{unsupported=true;}
   const clip=Object.create(stateFor(level));if(!cuttable)clip.uSectionCutY=new T.Uniform(1e6);Object.defineProperty(copy.userData,'gpuSelectionClip',{value:clip,configurable:true});
   entries.push({source,copy,level,bounds,moving,cuttable});
  }
  if(source.isMesh&&!toNodeMaterial&&!source.material?.isNodeMaterial){
   const cuttable=isSectionWall(source)||!!motionAncestor(source,template),base=Array.isArray(source.material)?source.material[0]:source.material;
   for(const [property,distance]of [['customDepthMaterial',false],['customDistanceMaterial',true]]){
    const key=base.uuid+':'+level+':'+Number(cuttable)+':'+Number(distance);
    if(!shadowMaterials.has(key)){const m=distance?new T.MeshDistanceMaterial():new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});m.side=base.shadowSide??base.side;m.map=base.map;m.alphaMap=base.alphaMap;m.alphaTest=base.alphaTest;patchSelectionMaterial(m,stateFor(level),{sectionCuttable:cuttable});shadowMaterials.set(key,m);}
    copy[property]=shadowMaterials.get(key);
   }
  }
  parent.add(copy);for(const child of source.children)visit(child,copy,level,moving);
 }
 visit(template,group);const unregister=registerSelectionSnapshot(group,()=>createSelection(template,nav,lastState),{key:()=>`${lastState?.level}:${lastState?.target||''}:${[...states.values()].map(s=>Number(s.uSectionCutY.value).toFixed(3)).join(',')}:${JSON.stringify(lastState?.roomFocus||null)}`});
 function update(state,matrix=lastMatrix){
  lastState=state;const key=JSON.stringify([state.level,state.target,state.roomFocus,state.wallHeight,...matrix.elements]);if(key===lastKey){sync();return;}lastKey=key;lastMatrix.copy(matrix);regions=selectionRegions(nav,state);
  const domains=r=>r.domains||r.polygons?.map(p=>[p])||(r.polygon?[[r.polygon]]:[]),capacity=regions.some(r=>domains(r).flat().some(p=>p.length>24)||domains(r).flat().length>16);
  if(unsupported||capacity){if(fallback){group.remove(fallback.group);fallback.dispose();}fallback=createSelection(template,nav,state);group.add(fallback.group);for(const e of entries)e.copy.visible=false;delete group.userData.selectionBounds;return;}
  if(fallback){group.remove(fallback.group);fallback.dispose();fallback=null;}
  group.userData.selectionBounds=new T.Box3();
  for(const [level,uniforms]of states){
   const region=regions.find(r=>r.level===level),elevation=nav.floors.find(f=>f.level===level)?.elevation??level*nav.storey,rings=region?domains(region):[],box=new T.Box3(new T.Vector3(-1e4,elevation-.35,-1e4),new T.Vector3(1e4,elevation+nav.storey+.03,1e4));
   if(rings.length){box.min.x=box.min.z=Infinity;box.max.x=box.max.z=-Infinity;for(const p of rings.flat())for(const [x,z]of p){box.min.x=Math.min(box.min.x,x-.22);box.min.z=Math.min(box.min.z,z-.22);box.max.x=Math.max(box.max.x,x+.22);box.max.z=Math.max(box.max.z,z+.22);}}
   const worldBox=box.clone().applyMatrix4(matrix),worldDomains=rings.map(domain=>domain.map(poly=>poly.map(([x,z])=>{point.set(x,elevation,z).applyMatrix4(matrix);return [point.x,point.z];}))),cutY=Number.isFinite(state.wallHeight)?point.set(0,elevation+state.wallHeight+.03,0).applyMatrix4(matrix).y:1e6;
   updateGpuClipState(uniforms,{bounds:worldBox,domains:worldDomains,polygon:worldDomains[0]?.[0],mode:rings.length?2:1,cutY});
   for(const e of entries)if(e.level===level){e.copy.visible=!!region&&e.source.visible&&e.bounds.intersectsBox(box)&&(!e.cuttable||e.bounds.min.y<=elevation+(state.wallHeight??1e6)+.03);if(e.copy.visible){const b=e.bounds.clone().applyMatrix4(matrix).intersect(worldBox);if(e.cuttable)b.max.y=Math.min(b.max.y,cutY);group.userData.selectionBounds.union(b);}}
  }sync();
 }
 function sync(){for(const e of motions){e.copy.position.copy(e.source.position);e.copy.quaternion.copy(e.source.quaternion);e.copy.scale.copy(e.source.scale);e.copy.updateMatrix();}for(const [a,b]of appearance){const prevTransparent=b.transparent;for(const key of colorProperties)if(a[key]&&b[key])b[key].copy(a[key]);for(const key of scalarProperties)if(key in a)b[key]=a[key];if(b.transparent!==prevTransparent)b.needsUpdate=true;}fallback?.sync();group.updateMatrixWorld(true);}
 return {group,get regions(){return regions;},get fallback(){return !!fallback;},update,sync,dispose(){unregister();fallback?.dispose();instances.forEach(o=>o.dispose());for(const m of [...materials.values(),...shadowMaterials.values()])m.dispose();for(const s of states.values())s.uSelectionRings.value.dispose();entries.length=motions.length=instances.length=appearance.length=0;states.clear();materials.clear();shadowMaterials.clear();group.clear();}};
}
