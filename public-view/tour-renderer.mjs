import {WebGLRenderer} from 'three';
const aborted=()=>new DOMException('Canceled','AbortError');
export function boundedGraphicsTask(task,{signal,timeout=8000,retire=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  let done=false;const finish=(fn,value)=>{if(done)return false;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);fn(value);return true;};
  const cancel=()=>finish(reject,aborted()),timer=setTimeout(()=>finish(reject,Object.assign(Error('Graphics initialization timed out'),{code:'GRAPHICS_INIT_TIMEOUT',details:{timeoutMs:timeout}})),timeout);
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  Promise.resolve().then(task).then(value=>{if(!finish(resolve,value))retire(value);},error=>finish(reject,error));
 });
}
export async function createTourRenderer({mode='auto',preferXR=false,signal,navigator:nav=globalThis.navigator,secure=globalThis.isSecureContext,loadGPU=()=>import('./webgpu-runtime.mjs'),createGL=()=>new WebGLRenderer({antialias:true,powerPreference:'high-performance'}),timeout=8000,onDiagnostic=()=>{}}={}){
 const emit=(event,error=null,details={})=>{try{onDiagnostic({event,error,details});}catch{}};emit('graphics-support-check',null,{requestedEngine:mode,secureContext:!!secure,webgpuAPI:!!nav?.gpu,preferXR:!!preferXR});
 if(signal?.aborted)throw aborted();let reason=preferXR&&mode!=='webgpu'?'xr-requested':mode==='webgl2'?'selected':'unavailable';
 if(mode==='webgpu'&&(!nav?.gpu||!secure)){const error=Object.assign(Error(!secure?'WebGPU requires a secure context (HTTPS)':'navigator.gpu is unavailable in this browser'),{code:'WEBGPU_UNAVAILABLE'});emit('webgpu-support-failed',error);throw error;}
 if(preferXR&&mode!=='webgpu')emit('webgl-requested-for-vr');
 if(mode!=='webgl2'&&(!preferXR||mode==='webgpu')&&nav?.gpu&&secure){
  try{
   const session=await boundedGraphicsTask(async()=>{emit('webgpu-module-loading');const api=await loadGPU();emit('webgpu-initialization');return api.createWebGPUTourRenderer({onDiagnostic});},{signal,timeout,retire:s=>s.dispose()});
   if(signal?.aborted){session.dispose();throw aborted();}return session;
  }catch(error){if(signal?.aborted)throw error;emit('webgpu-initialization-failed',error);if(mode==='webgpu')throw Object.assign(Error('Forced WebGPU initialization failed',{cause:error}),{code:'WEBGPU_FAILED'});reason='driver';emit('webgl-fallback',error);}
 }
 if(signal?.aborted)throw aborted();emit('webgl-initialization',null,{reason});const renderer=createGL();let disposed=false;
 return {renderer,native:false,backend:'webgl2',reason,adapt(){},dispose(){if(disposed)return;disposed=true;renderer.dispose();renderer.forceContextLoss?.();renderer.domElement?.remove?.();}};
}
