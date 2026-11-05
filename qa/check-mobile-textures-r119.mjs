// Optional native WebGPU API validation, using the shipped Three/Basis decoder.
// Install webgpu@0.4.0 outside this repository and set HOMESTUDIO_WEBGPU_MODULE
// to its index.js. No platform-specific dependency is added to Android builds.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {createWebGPUTourRenderer} from '../public-view/webgpu-runtime.mjs';

const moduleName=process.env.HOMESTUDIO_WEBGPU_MODULE||'webgpu';
const {create,globals}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName);
Object.assign(globalThis,globals);
const gpu=create(['backend=null']);Object.defineProperty(globalThis,'navigator',{value:{gpu},configurable:true});globalThis.self=globalThis;
globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1);globalThis.cancelAnimationFrame=clearTimeout;
const keepAlive=setInterval(()=>{},20),adapter=await gpu.requestAdapter(),features=['texture-compression-astc','texture-compression-etc2'];
for(const feature of features)assert(adapter.features.has(feature),feature+' must be supported by the API validator');
const device=await adapter.requestDevice({requiredFeatures:features});let session,target,config;
const canvas={width:64,height:64,style:{},addEventListener(){},removeEventListener(){},setAttribute(){},getContext(){return context;}},context={canvas,configure(c){config=c;},getCurrentTexture(){return target??=device.createTexture({size:[64,64],format:config.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});}};
const errors=[],checks=[];
try{
 // Reproduce the exact validation rule from the owner's ARM log first.
 for(const format of ['astc-4x4-unorm','etc2-rgb8unorm']){device.pushErrorScope('validation');const invalid=device.createTexture({size:[1023,1024],format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});const error=await device.popErrorScope();assert(error?.message.includes('multiple'),error?.message);invalid.destroy();checks.push('1023-width-negative-control:'+format);}
 const require=createRequire(import.meta.url),basisPath=require.resolve('three/examples/jsm/libs/basis/basis_transcoder.js'),factory=new Function('require','__dirname','__filename',(await readFile(basisPath,'utf8'))+'\nreturn BASIS;')(require,dirname(basisPath),basisPath),basis=await factory({wasmBinary:await readFile(basisPath.replace(/\.js$/,'.wasm'))});basis.initializeBasis();
 const manifest=JSON.parse(await readFile('public-view/assets/pbr-r113/MANIFEST.json'));
 session=await createWebGPUTourRenderer({canvas,context,device});const renderer=session.renderer;renderer.onError=info=>errors.push(info.message);renderer.setSize(64,64,false);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.1,10);camera.position.set(0,0,3);scene.add(new T.HemisphereLight(0xffffff,0x999999,2));
 for(const astc of [true,false]){
  const textures=new Map();
  for(const row of manifest.textures){
   const file=new basis.KTX2File(new Uint8Array(await readFile(row.output)));assert(file.isValid());assert(file.startTranscoding());
   const useASTC=astc&&file.isUASTC(),transcoderFormat=useASTC?10:0,format=useASTC?T.RGBA_ASTC_4x4_Format:T.RGB_ETC2_Format,mips=[];
   try{for(let level=0;level<file.getLevels();level++){const info=file.getImageLevelInfo(level,0,0),data=new Uint8Array(file.getImageTranscodedSizeInBytes(level,0,0,transcoderFormat));assert(file.transcodeImage(data,level,0,0,transcoderFormat,0,-1,-1));mips.push({data,width:info.origWidth,height:info.origHeight});}
    const texture=new T.CompressedTexture(mips,file.getWidth(),file.getHeight(),format);texture.name=row.output;texture.colorSpace=row.channel==='color'?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
    device.pushErrorScope('validation');await renderer.initTexture(texture);await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();assert.equal(error,null,row.output+': '+error?.message);textures.set(row.output,texture);checks.push((astc?'ARM-ASTC+ETC2:':'ETC2-only:')+row.output+':'+mips.length+'-mips');
   }finally{file.close();file.delete();}
  }
  const cloth=channel=>textures.get('public-view/assets/pbr-r113/cotton_jersey_'+channel+'.ktx2'),material=new T.MeshStandardMaterial({map:cloth('diff'),normalMap:cloth('nor_gl'),roughnessMap:cloth('rough')}),mesh=new T.Mesh(new T.BoxGeometry(1,1,1),material);scene.add(mesh);session.adapt(scene);
  device.pushErrorScope('validation');await renderer.compileAsync(scene,camera);renderer.render(scene,camera);await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();assert.equal(error,null,error?.message);checks.push(astc?'fabric-native-ASTC-normal+ETC2-color-roughness-draw':'fabric-native-ETC2-only-draw');
  scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();for(const texture of textures.values())texture.dispose();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({backend:'Dawn null validation',checks,errors,pixelsVerified:false,physicalARMDeviceVerified:false},null,2));
}catch(error){console.error(error.stack);process.exitCode=1;}finally{session?.dispose();target?.destroy();device.destroy();clearInterval(keepAlive);delete globalThis.navigator;process.exit(process.exitCode||0);}
