import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {loadSurfaceTexture} from './surface-detail.mjs';
export function createCompressedMaterialLoader(renderer,fallbacks){
 const ktx=new KTX2Loader().setTranscoderPath('/decoders/basis/').setWorkerLimit(1).detectSupport(renderer);let disposed=false,active=0;
 const pending=new Set();
 const load=async(url,options={})=>{
  if(disposed||options.signal?.aborted)return null;
  active++;
  try{
   const response=await fetch(url,{signal:options.signal});if(!response.ok)throw Error('Compressed material unavailable');const buffer=await response.arrayBuffer();if(disposed||options.signal?.aborted)return null;
   const texture=await new Promise((resolve,reject)=>{let done=false;const cancel=()=>{if(done)return;done=true;pending.delete(cancel);reject(new DOMException('Canceled','AbortError'));};pending.add(cancel);ktx.parse(buffer,t=>{if(done||disposed||options.signal?.aborted){t.dispose();if(!done){done=true;pending.delete(cancel);resolve(null);}return;}done=true;pending.delete(cancel);resolve(t);},e=>{if(done)return;done=true;pending.delete(cancel);reject(e);});});
   return texture;
  }catch(error){if(disposed||options.signal?.aborted)return null;const fallback=fallbacks.get(url);if(fallback)return loadSurfaceTexture(fallback,options);throw error;}
  finally{active--;if(disposed&&!active)ktx.dispose();}
 };
 return {load,dispose(){if(disposed)return;disposed=true;for(const cancel of [...pending])cancel();pending.clear();if(!active)ktx.dispose();}};
}
