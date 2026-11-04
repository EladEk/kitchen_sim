// Let the browser paint the loading status before CPU/GPU preparation begins.
// The second animation callback guarantees a paint opportunity after the first.
// A bounded fallback also works when rAF is suspended by a background/XR tab.
export function waitForScenePaint({signal,requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),schedule=setTimeout,cancel=clearTimeout,timeout=160}={}){
 if(signal?.aborted)return Promise.reject(signal.reason||new DOMException('Canceled','AbortError'));
 if(!requestFrame)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let frame=null,timer=null,settled=false;
  const finish=error=>{if(settled)return;settled=true;if(frame!==null)cancelFrame?.(frame);if(timer!==null)cancel(timer);signal?.removeEventListener('abort',aborted);error?reject(error):resolve();};
  const aborted=()=>finish(signal.reason||new DOMException('Canceled','AbortError'));
  signal?.addEventListener('abort',aborted,{once:true});
  timer=schedule(()=>finish(),timeout);
  frame=requestFrame(()=>{frame=requestFrame(()=>finish());});
 });
}

// Cleanup cancels deferred builds. Rapid edits therefore build only the newest
// requested scene, rather than applying a stale floor/room after a newer one.
export function scheduleSceneWork(work,{onError=()=>{},...options}={}){
 const controller=new AbortController();let canceled=false;
 waitForScenePaint({...options,signal:controller.signal}).then(()=>{if(!canceled)return work();}).catch(error=>{if(!canceled)onError(error);});
 return ()=>{canceled=true;controller.abort();};
}
