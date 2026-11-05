import * as T from 'three';
// Runtime templates are loaded once from the shared GLB. These keys are public
// asset identities; owner IDs, positions and plan dimensions are never stored here.
export const COMPLETE_FURNITURE_KINDS=Object.freeze(['bed-double','bed-single','sofa','armchair','coffee','dining','desk','dining-chair','office-chair','barstool','nightstand','plant','faucet','kitchen-faucet','media','tv']);
let library=null;
export const hasCompleteFurniture=kind=>!!library?.get(kind)?.length;
const proxyGeometry=new T.BoxGeometry(1,1,1).translate(0,.5,0),proxyMaterial=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,side:T.DoubleSide});
export function bindCompleteFurniture(value){library=value;return()=>{if(library===value)library=null;};}
export function createFurnitureAnchor(kind,{w=1,h=1,d=1,data={}}={}){if(!COMPLETE_FURNITURE_KINDS.includes(kind))throw Error('Unknown furniture asset '+kind);const mesh=new T.Mesh(proxyGeometry,proxyMaterial);mesh.scale.set(w,h,d);mesh.userData={...data,furnitureAsset:kind};return mesh;}
export function instantiateCompleteFurniture(kind,{w=1,h=1,d=1,data={}}={}){
 const parts=library?.get(kind);if(!parts)return createFurnitureAnchor(kind,{w,h,d,data});
 const root=new T.Group();root.scale.set(w,h,d);root.userData={...data,furnitureAssetRoot:kind};
 // A cheap stable envelope owns collisions; detailed cloth/leaf triangles are
 // visual surfaces. Rendering batching excludes this invisible proxy.
 const proxy=new T.Mesh(proxyGeometry,proxyMaterial);proxy.userData={...data,furnitureCollisionProxy:true};root.add(proxy);
 for(const part of parts){const mesh=new T.Mesh(part.geometry,part.material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={...data,furnitureRender:kind,tourNonPhysical:true,renderFixture:true};root.add(mesh);}return root;
}
export function applyCompleteFurniture(root,templates){
 const anchors=[];root.traverse(o=>{if(o.isMesh&&o.userData.furnitureAsset)anchors.push(o);});let replacements=0;
 for(const anchor of anchors){const kind=anchor.userData.furnitureAsset,parts=templates.get(kind);if(!parts)throw Error('Missing complete furniture '+kind);const parent=anchor.parent;if(!parent)continue;
  const data={...anchor.userData};delete data.furnitureAsset;anchor.userData={...data,furnitureCollisionProxy:true};anchor.material=proxyMaterial;anchor.castShadow=anchor.receiveShadow=false;
  for(const part of parts){const mesh=anchor.isInstancedMesh?new T.InstancedMesh(part.geometry,part.material,anchor.count):new T.Mesh(part.geometry,part.material);mesh.position.copy(anchor.position);mesh.quaternion.copy(anchor.quaternion);mesh.scale.copy(anchor.scale);mesh.matrix.copy(anchor.matrix);mesh.matrixAutoUpdate=anchor.matrixAutoUpdate;if(anchor.isInstancedMesh){mesh.instanceMatrix.array.set(anchor.instanceMatrix.array);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}mesh.castShadow=mesh.receiveShadow=true;mesh.visible=anchor.visible;mesh.userData={...data,furnitureRender:kind,tourNonPhysical:true,renderFixture:true};parent.add(mesh);}replacements++;
 }return replacements;
}
export function furnitureTemplatesFromGLTF(gltf){
 const templates=new Map(),components=new Map();gltf.scene.updateMatrixWorld(true);
 for(const root of gltf.scene.children){const name=root.name,parts=[];root.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld),materials=[o.material].flat();for(const material of materials){material.userData={...material.userData,furnitureMaterial:true,architecturalInterior:true};if(material.map)material.map.anisotropy=4;}
  // GLTF multi-primitives may arrive as children or as material groups. Keep
  // their PBR materials/UVs and share each geometry across every instance.
  parts.push({geometry,material:o.material});
 });if(['cushion','duvet'].includes(name)){if(parts[0])components.set(name,parts[0].geometry);}else if(COMPLETE_FURNITURE_KINDS.includes(name))templates.set(name,parts);
 }for(const kind of COMPLETE_FURNITURE_KINDS)if(!templates.get(kind)?.length)throw Error('Incomplete furniture library: '+kind);return {templates,components};
}
