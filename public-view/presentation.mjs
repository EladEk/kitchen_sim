import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
const release=o=>{try{o?.dispose?.();}catch{}};
function createPipeline(renderer,scene,camera){
 const owned=[];let composer,ao,aa;
 try{
  composer=new EffectComposer(renderer);owned.push(composer);
  const render=new RenderPass(scene,camera);owned.push(render);
  ao=new GTAOPass(scene,camera,1,1);owned.push(ao,ao.gtaoMaterial,ao.blendMaterial);
  aa=new ShaderPass(FXAAShader);owned.push(aa);const output=new OutputPass();owned.push(output);
  composer.setPixelRatio(1);ao.blendIntensity=.5;ao.updateGtaoMaterial({radius:.8,thickness:.75,distanceFallOff:1,scale:1});ao.updatePdMaterial({radius:4,lumaPhi:8,depthPhi:2,normalPhi:3});
  composer.addPass(render);composer.addPass(ao);composer.addPass(aa);composer.addPass(output);
  const draw=ao.render.bind(ao),hidden=[];
  ao.render=(...args)=>{
   scene.traverse(o=>{if(!o.isMesh||!o.visible)return;const m=o.material,exclude=Array.isArray(m)?m.some(v=>v?.alphaTest>0||v?.transparent&&v.opacity<.98):m?.alphaTest>0||m?.transparent&&m.opacity<.98;if(o.userData.celestialBackground||exclude){hidden.push(o);o.visible=false;}});
   try{draw(...args);}finally{for(const o of hidden)o.visible=true;hidden.length=0;}
  };
  return {resize(w,h){composer.setSize(w,h);aa.material.uniforms.resolution.value.set(1/w,1/h);},render(){composer.render();},dispose(){for(const o of owned)release(o);owned.length=0;hidden.length=0;}};
 }catch(error){for(const o of owned)release(o);throw error;}
}

export function createArchitecturalPresentation(renderer,scene,camera,{mobile=false,pipelineFactory=createPipeline}={}){
 let pipeline=null,width=1,height=1,previous=0,slow=0,fast=0,reducedUntil=0,failed=false,disposed=false,checkGL=false;
 const stats={created:0,released:0};
 const drop=()=>{if(!pipeline)return;const old=pipeline;pipeline=null;stats.released++;release(old);renderer.setRenderTarget(null);};
 const size=()=>{const ratio=Math.min(renderer.getPixelRatio(),mobile?1.1:1.75,Math.sqrt((mobile?800000:2400000)/(width*height)));pipeline?.resize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));checkGL=true;};
 return {stats,resize(w,h){width=Math.max(1,w);height=Math.max(1,h);size();},suspend(){previous=0;slow=fast=0;drop();},trim(now=performance.now()){reducedUntil=now+15000;slow=fast=0;drop();},render(now=performance.now()){
  if(disposed)return;const dt=previous?now-previous:0;previous=now;
  if(dt>0&&dt<250){slow=dt>50?slow+1:Math.max(0,slow-1);fast=dt<30?fast+1:0;if(slow>45){reducedUntil=now+15000;fast=slow=0;drop();}}
  if(renderer.xr.isPresenting||failed||reducedUntil&&(now<reducedUntil||fast<180)){drop();renderer.render(scene,camera);return;}
  reducedUntil=0;
  try{
   if(!pipeline){pipeline=pipelineFactory(renderer,scene,camera);stats.created++;size();}
   pipeline.render();
   if(checkGL){checkGL=false;const gl=renderer.getContext?.(),error=gl?.getError?.();if(error===1285||error===1286)throw Error('Offscreen memory unavailable');}
  }catch{failed=true;drop();renderer.setRenderTarget(null);renderer.render(scene,camera);}
 },dispose(){if(disposed)return;disposed=true;drop();}};
}
