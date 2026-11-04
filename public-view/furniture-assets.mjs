import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {bindFurnitureMeshLibrary} from '../src/furniture-mesh-library.mjs';
import url from './assets/furniture-r113/upholstery.glb?url';
export async function loadFurnitureAssets({signal}={}){
 if(signal?.aborted)return null;const data=await fetch(url,{signal});if(!data.ok)throw Error('Furniture assets unavailable');const bytes=await data.arrayBuffer();if(signal?.aborted)return null;
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes,''),meshes=new Map();gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh){meshes.set(o.name,o.geometry.clone().applyMatrix4(o.matrixWorld));o.geometry.dispose();o.material?.dispose();}});
 if(signal?.aborted){for(const g of meshes.values())g.dispose();return null;}
 const unbind=bindFurnitureMeshLibrary(meshes);return {meshes,apply(root){const replaced=new Set(),used=new Set(),copies=new Map();root.traverse(o=>{const key=o.userData.furnitureMesh,g=meshes.get(key);if(g){if(!copies.has(key))copies.set(key,g.clone());replaced.add(o.geometry);o.geometry=copies.get(key);}if(o.geometry)used.add(o.geometry);});for(const g of replaced)if(!used.has(g))g.dispose();},dispose(){unbind();for(const g of meshes.values())g.dispose();meshes.clear();gltf.scene.traverse(o=>o.material?.dispose());}};
}
