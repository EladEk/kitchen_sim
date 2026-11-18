import {BufferGeometry,Float32BufferAttribute,Mesh,MeshBasicMaterial} from 'three';

// One depth-only architectural caster per floor / exterior group. Layer 1 is excluded
// from the main camera; the sun and local shadow cameras include layers 0 + 1.
// Interactive/deforming/alpha-masked geometry keeps its own original caster.
export function createStaticShadowBatches(group){
 const buckets=new Map(),geometry=[],objects=[],material=new MeshBasicMaterial(),bindings=[];
 group.traverse(o=>{
  if(!o.isMesh||!o.userData.walkingBatch||o.isInstancedMesh||!o.castShadow||o.userData.furnitureRender||o.userData.shadowProxy)return;
  const m=o.material;if(Array.isArray(m)||m.transparent||m.transmission>0||m.alphaTest>0||m.alphaMap||m.opacityNode||m.opacity<1)return;
  const {level=0,exterior=false}=o.parent.userData,key=level+':'+exterior;if(!buckets.has(key))buckets.set(key,{level,exterior,meshes:[]});buckets.get(key).meshes.push(o);
 });
 for(const {level,exterior,meshes}of buckets.values()){
  const count=meshes.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count),0),positions=new Float32Array(count*3),normals=new Float32Array(count*3);let at=0;
  for(const mesh of meshes){const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,index=g.index,total=index?.count??p.count;for(let i=0;i<total;i++){const k=index?index.getX(i):i;positions.set([p.getX(k),p.getY(k),p.getZ(k)],at*3);normals.set(n?[n.getX(k),n.getY(k),n.getZ(k)]:[0,1,0],at++*3);}bindings.push(mesh);mesh.castShadow=false;}
  const uv=new Float32Array(count*2);for(let i=0;i<count;i++){const nx=Math.abs(normals[i*3]),ny=Math.abs(normals[i*3+1]),nz=Math.abs(normals[i*3+2]);uv.set(ny>=nx&&ny>=nz?[positions[i*3],positions[i*3+2]]:nx>=nz?[positions[i*3+2],positions[i*3+1]]:[positions[i*3],positions[i*3+1]],i*2);}
  const g=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(positions,3)).setAttribute('normal',new Float32BufferAttribute(normals,3)).setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeBoundingSphere();geometry.push(g);
  const proxy=new Mesh(g,material);proxy.layers.set(1);proxy.castShadow=true;proxy.receiveShadow=false;proxy.raycast=()=>{};proxy.userData={shadowProxy:true,visualOnly:true,tourNonPhysical:true,level,exterior};group.add(proxy);objects.push(proxy);
 }
 return {stats:{originalCasters:bindings.length,batchedCasters:objects.length},update(floor){for(const o of objects)o.visible=o.userData.exterior||o.userData.level===floor;},dispose(){for(const mesh of bindings)mesh.castShadow=true;objects.forEach(o=>o.removeFromParent());geometry.forEach(g=>g.dispose());material.dispose();buckets.clear();}};
}
