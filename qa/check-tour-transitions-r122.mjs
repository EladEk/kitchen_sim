// Actual scene + GLB and real WebGPU API validation. Dawn null validates
// commands/bindings, not final pixels, ARM timings or physical-device FPS.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {startupFixture} from './startup-fixture-r120.mjs';
import {createWebGPUTourRenderer} from '../public-view/webgpu-runtime.mjs';
import {createArchitecturalPresentation} from '../public-view/presentation.mjs';
import {createSceneWarmup} from '../src/scene-warmup.mjs';
import {createRendererWork} from '../src/renderer-work.mjs';
import {createLoadingProgress} from '../src/loading-progress.mjs';
import {buildingTransform,DISTRICT} from '../public-view/district.mjs';
const name=process.env.HOMESTUDIO_WEBGPU_MODULE||'webgpu',{create,globals}=await import(name.startsWith('/')?pathToFileURL(name).href:name);Object.assign(globalThis,globals);globalThis.self=globalThis;globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1);globalThis.cancelAnimationFrame=clearTimeout;
const gpu=create(['backend=null']);Object.defineProperty(globalThis,'navigator',{value:{gpu},configurable:true});const keepAlive=setInterval(()=>{},20),adapter=await gpu.requestAdapter(),device=await adapter.requestDevice({requiredFeatures:[...adapter.features],requiredLimits:{maxUniformBufferBindingSize:65536,maxStorageBufferBindingSize:134217728,maxBufferSize:268435456,maxTextureDimension2D:8192}});
const errors=[],events=[],results=[],progressValues=[];let session,warm,presentation,gate,target,config,requested=[394,564],sizeCalls=0;
const canvas={width:492,height:705,style:{},addEventListener(){},removeEventListener(){},setAttribute(){},getContext(){return context;}},context={canvas,configure(c){config=c;},getCurrentTexture(){if(!target||target.width!==canvas.width||target.height!==canvas.height){target?.destroy();target=device.createTexture({size:[canvas.width,canvas.height],format:config.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});}return target;}},progress=createLoadingProgress(v=>progressValues.push(v));
try{
 console.log('Loading actual building and GLB for tour transition validation…');
 const f=await startupFixture();session=await createWebGPUTourRenderer({canvas,context,device});const renderer=session.renderer;renderer.onError=info=>errors.push(info.message);renderer.toneMapping=T.AgXToneMapping;renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;
 f.scene.add(new T.HemisphereLight(0xffffff,0x999999,2));const sun=new T.DirectionalLight(0xffffff,2);sun.castShadow=true;sun.position.set(-30,60,10);sun.shadow.mapSize.set(256,256);f.scene.add(sun);session.adapt(f.model);session.adapt(f.scene);
 presentation=createArchitecturalPresentation(renderer,f.scene,f.camera,{mobile:true,pipelineFactory:session.pipelineFactory});gate=createRendererWork(()=>{sizeCalls++;renderer.setPixelRatio(1.25);renderer.setSize(...requested,false);f.camera.aspect=requested[0]/requested[1];f.camera.updateProjectionMatrix();presentation.resize(...requested);});gate.resize();
 let queueResize=false;warm=createSceneWarmup(renderer,f.scene,f.camera,{viewOnly:true,maxNativeMs:60000,onDiagnostic:e=>{events.push(e);if(queueResize&&e.event==='shader-compilation'){queueResize=false;const old=canvas.height;requested=[394,590];gate.resize();requested=[394,597];gate.resize();assert.equal(canvas.height,old,'viewport must stay stable while GPU work is pending');}}});
 async function prepare(key,{resize=false}={}){
  const started=performance.now(),at=events.length,from=progressValues.length;progress.reset();queueResize=resize;device.pushErrorScope('validation');
  await gate.run(()=>presentation.prepare(key,warm,{draw:true,enhanced:true,onProgress:progress.phase(10,99)}));
  await device.queue.onSubmittedWorkDone();assert.equal(await device.popErrorScope(),null,key);assert(warm.has(key));assert.equal(progress.value,99);presentation.render(performance.now(),{enhanced:true});progress.complete();
  const values=progressValues.slice(from);assert.equal(values.at(-1),100);assert(values.every((v,i)=>i===0||v>=values[i-1]));
  const stages=events.slice(at),uploads=stages.find(e=>e.event==='texture-upload').details;assert.equal(stages.filter(e=>e.event==='texture-upload').length,1,'one destination preparation, no second room load');results.push({key,elapsedMs:Math.round(performance.now()-started),...uploads,progress:values});
 }
 await prepare('initial',{resize:true});assert.equal(canvas.width,492);assert.equal(canvas.height,746);assert.equal(sizeCalls,2);
 const d=f.nav.destinations.find(d=>d.id==='lobby')||f.nav.destinations[0],b=DISTRICT[0];f.camera.position.set(d.position[0],(d.elevation??d.floor*f.nav.storey)+1.62,d.position[1]).applyMatrix4(buildingTransform(b));const direction=new T.Vector3(-Math.sin(d.yaw),0,-Math.cos(d.yaw)).transformDirection(buildingTransform(b));f.camera.lookAt(f.camera.position.clone().add(direction));f.selection.update({building:b.id,level:9,target:'',mode:'walk'},{walking:true,position:f.camera.position});f.district.update(f.camera.position,4000,{walking:true,detailScale:1});session.adapt(f.scene);
 // Explicitly exercise native transmission, which copies the framebuffer while
 // precompiling. The prior QA fixture's mobile glass used only alpha blending.
 const glass=new T.Mesh(new T.PlaneGeometry(1,1.5),new T.MeshPhysicalMaterial({transmission:.9,thickness:.03,roughness:.15,side:T.DoubleSide}));glass.position.copy(f.camera.position).addScaledVector(direction,1.5);glass.quaternion.copy(f.camera.quaternion);f.scene.add(glass);
 await prepare('room:lobby');assert(warm.has('room:lobby'));const before=presentation.stats.created;await prepare('room:lobby-reused');assert.equal(results.at(-1).compileObjects,0);assert.equal(presentation.stats.created,before);assert.deepEqual(errors,[]);
 const report={backend:'Dawn null validation',revision:'R122',maxUniformBufferBindingSize:device.limits.maxUniformBufferBindingSize,resize:{from:[492,705],to:[canvas.width,canvas.height],appliedSizes:sizeCalls},pipelineCreations:presentation.stats.created,results,errors,pixelsVerified:false,physicalARMDeviceVerified:false,phoneFPSVerified:false};writeFileSync('qa/native-tour-r122.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(error){console.error(error.stack);console.error(JSON.stringify({results,events:events.filter(e=>e.event==='texture-upload'),errors},null,2));process.exitCode=1;}
finally{gate?.dispose();warm?.dispose();presentation?.dispose();session?.dispose();target?.destroy();device.destroy();clearInterval(keepAlive);delete globalThis.navigator;process.exit(process.exitCode||0);}
