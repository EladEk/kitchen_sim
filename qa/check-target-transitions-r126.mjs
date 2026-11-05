// Shared transmissive meshes across retired, resized and equal-size output
// targets. Dawn null checks lifetime/bind groups, not driver FPS or pixels.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {createWebGPUTourRenderer} from '../public-view/webgpu-runtime.mjs';
import {createArchitecturalPresentation} from '../public-view/presentation.mjs';
import {createSceneWarmup} from '../src/scene-warmup.mjs';
const name=process.env.HOMESTUDIO_WEBGPU_MODULE||'webgpu',{create,globals}=await import(name.startsWith('/')?pathToFileURL(name).href:name);Object.assign(globalThis,globals);globalThis.self=globalThis;
globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1);globalThis.cancelAnimationFrame=clearTimeout;
const gpu=create(['backend=null']);Object.defineProperty(globalThis,'navigator',{value:{gpu},configurable:true});const timer=setInterval(()=>{},20),adapter=await gpu.requestAdapter(),device=await adapter.requestDevice({requiredFeatures:[...adapter.features]});
const expectedFailure=process.argv.includes('--control'),errors=[],steps=[];let target,config,session,presentation,warmup,phase='initial',failure=null;
const canvas={width:640,height:360,style:{},addEventListener(){},removeEventListener(){},setAttribute(){},getContext(){return context;}},context={canvas,configure(c){config=c;},getCurrentTexture(){if(!target||target.width!==canvas.width||target.height!==canvas.height){target?.destroy();target=device.createTexture({size:[canvas.width,canvas.height],format:config.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});}return target;}};
const scene=new T.Scene();scene.background=new T.Color('#ddd9cf');const camera=new T.PerspectiveCamera(48,640/360,.06,100);camera.position.set(0,2,7);camera.lookAt(0,1,0);scene.add(new T.HemisphereLight('#fff8f0','#82786b',2));
const geometry=new T.BoxGeometry(1,2,.2),glass=new T.MeshPhysicalMaterial({color:'#e6eef1',roughness:.06,transmission:1,thickness:.15,ior:1.45,transparent:true,opacity:1,side:T.DoubleSide}),wallMaterial=new T.MeshStandardMaterial({color:'#ba8d6a',roughness:.8});
for(let i=0;i<4;i++){const mesh=new T.Mesh(geometry,glass);mesh.position.set((i-1.5)*1.3,1,0);scene.add(mesh);}
const wall=new T.Mesh(new T.BoxGeometry(8,4,.2),wallMaterial);wall.position.set(0,1,-2);scene.add(wall);
try{
 session=await createWebGPUTourRenderer({canvas,context,device});const renderer=session.renderer;renderer.onError=e=>errors.push({phase,message:e.message});renderer.setSize(640,360,false);renderer.toneMapping=T.AgXToneMapping;presentation=createArchitecturalPresentation(renderer,scene,camera,{pipelineFactory:session.pipelineFactory});presentation.resize(640,360);warmup=createSceneWarmup(renderer,scene,camera,{viewOnly:true});
 const modes=[{name:'outside',enhanced:false},{name:'interior',enhanced:true},{name:'outside-again',enhanced:false},{name:'interior-again',enhanced:true},{name:'resume',enhanced:true,suspend:true},{name:'smaller',enhanced:true,size:[512,288]},{name:'original',enhanced:true,size:[640,360]},{name:'effects-off',effects:false},{name:'effects-return',enhanced:true},{name:'repeat',enhanced:true}];
 for(const mode of modes){phase=mode.name;device.pushErrorScope('validation');if(mode.suspend)presentation.suspend();if(mode.size){renderer.setSize(...mode.size,false);presentation.resize(...mode.size);camera.aspect=mode.size[0]/mode.size[1];camera.updateProjectionMatrix();}const effects=mode.effects!==false,before=session.compilationStats();await presentation.prepare(phase,warmup,{draw:true,effects,enhanced:!!mode.enhanced});for(let i=0;i<4;i++)presentation.render(performance.now(),{effects,enhanced:!!mode.enhanced});await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();if(error)throw error;assert.deepEqual(errors,[]);const after=session.compilationStats();steps.push({phase,newPipelines:after.syncPipelines-before.syncPipelines,newNodeBuilds:after.nodeBuilds-before.nodeBuilds});console.log(JSON.stringify(steps.at(-1)));}
 if(expectedFailure)throw Error('Control did not reproduce the framebuffer binding failure');
}catch(error){failure={phase,message:error.message};if(!expectedFailure||!/Destroyed texture/.test(error.message)){console.error(error.stack||error.message);process.exitCode=1;}else console.log('Reproduced stale framebuffer texture binding: '+error.message);}
finally{writeFileSync(`qa/target-transitions-${expectedFailure?'control':'r126'}.txt`,JSON.stringify({backend:'Dawn null',expectedFailure,steps,errors,failure,pixelsVerified:false,physicalDeviceVerified:false},null,2)+'\n');warmup?.dispose();presentation?.dispose();geometry.dispose();glass.dispose();wall.geometry.dispose();wallMaterial.dispose();session?.dispose();target?.destroy();device.destroy();clearInterval(timer);delete globalThis.navigator;process.exit(process.exitCode||0);}
