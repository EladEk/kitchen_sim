import {fetchLoadingBytes} from '../src/loading-progress.mjs';
import furnitureInfo from './assets/furniture-r116/PROVENANCE.json';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {bindFurnitureMeshLibrary} from '../src/furniture-mesh-library.mjs';
import {bindCompleteFurniture,applyCompleteFurniture,furnitureTemplatesFromGLTF} from '../src/complete-furniture.mjs';
import url from './assets/furniture-r116/furniture.glb?url';
export async function loadFurnitureAssets({signal,onProgress=()=>{}}={}){
 if(signal?.aborted)return null;const bytes=await fetchLoadingBytes(url,{signal,expectedBytes:furnitureInfo.bytes,onProgress:event=>onProgress(event.fraction*.85)});if(signal?.aborted)return null;
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer,''),{templates,components:meshes}=furnitureTemplatesFromGLTF(gltf),geometries=new Set(),materials=new Set(),textures=new Set();
 onProgress(.97);gltf.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const material of [o.material].flat()){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}}});for(const parts of templates.values())for(const p of parts)geometries.add(p.geometry);for(const g of meshes.values())geometries.add(g);
 let disposed=false;const unbind=bindFurnitureMeshLibrary(meshes),unbindComplete=bindCompleteFurniture(templates),result={meshes,templates,apply(root){const count=applyCompleteFurniture(root,templates);root.traverse(o=>{const g=meshes.get(o.userData.furnitureMesh);if(g)o.geometry=g;});return count;},dispose(){if(disposed)return;disposed=true;unbind();unbindComplete();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.image?.close?.();}geometries.clear();materials.clear();textures.clear();meshes.clear();templates.clear();gltf.scene.clear();}};
 if(signal?.aborted){result.dispose();return null;}onProgress(1);return result;
}
