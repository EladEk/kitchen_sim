import {Box3,Vector2,Vector3,Uniform,DataTexture,RGBAFormat,FloatType} from 'three';
let nodeFactory;
const bindings=new WeakMap(),snapshots=new WeakMap();
export const installSelectionNodeFactory=factory=>{nodeFactory=factory;};
export function createGpuClipState(){const texture=new DataTexture(new Float32Array(24*16*4),24,16,RGBAFormat,FloatType);texture.needsUpdate=true;return {uSectionCutY:new Uniform(1e6),uSelectionBoundsMin:new Uniform(new Vector3(-1e6,-1e6,-1e6)),uSelectionBoundsMax:new Uniform(new Vector3(1e6,1e6,1e6)),uSelectionMode:new Uniform(0),uSelectionVertexCount:new Uniform(0),uSelectionPolygon:new Uniform(Array.from({length:24},()=>new Vector2())),uSelectionRings:new Uniform(texture),uSelectionRingCount:new Uniform(0),uSelectionMargin:new Uniform(.22)};}
export function updateGpuClipState(state,{polygon=null,domains=null,bounds=new Box3(),cutY=1e6,mode=polygon?2:1}={}){
 const rings=domains?domains.flatMap(domain=>domain.map((points,i)=>({points,hole:i>0}))):polygon?[{points:polygon,hole:false}]:[];
 if(rings.length>16||rings.some(r=>r.points.length>24))throw Error('Selection domain exceeds GPU capacity');
 state.rings=rings;state.uSectionCutY.value=cutY;state.uSelectionBoundsMin.value.copy(bounds.min);state.uSelectionBoundsMax.value.copy(bounds.max);state.uSelectionMode.value=mode;
 state.uSelectionVertexCount.value=polygon?.length||0;for(let i=0;i<24;i++)state.uSelectionPolygon.value[i].set(...(polygon?.[i]||[0,0]));
 state.uSelectionRingCount.value=rings.length;const data=state.uSelectionRings.value.image.data;data.fill(0);rings.forEach((r,row)=>r.points.forEach((p,i)=>data.set([p[0],p[1],r.points.length,r.hole?1:0],(row*24+i)*4)));state.uSelectionRings.value.needsUpdate=true;
}
const declarations=`
uniform float uSectionCutY;
uniform vec3 uSelectionBoundsMin;
uniform vec3 uSelectionBoundsMax;
uniform float uSelectionMode;
uniform sampler2D uSelectionRings;
uniform int uSelectionRingCount;
uniform float uSelectionMargin;
varying vec3 vHomeClipWorld;
bool homeSelectionOutside(vec3 p){
 if(uSelectionMode<.5)return false;
 if(any(lessThan(p,uSelectionBoundsMin))||any(greaterThan(p,uSelectionBoundsMax)))return true;
 if(uSelectionMode<1.5)return false;
 bool anyInside=false,anyHole=false;
 for(int row=0;row<16;row++){
  if(row>=uSelectionRingCount)break;
  vec4 info=texture2D(uSelectionRings,vec2(.5/24.,(float(row)+.5)/16.));
  int count=int(info.z+.5);bool inside=false;float distance2=1.e12;
  for(int i=0;i<24;i++){
   if(i>=count)break;
   int j=(i+1==count)?0:i+1;
   vec2 a=texture2D(uSelectionRings,vec2((float(i)+.5)/24.,(float(row)+.5)/16.)).xy;
   vec2 b=texture2D(uSelectionRings,vec2((float(j)+.5)/24.,(float(row)+.5)/16.)).xy;
   vec2 v=b-a,q=p.xz-a,near=q-v*clamp(dot(q,v)/max(dot(v,v),1.e-10),0.,1.);distance2=min(distance2,dot(near,near));
   if((a.y>p.z)!=(b.y>p.z))if(p.x<v.x*(p.z-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  bool edge=distance2<=uSelectionMargin*uSelectionMargin;
  if(info.w>.5)anyHole=anyHole||(inside&&!edge);else anyInside=anyInside||inside||edge;
 }
 return !anyInside||anyHole;
}
`;
export function patchSelectionMaterial(material,state,{sectionCuttable=false}={}){
 if(!material||material.isShaderMaterial||material.isRawShaderMaterial)return false;
 const old=bindings.get(material);if(old?.state===state&&old.sectionCuttable===sectionCuttable)return true;
 if(material.isNodeMaterial){if(!nodeFactory)return false;nodeFactory(material,state,sectionCuttable);}
 else{
  const before=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,...args){before.call(this,shader,...args);Object.assign(shader.uniforms,state);
   shader.vertexShader='varying vec3 vHomeClipWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 homeClipPosition=vec4(transformed,1.);
#ifdef USE_BATCHING
homeClipPosition=batchingMatrix*homeClipPosition;
#endif
#ifdef USE_INSTANCING
homeClipPosition=instanceMatrix*homeClipPosition;
#endif
vHomeClipWorld=(modelMatrix*homeClipPosition).xyz;
#include <project_vertex>`);
   shader.fragmentShader=declarations+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(homeSelectionOutside(vHomeClipWorld)${sectionCuttable?'||vHomeClipWorld.y>uSectionCutY':''})discard;`);
  };material.customProgramCacheKey=()=>key+'|home-selection-v1|'+Number(sectionCuttable);
 }
 bindings.set(material,{state,sectionCuttable});material.needsUpdate=true;return true;
}
export function copyGpuClipBinding(source,target){const binding=bindings.get(source);if(binding){if(!!source.isNodeMaterial===!!target.isNodeMaterial){if(source.isNodeMaterial)target.maskNode=source.maskNode;else{target.onBeforeCompile=source.onBeforeCompile;target.customProgramCacheKey=source.customProgramCacheKey;}bindings.set(target,binding);}else patchSelectionMaterial(target,binding.state,{sectionCuttable:binding.sectionCuttable});}return target;}
// CPU picks must obey the same discard domain as both GPU implementations.
export function isPointClippedByGpuSelection(object,worldPoint,margin=.22){
 let clip;for(let p=object;p;p=p.parent)if(p.userData?.gpuSelectionClip){clip=p.userData.gpuSelectionClip;break;}
 if(!clip)return false;if(worldPoint.y>(clip.uSectionCutY?.value??1e6))return true;
 const mode=clip.uSelectionMode?.value;if(mode===0)return false;
 const lo=clip.uSelectionBoundsMin?.value,hi=clip.uSelectionBoundsMax?.value;
 if(lo&&hi&&(worldPoint.x<lo.x||worldPoint.y<lo.y||worldPoint.z<lo.z||worldPoint.x>hi.x||worldPoint.y>hi.y||worldPoint.z>hi.z))return true;
 const rings=clip.rings||[];if(!rings.length||mode===1)return false;
 let anyInside=false,anyHole=false,parity=false,onBoundary=false;
 for(const ring of rings){const polygon=ring.points||ring;let inside=false,distance2=Infinity;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const a=polygon[j],b=polygon[i],ax=a.x??a[0],az=a.y??a[1],bx=b.x??b[0],bz=b.y??b[1],vx=bx-ax,vz=bz-az,qx=worldPoint.x-ax,qz=worldPoint.z-az,t=Math.max(0,Math.min(1,(qx*vx+qz*vz)/Math.max(vx*vx+vz*vz,1e-10)));
   distance2=Math.min(distance2,(qx-vx*t)**2+(qz-vz*t)**2);
   if((az>worldPoint.z)!==(bz>worldPoint.z)&&worldPoint.x<vx*(worldPoint.z-az)/(bz-az)+ax)inside=!inside;
  }
  const edge=distance2<=margin*margin;parity=parity!==inside;onBoundary||=edge;
  if(ring.hole)anyHole||=inside&&!edge;else anyInside||=inside||edge;
 }
 // Plain ring arrays use even/odd holes; typed domains retain union terraces.
 return rings.every(Array.isArray)?!parity&&!onBoundary:!anyInside||anyHole;
}
export function disposeGpuSelectionSnapshot(group){const cached=group.userData.gpuSelectionSnapshotCache;if(cached){cached.snapshot.dispose();delete group.userData.gpuSelectionSnapshotCache;}}
export function registerSelectionSnapshot(group,provider,{key=()=>''}={}){snapshots.set(group,{provider,key});return ()=>{disposeGpuSelectionSnapshot(group);snapshots.delete(group);};}
// Camera/sun changes reuse sliced geometry. Moving doors synchronize transforms;
// selection/height/domain changes replace and dispose the owned cached snapshot.
export function withSelectionSnapshots(root,callback){
 const items=[],restore=[];root.traverseVisible(o=>{if(snapshots.has(o))items.push(o);});
 try{for(const group of items){const parent=group.parent;if(!parent)continue;const record=snapshots.get(group),key=record.key();let cached=group.userData.gpuSelectionSnapshotCache;
  if(!cached||cached.key!==key){disposeGpuSelectionSnapshot(group);cached={key,snapshot:record.provider()};Object.defineProperty(group.userData,'gpuSelectionSnapshotCache',{value:cached,writable:true,configurable:true});}
  const snapshot=cached.snapshot;snapshot.sync?.();snapshot.group.matrixAutoUpdate=false;snapshot.group.matrix.copy(group.matrix);const index=parent.children.indexOf(group);parent.remove(group);parent.add(snapshot.group);restore.push({parent,group,snapshot,index});}root.updateMatrixWorld(true);return callback();}
 finally{for(const {parent,group,snapshot,index}of restore.reverse()){parent.remove(snapshot.group);parent.add(group);parent.children.splice(parent.children.indexOf(group),1);parent.children.splice(index,0,group);}root.updateMatrixWorld(true);}
}
