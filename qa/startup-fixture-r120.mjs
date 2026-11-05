import * as T from 'three';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {furnitureTemplatesFromGLTF,applyCompleteFurniture} from '../src/complete-furniture.mjs';
import {createDistrict} from '../public-view/district.mjs';
import {createSelectionController,fitSelectionCamera} from '../public-view/selection-view.mjs';
import {nativeCompileList} from '../src/scene-warmup.mjs';

// Loads actual public geometry and GLB primitives. Headless API verification
// omits only DOM building labels and uploaded scan images, not furniture meshes.
export async function startupFixture(){
 globalThis.self=globalThis;
 globalThis.createImageBitmap=async blob=>{const code="import sys,io,struct\nfrom PIL import Image\nim=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGBA')\nsys.stdout.buffer.write(struct.pack('<II',*im.size)+im.tobytes())",p=spawnSync('python3',['-c',code],{input:Buffer.from(await blob.arrayBuffer()),maxBuffer:16*1024*1024});if(p.status)throw Error(String(p.stderr));return {width:p.stdout.readUInt32LE(0),height:p.stdout.readUInt32LE(4),data:new Uint8Array(p.stdout.subarray(8)),close(){}};};
 const nav=JSON.parse(await readFile('dist/client/baseline/navigation.json')),site=JSON.parse(await readFile('dist/client/baseline/site.json')),model=await new T.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json'))),bytes=await readFile('public-view/assets/furniture-r116/furniture.glb'),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),library=furnitureTemplatesFromGLTF(gltf);applyCompleteFurniture(model,library.templates);model.traverse(o=>{const g=library.components.get(o.userData.furnitureMesh);if(g)o.geometry=g;});
 const converted=new Map();model.traverse(o=>{for(const material of [o.material].flat().filter(Boolean))for(const [slot,value]of Object.entries(material)){if(!value?.isTexture||!value.image?.data||value.isDataTexture)continue;if(!converted.has(value)){const t=new T.DataTexture(value.image.data,value.image.width,value.image.height);for(const key of ['colorSpace','wrapS','wrapT','magFilter','minFilter','flipY','anisotropy'])t[key]=value[key];t.repeat.copy(value.repeat);t.offset.copy(value.offset);t.rotation=value.rotation;t.generateMipmaps=true;t.needsUpdate=true;converted.set(value,t);}material[slot]=converted.get(value);}});
 const scene=new T.Scene(),root=new T.Group(),district=createDistrict(model,site,{mobile:true});scene.add(root,district.group);const camera=new T.PerspectiveCamera(48,394/734,.06,1200),state={building:'4102',level:9,target:'',mode:'building'},selection=createSelectionController({root,model,district,nav}),view=selection.update(state),controls={target:new T.Vector3(),update(){}};fitSelectionCamera(camera,controls,view);selection.update(state);district.update(camera.position,1000,{detailScale:1});scene.updateMatrixWorld(true);return {scene,model,root,district,camera,nav,selection,controls};
}
export function startupCounts(scene){const all=[],visible=[];scene.traverse(o=>{if(o.isMesh||o.isSprite||o.isLine||o.isPoints)all.push(o);});scene.traverseVisible(o=>{if(o.isMesh||o.isSprite||o.isLine||o.isPoints)visible.push(o);});const meaningful=visible.filter(o=>(!o.isInstancedMesh||o.count>0)&&!o.userData.furnitureCollisionProxy&&[o.material].flat().some(m=>m?.visible!==false&&m?.opacity!==0));return {all:all.length,visible:visible.length,meaningful:meaningful.length,allCompile:nativeCompileList(all).children.length,visibleCompile:nativeCompileList(visible).children.length,meaningfulCompile:nativeCompileList(meaningful).children.length,zeroInstances:visible.filter(o=>o.isInstancedMesh&&!o.count).length};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const f=await startupFixture();console.log(JSON.stringify({camera:f.camera.position.toArray(),counts:startupCounts(f.scene)},null,2));}
