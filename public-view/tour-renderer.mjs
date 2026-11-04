import {WebGLRenderer} from 'three';
const aborted=()=>new DOMException('Canceled','AbortError');
export function boundedGraphicsTask(task,{signal,timeout=8000,retire=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  let done=false;const finish=(fn,value)=>{if(done)return false;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);fn(value);return true;};
  const cancel=()=>finish(reject,aborted()),timer=setTimeout(()=>finish(reject,Error('Graphics initialization timed out')),timeout);
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  Promise.resolve().then(task).then(value=>{if(!finish(resolve,value))retire(value);},error=>finish(reject,error));
 });
}
export async function createTourRenderer({mode='auto',signal,navigator:nav=globalThis.navigator,secure=globalThis.isSecureContext,loadGPU=()=>import('./webgpu-runtime.mjs'),createGL=()=>new WebGLRenderer({antialias:true,powerPreference:'high-performance'}),timeout=8000}={}){
 if(signal?.aborted)throw aborted();let reason=mode==='webgl2'?'selected':'unavailable',xr=false;
 if(mode!=='webgl2'&&nav?.gpu&&secure){
  try{xr=!!await boundedGraphicsTask(()=>nav.xr?.isSessionSupported?.('immersive-vr')||false,{signal,timeout:500});}catch(error){if(signal?.aborted)throw error;}
  if(xr)reason='xr';else try{
   const session=await boundedGraphicsTask(async()=>{const api=await loadGPU();return api.createWebGPUTourRenderer();},{signal,timeout,retire:s=>s.dispose()});
   if(signal?.aborted){session.dispose();throw aborted();}return session;
  }catch(error){if(signal?.aborted)throw error;reason='driver';}
 }
 if(signal?.aborted)throw aborted();const renderer=createGL();let disposed=false;
 return {renderer,native:false,backend:'webgl2',reason,adapt(){},dispose(){if(disposed)return;disposed=true;renderer.dispose();renderer.forceContextLoss?.();renderer.domElement?.remove?.();}};
}
