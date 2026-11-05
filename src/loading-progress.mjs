export const loadingPercent=value=>Math.max(0,Math.min(100,Math.floor(Number.isFinite(value)?value:0)));
// Progress is driven by completed work, never by a timer. Only complete() may
// publish 100; a pending shader, first draw or decode therefore holds below it.
export function createLoadingProgress(publish=()=>{}){
 let value=0,active=true,generation=0;
 const set=(next,force=false)=>{if(!active)return;next=loadingPercent(next);if(force||next>value){value=next;publish(value);}};
 return {get value(){return value;},reset(){generation++;active=true;set(0,true);},continue(){generation++;active=true;},report(next){set(Math.min(99,next));},phase(from,to){const version=generation;return fraction=>{if(version===generation)set(Math.min(99,from+(to-from)*Math.max(0,Math.min(1,fraction))));};},complete(){set(100);},cancel(){generation++;active=false;}};
}
const abortError=signal=>signal?.reason||new DOMException('Canceled','AbortError');
export async function fetchLoadingBytes(url,{signal,onProgress=()=>{},expectedBytes=0,cache='default',fetcher=globalThis.fetch}={}){
 if(signal?.aborted)throw abortError(signal);
 const response=await fetcher(url,{signal,cache});if(!response.ok)throw Error('Asset download failed ('+response.status+')');
 const declared=Number(response.headers?.get('content-length')),total=expectedBytes>0?expectedBytes:Number.isFinite(declared)&&declared>0?declared:0;let loaded=0;
 const report=done=>onProgress({loaded,total:done?loaded:total,done,fraction:done?1:total?Math.min(.99,loaded/total):0});report(false);
 if(!response.body?.getReader){const bytes=new Uint8Array(await response.arrayBuffer());if(signal?.aborted)throw abortError(signal);loaded=bytes.byteLength;report(true);return bytes;}
 const reader=response.body.getReader(),chunks=[],cancel=()=>{void reader.cancel(abortError(signal)).catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
 try{while(true){if(signal?.aborted)throw abortError(signal);const result=await reader.read();if(result.done)break;chunks.push(result.value);loaded+=result.value.byteLength;report(false);}if(signal?.aborted)throw abortError(signal);const bytes=new Uint8Array(loaded);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}report(true);return bytes;}
 finally{signal?.removeEventListener('abort',cancel);reader.releaseLock();}
}
export async function fetchLoadingJSON(url,options){return JSON.parse(new TextDecoder().decode(await fetchLoadingBytes(url,options)));}
