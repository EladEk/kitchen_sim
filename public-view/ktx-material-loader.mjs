import {fetchLoadingBytes} from '../src/loading-progress.mjs';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {loadSurfaceTexture} from './surface-detail.mjs';
import {assertWebGPUBasisDimensions} from './compressed-texture-layout.mjs';
export function createCompressedMaterialLoader(renderer,fallbacks){
 const ktx=new KTX2Loader().setTranscoderPath('/decoders/basis/').setWorkerLimit(1).detectSupport(renderer);let disposed=false,active=0;
 const pending=new Set();
 const load=async(url,options={})=>{
  if(disposed||options.signal?.aborted)return null;
  active++;
  try{
   const bytes=await fetchLoadingBytes(url,{signal:options.signal,onProgress:event=>options.onProgress?.(event.fraction*.85)}),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);if(disposed||options.signal?.aborted)return null;
   if(renderer.backend?.isWebGPUBackend)assertWebGPUBasisDimensions(buffer,url);
   const texture=await new Promise((resolve,reject)=>{let done=false;const cancel=()=>{if(done)return;done=true;pending.delete(cancel);reject(new DOMException('Canceled','AbortError'));};pending.add(cancel);ktx.parse(buffer,t=>{if(done||disposed||options.signal?.aborted){t.dispose();if(!done){done=true;pending.delete(cancel);resolve(null);}return;}done=true;pending.delete(cancel);resolve(t);},e=>{if(done)return;done=true;pending.delete(cancel);reject(e);});});
   options.onProgress?.(1);return texture;
  }catch(error){if(disposed||options.signal?.aborted)return null;const fallback=fallbacks.get(url);if(fallback){if(error.code==='WEBGPU_TEXTURE_BLOCK_ALIGNMENT')console.warn('THREE.KTX2Loader:',error.message,'Loading the original raster texture.');return loadSurfaceTexture(fallback,options);}throw error;}
  finally{active--;if(disposed&&!active)ktx.dispose();}
 };
 return {load,dispose(){if(disposed)return;disposed=true;for(const cancel of [...pending])cancel();pending.clear();if(!active)ktx.dispose();}};
}
