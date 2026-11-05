// Optional native regression at the owner's 64 KiB uniform-binding limit.
// Set HOMESTUDIO_WEBGPU_MODULE to an external webgpu@0.4.0/index.js.
// --expect-invalid is the pre-fix control. Dawn null does not verify pixels.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {createWebGPUTourRenderer,createNodePresentation} from '../public-view/webgpu-runtime.mjs';
const name=process.env.HOMESTUDIO_WEBGPU_MODULE||'webgpu',{create,globals}=await import(name.startsWith('/')?pathToFileURL(name).href:name);Object.assign(globalThis,globals);globalThis.self=globalThis;globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1);globalThis.cancelAnimationFrame=clearTimeout;
const gpu=create(['backend=null']);Object.defineProperty(globalThis,'navigator',{value:{gpu},configurable:true});const keepAlive=setInterval(()=>{},20),adapter=await gpu.requestAdapter(),device=await adapter.requestDevice({requiredFeatures:[...adapter.features],requiredLimits:{maxUniformBufferBindingSize:65536,maxStorageBufferBindingSize:134217728,maxBufferSize:268435456,maxTextureDimension2D:8192}});assert.equal(device.limits.maxUniformBufferBindingSize,65536);let target,config,session,presentation;
const canvas={width:96,height:96,style:{},addEventListener(){},removeEventListener(){},setAttribute(){},getContext(){return context;}},context={canvas,configure(c){config=c;},getCurrentTexture(){return target??=device.createTexture({size:[96,96],format:config.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});}},errors=[],checks=[],matrix=new T.Matrix4();
try{
 session=await createWebGPUTourRenderer({canvas,context,device});const r=session.renderer;r.setSize(96,96,false);r.onError=info=>errors.push(info.message);const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.1,100);camera.position.set(0,0,30);scene.add(new T.HemisphereLight(0xffffff,0x999999,2));
 const geometry=new T.BoxGeometry(.25,.25,.25),material=new T.MeshStandardMaterial(),mesh=new T.InstancedMesh(geometry,material,1758);mesh.frustumCulled=false;for(let i=0;i<1758;i++)mesh.setMatrixAt(i,matrix.makeTranslation((i%40)*.4-8,Math.floor(i/40)*.35-8,0));mesh.count=128;scene.add(mesh);session.adapt(scene);
 if(process.argv.includes('--expect-invalid')){device.pushErrorScope('validation');await r.compileAsync(scene,camera);const error=await device.popErrorScope();assert(error?.message.includes('112512')&&error.message.includes('65536'),error?.message||'The reported buffer overflow did not reproduce');console.log(JSON.stringify({negativeControl:true,capacity:1758,drawCount:128,limit:65536,error:error.message},null,2));}
 else{
  for(const count of [128,1758,64,1024,1758]){mesh.count=count;mesh.setMatrixAt(0,matrix.makeTranslation(count/1000,0,0));mesh.instanceMatrix.needsUpdate=true;device.pushErrorScope('validation');await r.compileAsync(scene,camera);r.render(scene,camera);await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();assert.equal(error,null,error?.message);checks.push({capacity:1758,drawCount:count,matrixBytes:mesh.instanceMatrix.array.byteLength});}
  // A small draw of a large pool must also work when MRT/post-processing
  // creates another shader variant, and when a shadow variant is introduced.
  mesh.count=17;presentation=createNodePresentation(r,scene,camera,{enhanced:false});device.pushErrorScope('validation');presentation.render();await device.queue.onSubmittedWorkDone();assert.equal(await device.popErrorScope(),null);presentation.dispose();presentation=null;checks.push('MRT-AO-bloom-FXAA-small-draw-large-pool');
  const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(0,5,8);sun.castShadow=true;sun.shadow.mapSize.set(128,128);scene.add(sun);mesh.castShadow=mesh.receiveShadow=true;r.shadowMap.enabled=true;device.pushErrorScope('validation');await r.compileAsync(scene,camera);r.render(scene,camera);await device.queue.onSubmittedWorkDone();assert.equal(await device.popErrorScope(),null);checks.push('new-shadow-variant-small-draw-large-pool');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({backend:'Dawn null validation',maxUniformBufferBindingSize:device.limits.maxUniformBufferBindingSize,checks,errors,pixelsVerified:false,physicalARMDeviceVerified:false},null,2));
 }
}catch(error){console.error(error.stack);process.exitCode=1;}finally{presentation?.dispose();session?.dispose();target?.destroy();device.destroy();clearInterval(keepAlive);process.exit(process.exitCode||0);}
