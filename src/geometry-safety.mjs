import {BufferAttribute,DoubleSide,FrontSide,Matrix4,Vector3} from 'three';

const mapKeys=['map','normalMap','bumpMap','roughnessMap','metalnessMap','aoMap','alphaMap','displacementMap','clearcoatNormalMap','clearcoatMap','transmissionMap'];
function validAttribute(a,size,count){
 if(!a||a.itemSize!==size||a.count!==count||!a.array?.length)return false;
 // Indexed scan: the iterator form cost ~0.6 s of a phone's district setup.
 // x-x is 0 for every finite number and NaN for NaN/±Infinity.
 const array=a.array;for(let i=0,n=array.length;i<n;i++){const value=array[i];if(value-value!==0)return false;}
 return true;
}
function validUV(a,count){
 if(!validAttribute(a,2,count))return false;
 let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
 if(!a.isInterleavedBufferAttribute&&!a.normalized&&a.array.length>=a.count*2){const array=a.array;for(let i=0,n=a.count*2;i<n;i+=2){const u=array[i],v=array[i+1];if(u<minU)minU=u;if(u>maxU)maxU=u;if(v<minV)minV=v;if(v>maxV)maxV=v;}}
 else for(let i=0;i<a.count;i++){const u=a.getX(i),v=a.getY(i);minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);}
 return maxU-minU>1e-8&&maxV-minV>1e-8;
}

// Missing UVs need independent triangle corners: a shared box corner belongs
// to several differently projected faces. Positions and winding are preserved.
export function computeBoxUVs(geometry,matrix=new Matrix4()){
 if(!geometry.getAttribute('position')?.count)return geometry;
 const g=geometry.index?geometry.toNonIndexed():geometry.clone(),position=g.getAttribute('position'),uv=new Float32Array(position.count*2);
 const a=new Vector3(),b=new Vector3(),c=new Vector3(),normal=new Vector3();
 for(let i=0;i+2<position.count;i+=3){
  a.fromBufferAttribute(position,i).applyMatrix4(matrix);b.fromBufferAttribute(position,i+1).applyMatrix4(matrix);c.fromBufferAttribute(position,i+2).applyMatrix4(matrix);
  normal.subVectors(b,a).cross(new Vector3().subVectors(c,a));
  const n=[Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)],axis=n[1]>=n[0]&&n[1]>=n[2]?'y':n[0]>=n[2]?'x':'z';
  for(const [j,p]of [a,b,c].entries())uv.set(axis==='y'?[p.x,p.z]:axis==='x'?[p.z,p.y]:[p.x,p.y],(i+j)*2);
 }
 g.setAttribute('uv',new BufferAttribute(uv,2));g.userData={...g.userData,boxUVMetres:true};return g;
}
export function prepareSurfaceGeometry(geometry,matrix=new Matrix4(),{tangents=true}={}){
 let g=geometry;const position=g.getAttribute('position');
 if(!position?.count||!validAttribute(position,3,position.count))return {geometry:g,valid:false};
 if(!validUV(g.getAttribute('uv'),position.count))g=computeBoxUVs(g,matrix);
 let normal=g.getAttribute('normal');
 let badNormal=!validAttribute(normal,3,g.getAttribute('position').count);
 if(!badNormal)for(let i=0;i<normal.count;i++)if(normal.getX(i)**2+normal.getY(i)**2+normal.getZ(i)**2<.25){badNormal=true;break;}
 if(badNormal)g.computeVertexNormals();
 normal=g.getAttribute('normal');
 if(normal?.normalized||!(normal?.array instanceof Float32Array)){
  const values=new Float32Array(normal.count*3);for(let i=0;i<normal.count;i++)values.set([normal.getX(i),normal.getY(i),normal.getZ(i)],i*3);
  g.setAttribute('normal',new BufferAttribute(values,3));
 }
 if(tangents&&!validAttribute(g.getAttribute('tangent'),4,g.getAttribute('position').count)){
  if(!g.index){const count=g.getAttribute('position').count,indices=count>65535?new Uint32Array(count):new Uint16Array(count);for(let i=0;i<count;i++)indices[i]=i;g.setIndex(new BufferAttribute(indices,1));}
  g.computeTangents();
  const t=g.getAttribute('tangent'),n=g.getAttribute('normal'),axis=new Vector3(),v=new Vector3(),direction=new Vector3();
  for(let i=0;t&&i<t.count;i++)if(!Number.isFinite(t.getX(i))||t.getX(i)**2+t.getY(i)**2+t.getZ(i)**2<1e-8){
   v.fromBufferAttribute(n,i);if(v.lengthSq()<1e-8){v.set(0,1,0);n.setXYZ(i,0,1,0);}v.normalize();axis.set(Math.abs(v.x)<.8?1:0,Math.abs(v.x)<.8?0:1,0);direction.crossVectors(v,axis).normalize();t.setXYZW(i,direction.x,direction.y,direction.z,1);
  }
 }
 return {geometry:g,valid:validUV(g.getAttribute('uv'),g.getAttribute('position').count),repairedNormals:badNormal};
}
export function prepareSceneGeometry(root){
 const stats={meshes:0,generatedUVs:0,repairedNormals:0,fallbacks:0},cache=new Map(),materials=new Map();root.updateMatrixWorld(true);
 root.traverse(object=>{
  if(!object.isMesh||!object.geometry||object.userData.celestialBackground||object.userData.furnitureCollisionProxy)return;stats.meshes++;
  const original=object.geometry;let result=cache.get(original);
  if(!result){result=prepareSurfaceGeometry(original,object.matrixWorld);cache.set(original,result);if(result.geometry!==original)stats.generatedUVs++;if(result.repairedNormals)stats.repairedNormals++;}
  object.geometry=result.geometry;
  result.geometry.computeBoundingBox();const bounds=result.geometry.boundingBox;
  const thin=bounds&&Math.min(bounds.max.x-bounds.min.x,bounds.max.y-bounds.min.y,bounds.max.z-bounds.min.z)<1e-6;
  const convert=source=>{
   if(!source)return source;const side=thin?DoubleSide:FrontSide,key=source.uuid+':'+side+':'+result.valid;
   if(materials.has(key))return materials.get(key);
   if(result.valid&&source.side===side){materials.set(key,source);return source;}
   const m=source.clone();m.side=side;
   if(!result.valid){for(const key of mapKeys)m[key]=null;m.userData={...m.userData,geometryMapFallback:true};stats.fallbacks++;}
   materials.set(key,m);return m;
  };
  object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
 });return stats;
}
