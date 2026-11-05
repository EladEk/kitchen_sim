import {createWebGLPresentation} from './webgl-effects.mjs';
const release=o=>{try{o?.dispose?.();}catch{}};
export function createArchitecturalPresentation(renderer,scene,camera,{mobile=false,pipelineFactory=createWebGLPresentation}={}){
 let pipeline=null,width=1,height=1,previous=0,slow=0,fast=0,reducedUntil=0,failed=false,disposed=false,checkGL=false,enhancedState=false;
 const stats={created:0,released:0};
 const drop=()=>{if(!pipeline)return;const old=pipeline;pipeline=null;stats.released++;release(old);renderer.setRenderTarget(null);};
 const size=()=>{const ratio=Math.min(renderer.getPixelRatio(),mobile?1.1:1.75,Math.sqrt((mobile?800000:2400000)/(width*height)));pipeline?.resize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));checkGL=true;};
 const ensure=enhanced=>{enhanced=enhanced&&!mobile;if(enhancedState!==enhanced){enhancedState=enhanced;drop();}if(!pipeline){pipeline=pipelineFactory(renderer,scene,camera,{mobile,enhanced});stats.created++;size();}};
 return {stats,resize(w,h){width=Math.max(1,w);height=Math.max(1,h);size();},suspend(){previous=0;slow=fast=0;drop();},trim(now=performance.now()){reducedUntil=now+15000;slow=fast=0;drop();},
 async prepare(key,warmup,{effects=true,enhanced=false,...options}={}){
  if(!renderer.isWebGPURenderer||!effects||failed||renderer.xr.isPresenting)return warmup.prepare(key,options);
  ensure(enhanced);return pipeline.prepare(key,warmup,options);
 },render(now=performance.now(),{effects=true,enhanced=false}={}){
  if(disposed)return;enhanced=enhanced&&!mobile;if(enhancedState!==enhanced){enhancedState=enhanced;drop();}const dt=previous?now-previous:0;previous=now;
  if(dt>0&&dt<250){slow=dt>50?slow+1:Math.max(0,slow-1);fast=dt<30?fast+1:0;if(slow>45){reducedUntil=now+15000;fast=slow=0;drop();}}
  if(!effects||renderer.xr.isPresenting||failed||reducedUntil&&(now<reducedUntil||fast<180)){drop();renderer.render(scene,camera);return;}
  reducedUntil=0;
  try{
   ensure(enhanced);
   pipeline.render();
   if(checkGL){checkGL=false;const gl=renderer.getContext?.(),error=gl?.getError?.();if(error&&error!==1287&&error!==0x9242)throw Error('Offscreen rendering unavailable');}
  }catch{failed=true;drop();renderer.setRenderTarget(null);renderer.render(scene,camera);}
 },dispose(){if(disposed)return;disposed=true;drop();}};
}
